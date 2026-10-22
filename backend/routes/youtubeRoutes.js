import express from "express";
import protect from "../middlewares/authMiddleware.js";
import {
  getVideoInfo,
  getPlaylistInfo,
  saveProgress,
  searchYouTube,
} from "../controllers/youtubeController.js";

const router = express.Router();

// Public route: search educational YouTube videos (no auth required)
router.get("/search", searchYouTube);

// Protected routes (require user login session)
router.get("/video", protect, getVideoInfo);
router.get("/playlist", protect, getPlaylistInfo);
router.post("/save-progress", protect, saveProgress);

export default router;

