import express from "express";
import protect from "../middlewares/authMiddleware.js";
import { generateQuiz, saveQuizAttempt, getQuizAttempts } from "../controllers/quizController.js";

const router = express.Router();

router.post("/generate", protect, generateQuiz);
router.post("/save-attempt", protect, saveQuizAttempt);
router.get("/attempts", protect, getQuizAttempts);

export default router;
