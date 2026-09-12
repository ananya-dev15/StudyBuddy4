// backend/controllers/youtubeController.js
// Handles YouTube related API endpoints.

import { fetchVideoDetails, fetchPlaylistItems, evaluateStudyVideo } from "../utils/youtube.js";
import User from "../models/User.js";

function getLocalDateString(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Helper to find or create a history entry for a video
async function getOrCreateHistoryEntry(user, videoId) {
  let entry = user.history.find((h) => h.videoId === videoId);
  if (!entry) {
    entry = {
      videoId,
      url: `https://youtu.be/${videoId}`,
      secondsWatched: 0,
      tabSwitches: 0,
      watchedAt: getLocalDateString(),
    };
    user.history.unshift(entry);
    await user.save();
  }
  return entry;
}

// GET /api/youtube/video?videoId=...
export async function getVideoInfo(req, res) {
  try {
    const { videoId } = req.query;
    if (!videoId) return res.status(400).json({ success: false, message: "Missing videoId" });
    const user = req.user;
    // Check cache in user.history
    let cached = user.history.find((h) => h.videoId === videoId && h.videoTitle);
    if (cached) {
      // Use stored metadata if present
      return res.json({
        success: true,
        videoId,
        title: cached.videoTitle || "",
        description: cached.description || "",
        channelTitle: cached.channelTitle || "",
        thumbnail: cached.thumbnail || "",
        duration: cached.duration || 0,
        isStudyVideo: cached.isStudyVideo ?? true,
        studyScore: cached.studyScore ?? 0,
        lastWatchedPosition: cached.lastWatchedPosition || 0,
      });
    }
    // Fetch from YouTube API / noembed fallback
    const details = await fetchVideoDetails(videoId);
    const { isStudyVideo, studyScore } = evaluateStudyVideo(details);
    // Save to history (metadata only, not a full session)
    const entry = await getOrCreateHistoryEntry(user, videoId);
    entry.videoTitle = details.title;
    entry.channelTitle = details.channelTitle;
    entry.description = details.description;
    entry.thumbnail = details.thumbnail;
    entry.duration = details.duration;
    entry.isStudyVideo = isStudyVideo;
    entry.studyScore = studyScore;
    entry.lastWatchedPosition = entry.lastWatchedPosition || 0;
    await user.save();
    return res.json({
      success: true,
      videoId,
      title: details.title,
      description: details.description,
      channelTitle: details.channelTitle,
      thumbnail: details.thumbnail,
      duration: details.duration,
      isStudyVideo,
      studyScore,
      lastWatchedPosition: entry.lastWatchedPosition || 0,
    });
  } catch (err) {
    console.error("Error in getVideoInfo:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/youtube/playlist?playlistId=...
export async function getPlaylistInfo(req, res) {
  try {
    const { playlistId } = req.query;
    if (!playlistId) return res.status(400).json({ success: false, message: "Missing playlistId" });
    const data = await fetchPlaylistItems(playlistId);
    return res.json({ success: true, ...data });
  } catch (err) {
    console.error("Error in getPlaylistInfo:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// POST /api/youtube/save-progress
export async function saveProgress(req, res) {
  try {
    const { videoId, position } = req.body;
    if (!videoId) return res.status(400).json({ success: false, message: "Missing videoId" });
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    let entry = user.history.find((h) => h.videoId === videoId);
    if (!entry) {
      entry = {
        videoId,
        url: `https://youtu.be/${videoId}`,
        secondsWatched: 0,
        tabSwitches: 0,
        watchedAt: getLocalDateString(),
        lastWatchedPosition: Math.floor(position),
      };
      user.history.unshift(entry);
    } else {
      entry.lastWatchedPosition = Math.floor(position);
    }
    user.markModified("history");
    await user.save();
    return res.json({ success: true, message: "Progress saved", position });
  } catch (err) {
    console.error("Error in saveProgress:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
