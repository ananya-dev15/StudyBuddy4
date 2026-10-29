import express from "express";
import { submitQuestion, getPublishedFAQs } from "../controllers/faqController.js";

const router = express.Router();

router.post("/question", submitQuestion);
router.get("/published", getPublishedFAQs);

export default router;

