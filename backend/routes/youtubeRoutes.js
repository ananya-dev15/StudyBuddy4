import express from "express";
import protect from "../middlewares/authMiddleware.js";
import {
  getVideoInfo,
  getPlaylistInfo,
  saveProgress,
  searchYouTube,
} from "../controllers/youtubeController.js";

const router = express.Router();

// Public routes: search educational YouTube videos & fetch playlist info
router.get("/search", searchYouTube);
router.get("/playlist", getPlaylistInfo);

// Protected routes (require user login session)
router.get("/video", protect, getVideoInfo);
router.post("/save-progress", protect, saveProgress);

export default router;

