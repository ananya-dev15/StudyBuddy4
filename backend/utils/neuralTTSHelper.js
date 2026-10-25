import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCRIPT_PATH = path.join(__dirname, "neural_tts.py");

/**
 * Generates speech using Microsoft Neural AI voices via python edge-tts.
 * Supports authentic regional Indian female accents (Hindi, English, Bengali, Tamil, Telugu, Marathi, Gujarati, etc.).
 */
export const synthesizeNeuralSpeech = (text, languageCode = "en-IN") => {
  return new Promise((resolve, reject) => {
    try {
      const pyProcess = spawn("python3", [SCRIPT_PATH]);

      let stdoutData = "";
      let stderrData = "";

      pyProcess.stdout.on("data", (data) => {
        stdoutData += data.toString();
      });

      pyProcess.stderr.on("data", (data) => {
        stderrData += data.toString();
      });

      pyProcess.on("close", (code) => {
        if (code !== 0) {
          console.warn("Neural TTS python exited with code:", code, stderrData);
          return reject(new Error(stderrData || `Neural TTS exited with code ${code}`));
        }

        try {
          const result = JSON.parse(stdoutData.trim());
          if (result.success && result.audio) {
            resolve(result);
          } else {
            reject(new Error(result.error || "Neural TTS failed"));
          }
        } catch (parseErr) {
          reject(parseErr);
        }
      });

      pyProcess.on("error", (err) => {
        reject(err);
      });

      // Send payload to stdin
      pyProcess.stdin.write(
        JSON.stringify({
          text,
          language_code: languageCode,
        })
      );
      pyProcess.stdin.end();
    } catch (err) {
      reject(err);
    }
  });
};
