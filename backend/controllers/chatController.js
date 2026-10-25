import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import { synthesizeNeuralSpeech } from "../utils/neuralTTSHelper.js";
import { synthesizeCloudSpeech } from "../utils/cloudTTSHelper.js";

// Cache quota exhaustion state to eliminate 8-10s delay on consecutive TTS requests
let sarvamQuotaExhaustedUntil = 0;

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
 * Detects appropriate Indic/English BCP-47 language code for models.
 */
export const detectLanguageCode = (text) => {
  if (!text) return "en-IN";

  // Native Regional Indic Scripts
  if (/[\u0A00-\u0A7F]/.test(text)) return "pa-IN"; // Gurmukhi (Punjabi)
  if (/[\u0980-\u09FF]/.test(text)) return "bn-IN"; // Bengali
  if (/[\u0B80-\u0BFF]/.test(text)) return "ta-IN"; // Tamil
  if (/[\u0C00-\u0C7F]/.test(text)) return "te-IN"; // Telugu
  if (/[\u0C80-\u0CFF]/.test(text)) return "kn-IN"; // Kannada
  if (/[\u0D00-\u0D7F]/.test(text)) return "ml-IN"; // Malayalam
  if (/[\u0A80-\u0AFF]/.test(text)) return "gu-IN"; // Gujarati
  if (/[\u0B00-\u0B7F]/.test(text)) return "od-IN"; // Odia

  // Devanagari Alphabet Letters (Hindi & Marathi)
  if (/[\u0904-\u0939\u0958-\u0963]/.test(text)) {
    const marathiWords = ["आहे", "नाही", "कसे", "काय", "कशा", "झाले", "झाला", "करा", "तुम्ही", "माझे", "मला", "होते", "आहात", "पाहिजे", "नमस्कार", "कसं", "आहोत", "करायचे", "सांगा"];
    if (marathiWords.some((w) => text.includes(w))) {
      return "mr-IN";
    }
    return "hi-IN";
  }

  // Regional transliterated / Romanized words
  const words = text.toLowerCase().split(/[^a-zA-Z]+/);

  // Punjabi transliterated (Checked first so words like 'haal' or 'kive' are identified before Hindi)
  const punjabiWords = [
    "tussi", "tusi", "kive", "kiven", "kiwe", "kidda", "kiddan", "haal", "vadiya", "vadia",
    "daso", "dasso", "chahida", "chahidi", "punjabi", "sat", "akal", "satsriakal",
    "aaho", "haanji", "karde", "karda", "kardi", "padhna", "parhna", "kehnde",
    "sanu", "thoda", "thodi", "ethe", "othe", "sohna", "sohni", "kujh", "changa",
    "changi", "rabb", "rakha", "ajj", "aj", "saade", "tuhanu", "mainu"
  ];
  if (words.some((w) => punjabiWords.includes(w))) return "pa-IN";

  // Bengali transliterated
  const bengaliWords = ["kemon", "aacho", "aami", "bhalo", "dhonnobad", "korbo", "shikhbo", "aamake", "ki", "korcho"];
  if (words.some((w) => bengaliWords.includes(w))) return "bn-IN";

  // Tamil transliterated
  const tamilWords = ["vanakkam", "eppadi", "irukinga", "irukeenga", "nandri", "theriyum", "solunga", "padikanum"];
  if (words.some((w) => tamilWords.includes(w))) return "ta-IN";

  // Telugu transliterated
  const teluguWords = ["namaskaram", "ela", "unnaru", "dhanyavadalu", "cheppandi", "telusu", "chaduvukovali"];
  if (words.some((w) => teluguWords.includes(w))) return "te-IN";

  // Marathi transliterated
  const marathiWords = ["namaskar", "kasa", "ahes", "aahe", "nahit", "sang", "mahit", "abhyas", "karto"];
  if (words.some((w) => marathiWords.includes(w))) return "mr-IN";

  // Gujarati transliterated
  const gujaratiWords = ["kem", "cho", "majama", "tame", "tamari", "tamaro", "tamaru", "shu", "nathi", "aavjo", "saaru", "gujarati"];
  if (words.some((w) => gujaratiWords.includes(w))) return "gu-IN";

  // English indicator words
  const englishKeywords = ["what", "how", "why", "where", "which", "explain", "concept", "study", "exam", "question", "program", "code", "class", "function", "object"];
  const englishCount = words.filter((w) => englishKeywords.includes(w)).length;

  // Distinctive Hinglish / Romanized Hindi keywords
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

    let systemPrompt = `You are StudyBuddy AI 🤖, an expert, encouraging, and patient study mentor.

CRITICAL MANDATORY INSTRUCTION - EXACT LANGUAGE & SCRIPT MATCHING:
The student will ask questions in various languages or code-mixed dialects:
- If the student asks in PUNJABI (Gurmukhi or Roman Punjabi, e.g. "tussi", "kive", "kidda", "daso", "padhna", "ki haal", "sat sri akal", "ji"): You MUST reply in PUNJABI! Absolutely DO NOT reply in Hindi or English if the student asked in Punjabi!
- If the student asks in BENGALI: Reply in Bengali!
- If the student asks in TAMIL: Reply in Tamil!
- If the student asks in TELUGU: Reply in Telugu!
- If the student asks in MARATHI: Reply in Marathi!
- If the student asks in GUJARATI: Reply in Gujarati!
- If the student asks in KANNADA: Reply in Kannada!
- If the student asks in MALAYALAM: Reply in Malayalam!
- If the student asks in HINDI or HINGLISH: Reply in natural Hindi / Hinglish!
- If the student asks in ENGLISH: Reply in English!

Always match the student's exact language, script, and conversational tone.
Keep replies concise, clear, motivating, and to the point (2 to 4 sentences).
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
        // Ultra-fast model candidates prioritized for minimal latency
        const candidateModels = [
          "gemini-3.5-flash-lite",
          "gemini-flash-latest",
          "gemini-2.5-flash"
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
                detected_language: detectLanguageCode(message) || detectLanguageCode(reply),
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

    // Smart multilingual fallback if AI API is temporarily unavailable
    const lowMsg = message.toLowerCase();
    const detectedLang = detectLanguageCode(message);
    let fallbackReply = "That's a great question! Keep focusing on your study session. Let me know if you need help breaking down concepts, smart study tips, or assignment assistance.";

    if (detectedLang === "pa-IN") {
      fallbackReply = "ਬਹੁਤ ਵਧੀਆ ਸਵਾਲ ਹੈ! ਆਪਣੀ ਪੜ੍ਹਾਈ 'ਤੇ ਪੂਰਾ ਧਿਆਨ ਰੱਖੋ। ਜੇਕਰ ਕਿਸੇ ਵੀ ਵਿਸ਼ੇ ਜਾਂ ਕੰਸੈਪਟ ਵਿੱਚ ਕੋਈ ਸ਼ੱਕ ਹੈ, ਤਾਂ ਬੇਝਿਜਕ ਪੁੱਛੋ!";
    } else if (detectedLang === "mr-IN") {
      fallbackReply = "खूप छान प्रश्न आहे! अभ्यासावर लक्ष केंद्रित ठेवा. काही अडचण किंवा शंका असल्यास नक्की विचारा!";
    } else if (detectedLang === "bn-IN") {
      fallbackReply = "খুব ভালো প্রশ্ন! পড়াশোনায় মনোযোগ রাখুন। কোনো বিষয়ে সন্দেহ থাকলে অবশ্যই জিজ্ঞাসা করুন!";
    } else if (detectedLang === "ta-IN") {
      fallbackReply = "மிக அருமையான கேள்வி! படிப்பில் கவனம் செலுத்துங்கள். ஏதேனும் சந்தேகம் இருந்தால் தாராளமாக கேளுங்கள்!";
    } else if (detectedLang === "te-IN") {
      fallbackReply = "చాలా మంచి ప్రశ్న! చదువుపై దృష్టి పెట్టండి. ఏదైనా సందేహం ఉంటే తప్పకుండా అడగండి!";
    } else if (detectedLang === "hi-IN" || lowMsg.includes("kya") || lowMsg.includes("kaise") || /[\u0900-\u097F]/.test(message)) {
      fallbackReply = "बहुत बढ़िया सवाल है! अपनी पढ़ाई पर ध्यान बनाए रखें। किसी भी टॉपिक में डाउट हो तो बेझिझक पूछिए!";
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
 * Sarvam AI Text-to-Speech + Ultra-Fast Studio Neural AI Voice Engine
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

    const apiKey = process.env.SARVAM_API_KEY ? process.env.SARVAM_API_KEY.trim() : null;

    const cleanText = cleanTextForTTS(text);
    if (!cleanText) {
      return res.status(400).json({
        success: false,
        message: "No speakable text found after cleaning.",
      });
    }

    const targetLangCode = language_code || detectLanguageCode(cleanText);

    // 1. Try Sarvam AI first ONLY if credits are available (skip immediately if quota exhausted to avoid 8s lag)
    if (apiKey && Date.now() > sarvamQuotaExhaustedUntil) {
      const modelsToTry = [
        { model: "bulbul:v3", speaker: "simran" },
        { model: "bulbul:v3", speaker: "kavya" },
      ];

      for (const cfg of modelsToTry) {
        try {
          const payload = {
            inputs: [cleanText.slice(0, 450)],
            target_language_code: targetLangCode,
            model: cfg.model,
            speaker: cfg.speaker,
            pace: 1.0,
            speech_sample_rate: 22050,
          };

          const response = await axios.post("https://api.sarvam.ai/text-to-speech", payload, {
            headers: {
              "api-subscription-key": apiKey,
              "Content-Type": "application/json",
            },
            timeout: 5000,
          });

          if (response.data?.audios && response.data.audios.length > 0) {
            return res.json({
              success: true,
              audio: response.data.audios[0],
              model: `sarvam-${cfg.model}`,
              speaker: cfg.speaker,
              language_code: targetLangCode,
              format: "wav",
            });
          }
        } catch (err) {
          const status = err.response?.status;
          const errCode = err.response?.data?.error?.code;
          // If insufficient quota (402), immediately mark exhausted for 10 mins and BREAK to avoid 5-10s delay!
          if (status === 402 || errCode === "insufficient_quota_error") {
            sarvamQuotaExhaustedUntil = Date.now() + 10 * 60 * 1000;
            console.log("⚡ Sarvam AI quota exhausted (402). Instantly routing to Ultra-Fast Studio Neural AI Voice.");
            break;
          }
          console.warn(`Sarvam TTS note (${cfg.model}/${cfg.speaker}):`, status, err.response?.data?.error?.message || err.message);
        }
      }
    }

    // 2. High-fidelity Neural AI Female Voice Engine (Studio regional accents: Swara, Neerja, Tanishaa, Pallavi, etc.)
    try {
      const neuralResult = await synthesizeNeuralSpeech(cleanText, targetLangCode);
      if (neuralResult && neuralResult.audio) {
        return res.json({
          success: true,
          audio: neuralResult.audio,
          model: "neural-ai-studio",
          speaker: neuralResult.voice,
          language_code: targetLangCode,
          format: "mp3",
        });
      }
    } catch (neuralErr) {
      console.warn("Neural TTS engine note:", neuralErr.message);
    }

    // 3. Universal Cloud Neural TTS Engine (100% pure Node.js, guaranteed to work on Render and deployed servers)
    try {
      const cloudResult = await synthesizeCloudSpeech(cleanText, targetLangCode);
      if (cloudResult && cloudResult.audio) {
        return res.json({
          success: true,
          audio: cloudResult.audio,
          model: "cloud-neural-studio",
          speaker: cloudResult.voice,
          language_code: targetLangCode,
          format: "mp3",
        });
      }
    } catch (cloudErr) {
      console.warn("Cloud TTS engine note:", cloudErr.message);
    }

    return res.status(502).json({
      success: false,
      message: "AI voice synthesis currently unavailable.",
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

    const apiKey = process.env.SARVAM_API_KEY ? process.env.SARVAM_API_KEY.trim() : null;
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
