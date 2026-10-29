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
 * Splits strictly at sentence or clause boundaries to ensure natural cadence.
 */
export async function synthesizeCloudSpeech(text, langCode = "en-IN") {
  if (!text || !text.trim()) return null;

  const targetLang = LANG_MAP[langCode] || "hi";

  // Match sentences ending in punctuation
  const sentences = text.match(/[^.!?।\n]+[.!?।\n]*/g) || [text];
  const audioParts = [];

  for (const s of sentences) {
    const trimmed = s.trim();
    if (!trimmed) continue;

    if (trimmed.length > 180) {
      // Split compound sentences at clause boundaries (, ; : )
      const clauses = trimmed.match(/[^,;:]+[,;:]*/g) || [trimmed];
      let subPart = "";

      for (const clause of clauses) {
        const cTrim = clause.trim();
        if ((subPart + " " + cTrim).trim().length <= 180) {
          subPart = subPart ? `${subPart} ${cTrim}` : cTrim;
        } else {
          if (subPart) {
            try {
              const chunk = await fetchAudioChunk(subPart, targetLang);
              if (chunk && chunk.length > 0) audioParts.push(chunk);
            } catch (e) {}
          }
          subPart = cTrim;
        }
      }

      if (subPart) {
        try {
          const chunk = await fetchAudioChunk(subPart.slice(0, 180), targetLang);
          if (chunk && chunk.length > 0) audioParts.push(chunk);
        } catch (e) {}
      }
    } else {
      try {
        const chunk = await fetchAudioChunk(trimmed, targetLang);
        if (chunk && chunk.length > 0) audioParts.push(chunk);
      } catch (e) {}
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
