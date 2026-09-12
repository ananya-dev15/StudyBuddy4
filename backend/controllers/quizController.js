import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { exec } from "child_process";
import ytdl from "@distube/ytdl-core";
import fs from "fs";
import path from "path";
import os from "os";
import QuizAttempt from "../models/QuizAttempt.js";

// Helper to clean JSON string from markdown code block markers
function cleanJsonString(str) {
  if (!str) return "";
  let cleaned = str.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  return cleaned.trim();
}

// ✅ 1. GENERATE QUIZ FROM ACTUAL VIDEO CONTENT
export const generateQuiz = async (req, res) => {
  let tmpFilePath = null;
  let uploadedFile = null;

  try {
    const { videoId, numQuestions = 5, difficulty = "Medium", videoTitle = "" } = req.body;

    if (!videoId) {
      return res.status(400).json({
        success: false,
        message: "Missing videoId for quiz generation.",
      });
    }

    const count = parseInt(numQuestions, 10) === 10 ? 10 : 5;
    const diff = ["Easy", "Medium", "Hard"].includes(difficulty) ? difficulty : "Medium";

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE" || apiKey === "YOUR_API_KEY_HERE") {
      console.warn("⚠️ Gemini API key is missing or unconfigured.");
      return res.status(400).json({
        success: false,
        message: "Unable to analyze this video for quiz generation. Please try again.",
      });
    }

    // Step A: Extract actual audio stream of the video to a temporary file
    const tmpDir = os.tmpdir();
    tmpFilePath = path.join(tmpDir, `yt_quiz_${videoId}_${Date.now()}.m4a`);

    console.log(`🎥 Fetching actual audio content for videoId: ${videoId}...`);

    try {
      const pythonBin = path.join(process.cwd(), "detector", "venv", "bin", "python3");
      const scriptPath = path.join(process.cwd(), "utils", "download_audio.py");

      await new Promise((resolve, reject) => {
        exec(
          `"${pythonBin}" "${scriptPath}" "${videoId}" "${tmpFilePath}"`,
          { timeout: 180000 },
          (err, stdout, stderr) => {
            if (err) return reject(err);
            resolve(true);
          }
        );
      });
    } catch (streamErr) {
      console.error("❌ Audio extraction error:", streamErr.message);
      if (fs.existsSync(tmpFilePath)) {
        try { fs.unlinkSync(tmpFilePath); } catch (e) {}
      }
      return res.status(400).json({
        success: false,
        message: "Unable to analyze this video for quiz generation. Please try again.",
      });
    }

    // Verify temp file exists and has size
    if (!fs.existsSync(tmpFilePath) || fs.statSync(tmpFilePath).size === 0) {
      console.error("❌ Extracted audio file is empty or missing.");
      if (fs.existsSync(tmpFilePath)) {
        try { fs.unlinkSync(tmpFilePath); } catch (e) {}
      }
      return res.status(400).json({
        success: false,
        message: "Unable to analyze this video for quiz generation. Please try again.",
      });
    }

    // Step B: Prepare audio payload (Attempt File API upload; fallback to inline base64 if 403/Forbidden)
    let audioPart = null;

    try {
      const fileManager = new GoogleAIFileManager(apiKey);
      console.log("📤 Attempting upload of video audio content to Gemini File API...");
      uploadedFile = await fileManager.uploadFile(tmpFilePath, {
        mimeType: "audio/m4a",
        displayName: `Video Content ${videoId}`,
      });

      console.log(`✅ Uploaded file: ${uploadedFile.file.name}. Waiting for state active...`);

      let fileState = await fileManager.getFile(uploadedFile.file.name);
      let attempts = 0;
      while (fileState.state === "PROCESSING" && attempts < 15) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        fileState = await fileManager.getFile(uploadedFile.file.name);
        attempts++;
      }

      if (fileState.state === "ACTIVE") {
        audioPart = {
          fileData: {
            mimeType: uploadedFile.file.mimeType,
            fileUri: uploadedFile.file.uri,
          },
        };
      }
    } catch (uploadErr) {
      console.warn("⚠️ File API upload failed/forbidden, falling back to inline base64 audio:", uploadErr.message);
    }

    if (!audioPart) {
      console.log("📦 Converting extracted audio to inline base64 payload...");
      const base64Audio = fs.readFileSync(tmpFilePath).toString("base64");
      audioPart = {
        inlineData: {
          data: base64Audio,
          mimeType: "audio/m4a",
        },
      };
      console.log("✅ Inline audio payload prepared successfully.");
    }

    // Step C: Initialize Gemini Generative Model with Multimodal Video Content Input
    const genAI = new GoogleGenerativeAI(apiKey);
    const candidateModels = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.0-flash", "gemini-2.5-pro"];

    const prompt = `Analyze the provided educational video content and generate a quiz based ONLY on concepts, explanations, examples, formulas, facts, and topics actually present in the provided video content.

Do not invent information.
Do not use unrelated outside knowledge.
Do not infer content that is not present.
Generate questions appropriate to the requested difficulty (${diff}).

Generate exactly ${count} multiple-choice questions.

Return ONLY a valid JSON object matching this exact schema, with no markdown formatting or extra text:
{
  "questions": [
    {
      "question": "Question text based directly on video explanation",
      "options": [
        "Option 1",
        "Option 2",
        "Option 3",
        "Option 4"
      ],
      "correctAnswer": "Exact string of the correct option",
      "explanation": "Explanation based on facts explained in the video"
    }
  ]
}`;

    let responseText = "";
    let generationSuccess = false;

    for (const modelName of candidateModels) {
      try {
        console.log(`🤖 Attempting quiz generation with model: ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent([
          audioPart,
          { text: prompt },
        ]);
        responseText = result.response.text();
        console.log(`📥 Raw AI Response received using ${modelName}.`);
        generationSuccess = true;
        break;

      } catch (genErr) {
        console.warn(`⚠️ Model ${modelName} failed: ${genErr.message}`);
      }
    }

    if (!generationSuccess || !responseText) {
      throw new Error("Failed to generate quiz content with all Gemini models.");
    }


    // Clean up files
    try { await fileManager.deleteFile(uploadedFile.file.name); } catch (e) {}
    if (fs.existsSync(tmpFilePath)) {
      try { fs.unlinkSync(tmpFilePath); } catch (e) {}
    }

    // Step D: Validate AI structured JSON response
    const cleanedJson = cleanJsonString(responseText);
    let parsedData;
    try {
      parsedData = JSON.parse(cleanedJson);
    } catch (parseErr) {
      console.error("❌ JSON Parse error from AI response:", parseErr.message);
      return res.status(400).json({
        success: false,
        message: "Unable to analyze this video for quiz generation. Please try again.",
      });
    }

    if (!parsedData || !Array.isArray(parsedData.questions) || parsedData.questions.length === 0) {
      console.error("❌ AI response missing questions array.");
      return res.status(400).json({
        success: false,
        message: "Unable to analyze this video for quiz generation. Please try again.",
      });
    }

    // Validate each question structure strictly
    const validatedQuestions = [];
    for (const q of parsedData.questions) {
      if (!q || typeof q.question !== "string" || !q.question.trim()) continue;
      if (!Array.isArray(q.options) || q.options.length !== 4) continue;

      const cleanOptions = q.options.map((opt) => String(opt || "").trim());
      if (cleanOptions.some((opt) => !opt)) continue;

      let correct = String(q.correctAnswer || "").trim();
      if (!cleanOptions.includes(correct)) {
        correct = cleanOptions[0]; // Ensure exact match
      }

      const explanation = String(q.explanation || "Based on the concepts presented in the video.").trim();

      validatedQuestions.push({
        question: q.question.trim(),
        options: cleanOptions,
        correctAnswer: correct,
        explanation,
      });
    }

    if (validatedQuestions.length === 0) {
      console.error("❌ No valid questions after schema validation.");
      return res.status(400).json({
        success: false,
        message: "Unable to analyze this video for quiz generation. Please try again.",
      });
    }

    return res.json({
      success: true,
      questions: validatedQuestions.slice(0, count),
    });
  } catch (err) {
    console.error("❌ Error in generateQuiz:", err);

    // Clean up temporary files on error
    if (uploadedFile && uploadedFile.file) {
      try {
        const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
        await fileManager.deleteFile(uploadedFile.file.name);
      } catch (e) {}
    }
    if (tmpFilePath && fs.existsSync(tmpFilePath)) {
      try { fs.unlinkSync(tmpFilePath); } catch (e) {}
    }

    return res.status(400).json({
      success: false,
      message: "Unable to analyze this video for quiz generation. Please try again.",
    });
  }
};

// ✅ 2. SAVE QUIZ ATTEMPT TO MONGODB
export const saveQuizAttempt = async (req, res) => {
  try {
    const { videoId, videoTitle, difficulty, questionCount, score, accuracy } = req.body;
    const userId = req.user?._id || req.user?.id;

    if (!userId || !videoId || score == null || accuracy == null) {
      return res.status(400).json({ success: false, message: "Missing required fields for saving attempt." });
    }

    const attempt = await QuizAttempt.create({
      userId,
      videoId,
      videoTitle: videoTitle || "",
      difficulty: difficulty || "Medium",
      questionCount: parseInt(questionCount, 10) || 5,
      score: parseInt(score, 10) || 0,
      accuracy: parseFloat(accuracy) || 0,
      attemptedAt: new Date(),
    });

    return res.json({
      success: true,
      message: "Quiz attempt saved successfully!",
      attempt,
    });
  } catch (err) {
    console.error("❌ Error saving quiz attempt:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ 3. GET USER QUIZ ATTEMPTS
export const getQuizAttempts = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(400).json({ success: false, message: "User ID missing." });

    const attempts = await QuizAttempt.find({ userId }).sort({ attemptedAt: -1 }).limit(20);

    return res.json({
      success: true,
      attempts,
    });
  } catch (err) {
    console.error("❌ Error fetching quiz attempts:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
