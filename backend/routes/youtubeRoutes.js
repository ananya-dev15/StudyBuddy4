// backend/routes/youtubeRoutes.js
import express from "express";
import protect from "../middlewares/authMiddleware.js";
import { getVideoInfo, getPlaylistInfo, saveProgress } from "../controllers/youtubeController.js";

const router = express.Router();
router.use(protect);

router.get("/video", getVideoInfo);
router.get("/playlist", getPlaylistInfo);
router.post("/save-progress", saveProgress);

export default router;
