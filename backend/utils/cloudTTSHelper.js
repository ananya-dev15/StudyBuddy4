import https from "node:https";

const LANG_MAP = {
  "pa-IN": "pa",
  "hi-IN": "hi",
  "bn-IN": "bn",
  "ta-IN": "ta",
  "te-IN": "te",
  "mr-IN": "mr",
  "gu-IN": "gu",
  "kn-IN": "kn",
  "ml-IN": "ml",
  "en-IN": "en",
};

function fetchAudioChunk(text, lang) {
  return new Promise((resolve, reject) => {
    const encoded = encodeURIComponent(text);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=${lang}&client=tw-ob`;
    
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "*/*",
        },
        timeout: 6000,
      },
      (res) => {
        if (res.statusCode !== 200) {
          return reject(new Error(`Cloud TTS status ${res.statusCode}`));
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      }
    );

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Cloud TTS timeout"));
    });
  });
}

/**
 * Universal Zero-Dependency Cloud Neural TTS
 * Runs in pure Node.js on Render, Vercel, Railway, Heroku, or local without Python or edge-tts.
 */
export async function synthesizeCloudSpeech(text, langCode = "en-IN") {
  if (!text || !text.trim()) return null;

  const targetLang = LANG_MAP[langCode] || "hi";

  // Split text into natural chunks <= 180 characters to respect HTTP TTS limits
  const sentences = text.match(/[^.!?।\n]+[.!?।\n]*/g) || [text];
  const audioParts = [];

  for (const s of sentences) {
    const trimmed = s.trim();
    if (!trimmed) continue;

    if (trimmed.length > 180) {
      const subParts = trimmed.match(/.{1,180}(\s|$)/g) || [trimmed];
      for (const piece of subParts) {
        if (piece.trim()) {
          const chunk = await fetchAudioChunk(piece.trim(), targetLang);
          if (chunk && chunk.length > 0) audioParts.push(chunk);
        }
      }
    } else {
      const chunk = await fetchAudioChunk(trimmed, targetLang);
      if (chunk && chunk.length > 0) audioParts.push(chunk);
    }
  }

  if (audioParts.length === 0) {
    throw new Error("No audio generated from cloud TTS");
  }

  const combinedBuffer = Buffer.concat(audioParts);
  return {
    success: true,
    audio: combinedBuffer.toString("base64"),
    format: "mp3",
    voice: `cloud-neural-${targetLang}`,
    model: "cloud-neural-v1",
  };
}
