import express from "express";
import { getAllFeedbacks, createFeedback } from "../controllers/feedbackController.js";
import protect from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", getAllFeedbacks);
router.post("/", protect, createFeedback);

export default router;
