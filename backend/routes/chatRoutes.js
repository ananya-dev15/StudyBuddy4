import express from "express";
import multer from "multer";
import { handleChat, handleTextToSpeech, handleSpeechToText } from "../controllers/chatController.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

router.post("/ask", handleChat);
router.post("/tts", handleTextToSpeech);
router.post("/stt", upload.single("file"), handleSpeechToText);

export default router;
