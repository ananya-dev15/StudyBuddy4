import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";

/**
 * Strips markdown, emojis, code blocks, and symbols so TTS produces clean natural audio.
 */
export const cleanTextForTTS = (text) => {
  if (!text) return "";
  let clean = text;
  clean = clean.replace(/```[\s\S]*?```/g, " code snippet ");
  clean = clean.replace(/`([^`]+)`/g, "$1");
  clean = clean.replace(/^#+\s+/gm, "");
  clean = clean.replace(/\*\*([^*]+)\*\*/g, "$1");
  clean = clean.replace(/\*([^*]+)\*/g, "$1");
  clean = clean.replace(/__([^_]+)__/g, "$1");
  clean = clean.replace(/_([^_]+)_/g, "$1");
  clean = clean.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  clean = clean.replace(/^[\s*-]+\s+/gm, "");

  // Remove Emojis & Pictographs so TTS reads only spoken words
  try {
    clean = clean.replace(/[\p{Extended_Pictographic}\p{Emoji_Component}]/gu, "");
  } catch (e) {
    clean = clean.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}]/gu, "");
  }

  clean = clean.replace(/\\rightarrow/g, " leads to ");
  clean = clean.replace(/[\$\\]/g, "");

  return clean.replace(/\s+/g, " ").trim();
};

/**
 * Detects appropriate Indic/English BCP-47 language code for Sarvam AI models.
 */
export const detectLanguageCode = (text) => {
  if (!text) return "en-IN";

  // Native Regional Indic Scripts (Tested before Devanagari so shared danda \u0964 does not misclassify)
  if (/[\u0980-\u09FF]/.test(text)) return "bn-IN"; // Bengali
  if (/[\u0B80-\u0BFF]/.test(text)) return "ta-IN"; // Tamil
  if (/[\u0C00-\u0C7F]/.test(text)) return "te-IN"; // Telugu
  if (/[\u0C80-\u0CFF]/.test(text)) return "kn-IN"; // Kannada
  if (/[\u0D00-\u0D7F]/.test(text)) return "ml-IN"; // Malayalam
  if (/[\u0A80-\u0AFF]/.test(text)) return "gu-IN"; // Gujarati
  if (/[\u0A00-\u0A7F]/.test(text)) return "pa-IN"; // Gurmukhi (Punjabi)
  if (/[\u0B00-\u0B7F]/.test(text)) return "od-IN"; // Odia

  // Devanagari Alphabet Letters (Hindi & Marathi)
  if (/[\u0904-\u0939\u0958-\u0963]/.test(text)) {
    // Check if text is Marathi in Devanagari
    const marathiWords = ["आहे", "नाही", "कसे", "काय", "कशा", "झाले", "झाला", "करा", "तुम्ही", "माझे", "मला", "होते", "आहात", "पाहिजे", "नमस्कार", "कसं", "आहोत", "करायचे", "सांगा"];
    if (marathiWords.some((w) => text.includes(w))) {
      return "mr-IN";
    }
    return "hi-IN"; // Default Devanagari to Hindi
  }

  // Regional transliterated / Romanized words
  const words = text.toLowerCase().split(/[^a-zA-Z]+/);

  // Bengali transliterated
  const bengaliWords = ["kemon", "aacho", "aami", "bhalo", "dhonnobad", "korbo", "shikhbo", "aamake"];
  if (words.some((w) => bengaliWords.includes(w))) return "bn-IN";

  // Tamil transliterated
  const tamilWords = ["vanakkam", "eppadi", "irukinga", "irukeenga", "nandri", "theriyum", "solunga", "padikanum"];
  if (words.some((w) => tamilWords.includes(w))) return "ta-IN";

  // Telugu transliterated
  const teluguWords = ["namaskaram", "ela", "unnaru", "dhanyavadalu", "cheppandi", "telusu", "chaduvukovali"];
  if (words.some((w) => teluguWords.includes(w))) return "te-IN";

  // Marathi transliterated
  const marathiWords = ["namaskar", "kasa", "ahes", "aahe", "nahit", "sang", "mahit", "abhyas"];
  if (words.some((w) => marathiWords.includes(w))) return "mr-IN";

  // English indicator words
  const englishKeywords = ["what", "how", "why", "where", "which", "explain", "concept", "study", "exam", "question", "program", "code", "class", "function", "object"];
  const englishCount = words.filter((w) => englishKeywords.includes(w)).length;

  // Distinctive Hinglish / Romanized Hindi keywords (no English collision like 'the' or 'ho')
  const distinctHinglishWords = [
    "kya", "kaise", "kyun", "kab", "kaha", "kahan", "kitna", "kuch",
    "nahi", "nahin", "nhi", "hai", "hain", "hoga", "hogi", "hoge",
    "karna", "karo", "kare", "karein", "raha", "rahe", "rahi", "thi", "tha",
    "mujhe", "mera", "meri", "mere", "aap", "aapka", "aapki", "aapke",
    "tum", "tumhara", "tumhari", "tumhare", "bhai", "yaar", "padhai", "samajh",
    "accha", "theek", "shukriya", "dhanyawad", "namaste", "batao", "sikhao", "bolo", "bataiye", "pucho"
  ];
  const hinglishCount = words.filter((w) => distinctHinglishWords.includes(w)).length;

  if (hinglishCount > 0 && hinglishCount >= englishCount) {
    return "hi-IN";
  }

  return "en-IN";
};

export const handleChat = async (req, res) => {
  try {
    const { message, context } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message is required.",
      });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    let systemPrompt = `You are StudyBuddy AI 🤖, a personalized, patient, and motivating multilingual study mentor for students. 
Your job is to help students learn effectively, stay focused, and feel encouraged.

Guidelines:
1. Be friendly, supportive, and clear. Speak like an expert, encouraging study mentor.
2. Break complex concepts into simple, easy-to-understand explanations with examples.
3. Keep answers concise, clear, and focused on helping the student learn.
4. If a question is about study habits, tips, reminders, or focus, provide actionable advice.
5. Multilingual & Hinglish Matching:
   - Always respond in the SAME language or code-mix as the student's question, unless they explicitly request another language.
   - If the student asks in Hindi (Devanagari or Romanized Hinglish), respond naturally in that exact style.
   - If the student asks in English, respond in English.
   - If the student asks in Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Punjabi, Malayalam, or any other Indian regional language, reply fluently in that language.
`;

    if (context && context.source === "video_tracker") {
      systemPrompt += `\nCurrent Learning Context:
The student is currently watching a video in the Study Video Tracker.
- Video Title: "${context.videoTitle || 'Educational Lecture'}"
- Video ID: "${context.videoId || 'N/A'}"
When answering, reference this context if relevant, but answer the student's question accurately and clearly.
`;
    }

    const userPrompt = `${systemPrompt}\nStudent Question: "${message.trim()}"\n\nStudyBuddy AI Answer:`;

    if (apiKey && apiKey !== "YOUR_GEMINI_API_KEY_HERE") {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const candidateModels = [
          "gemini-2.5-flash",
          "gemini-2.0-flash",
          "gemini-1.5-flash",
          "gemini-flash-latest"
        ];

        for (const modelName of candidateModels) {
          try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(userPrompt);
            const response = await result.response;
            const reply = response.text();

            if (reply && reply.trim()) {
              return res.json({
                success: true,
                reply: reply.trim(),
                detected_language: detectLanguageCode(reply) || detectLanguageCode(message),
              });
            }
          } catch (modelErr) {
            console.warn(`Model ${modelName} chat error:`, modelErr.message);
          }
        }
      } catch (aiErr) {
        console.error("Gemini API Chat error:", aiErr);
      }
    }

    // Smart fallback if API key is unconfigured or fails
    const lowMsg = message.toLowerCase();
    const detectedLang = detectLanguageCode(message);
    let fallbackReply = "That's a great question! Keep focusing on your study session. Let me know if you need help breaking down concepts, smart study tips, or assignment assistance.";

    if (detectedLang === "hi-IN" || lowMsg.includes("kya") || lowMsg.includes("kaise") || /[\u0900-\u097F]/.test(message)) {
      fallbackReply = "Bahut badiya sawal hai! Apni study session par focus banaye rakhein. Agar kisi concept ya assignment me doubt ho, toh bejhijhak puchiye!";
    } else if (lowMsg.includes("conditional") || lowMsg.includes("if else") || lowMsg.includes("switch")) {
      fallbackReply = "Conditional statements (like if, else if, else, and switch) allow code to make decisions and execute specific blocks depending on whether conditions evaluate to true or false!";
    } else if (lowMsg.includes("polymorphism")) {
      fallbackReply = "Polymorphism in OOP allows objects of different classes to be treated as objects of a common superclass. The two main types are Compile-time (Method Overloading) and Runtime (Method Overriding).";
    } else if (lowMsg.includes("inheritance")) {
      fallbackReply = "Inheritance in OOP allows a new child class to acquire properties and methods of an existing parent class, promoting code reuse and hierarchical organization.";
    } else if (lowMsg.includes("abstraction")) {
      fallbackReply = "Abstraction is hiding internal implementation details and showing only essential functionality to the user, typically achieved using Abstract Classes and Interfaces in Java.";
    } else if (lowMsg.includes("encapsulation")) {
      fallbackReply = "Encapsulation is bundling data and methods inside a single class and restricting direct variable access using private modifiers with getters and setters.";
    } else if (lowMsg.includes("loop") || lowMsg.includes("for") || lowMsg.includes("while")) {
      fallbackReply = "Loops (for, while, do-while) repeat a block of code multiple times as long as a specified condition remains true.";
    } else if (lowMsg.includes("array") || lowMsg.includes("list")) {
      fallbackReply = "An array is a linear data structure that stores elements of the same data type in contiguous memory locations.";
    } else if (lowMsg.includes("reminder") || lowMsg.includes("assignments")) {
      fallbackReply = "You can manage your smart reminders and assignments directly from your Dashboard or Reminders panel!";
    } else if (lowMsg.includes("streak") || lowMsg.includes("coins")) {
      fallbackReply = "Watching educational videos maintains your daily study streak and earns focus coins. Switching tabs costs 5 coins!";
    }

    return res.json({
      success: true,
      reply: fallbackReply,
      detected_language: detectedLang,
    });
  } catch (err) {
    console.error("Chat controller error:", err);
    res.status(500).json({
      success: false,
      message: "Server error handling chat question.",
    });
  }
};

/**
 * Sarvam AI Text-to-Speech (Bulbul models: bulbul:v3 / bulbul:v4-flash / bulbul:v2)
 */
export const handleTextToSpeech = async (req, res) => {
  try {
    const { text, language_code } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Text is required for TTS generation.",
      });
    }

    const apiKey = process.env.SARVAM_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        success: false,
        message: "SARVAM_API_KEY is not configured in backend/.env",
      });
    }

    const cleanText = cleanTextForTTS(text);
    if (!cleanText) {
      return res.status(400).json({
        success: false,
        message: "No speakable text found after cleaning.",
      });
    }

    const targetLangCode = language_code || detectLanguageCode(cleanText);

    // Try Bulbul models in priority order
    const modelsToTry = [
      { model: "bulbul:v3", speaker: "shubh" },
      { model: "bulbul:v2", speaker: "anushka" },
      { model: "bulbul:v1", speaker: "meera" },
    ];

    let audioBase64 = null;
    let usedModel = null;
    let lastError = null;

    for (const cfg of modelsToTry) {
      try {
        const payload = {
          text: cleanText.slice(0, 2500),
          target_language_code: targetLangCode,
          model: cfg.model,
          speaker: cfg.speaker,
          pace: 1.0,
          speech_sample_rate: 22050,
        };

        if (cfg.model === "bulbul:v1") {
          delete payload.text;
          payload.inputs = [cleanText.slice(0, 2500)];
        }

        const response = await axios.post("https://api.sarvam.ai/text-to-speech", payload, {
          headers: {
            "api-subscription-key": apiKey,
            "Content-Type": "application/json",
          },
          timeout: 15000,
        });

        if (response.data?.audios && response.data.audios.length > 0) {
          audioBase64 = response.data.audios[0];
          usedModel = cfg.model;
          break;
        }
      } catch (err) {
        lastError = err.response?.data || err.message;
        console.warn(`Sarvam TTS error (${cfg.model}):`, err.response?.status, err.response?.data || err.message);
      }
    }

    if (!audioBase64) {
      return res.status(502).json({
        success: false,
        message: "Failed to generate speech audio from Sarvam AI.",
        error: typeof lastError === "string" ? lastError : JSON.stringify(lastError),
      });
    }

    return res.json({
      success: true,
      audio: audioBase64,
      model: usedModel,
      language_code: targetLangCode,
      format: "wav",
    });
  } catch (err) {
    console.error("Sarvam TTS handler error:", err);
    return res.status(500).json({
      success: false,
      message: "Error converting text to speech.",
    });
  }
};

/**
 * Sarvam AI Speech-to-Text (Saaras models: saaras:v4 / saaras:v3)
 */
export const handleSpeechToText = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: "Audio file is required for speech transcription.",
      });
    }

    const apiKey = process.env.SARVAM_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        success: false,
        message: "SARVAM_API_KEY is not configured in backend/.env",
      });
    }

    const modelsToTry = ["saaras:v4", "saaras:v3"];
    let transcript = "";
    let detectedLang = "en-IN";
    let lastError = null;

    for (const model of modelsToTry) {
      try {
        const formData = new FormData();
        const blob = new Blob([req.file.buffer], { type: req.file.mimetype || "audio/webm" });
        formData.append("file", blob, req.file.originalname || "audio.webm");
        formData.append("model", model);
        formData.append("mode", "transcribe");

        const response = await axios.post("https://api.sarvam.ai/speech-to-text", formData, {
          headers: {
            "api-subscription-key": apiKey,
          },
          timeout: 25000,
        });

        if (response.data && response.data.transcript !== undefined) {
          transcript = response.data.transcript;
          detectedLang = response.data.language_code || "en-IN";
          break;
        }
      } catch (err) {
        lastError = err.response?.data || err.message;
        console.warn(`Sarvam STT error (${model}):`, err.response?.status, err.response?.data || err.message);
      }
    }

    if (!transcript && transcript !== "") {
      return res.status(502).json({
        success: false,
        message: "Failed to transcribe audio from Sarvam AI.",
        error: typeof lastError === "string" ? lastError : JSON.stringify(lastError),
      });
    }

    return res.json({
      success: true,
      transcript: transcript.trim(),
      language_code: detectedLang,
    });
  } catch (err) {
    console.error("Sarvam STT handler error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error processing speech recognition.",
    });
  }
};
