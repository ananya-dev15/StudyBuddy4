// routes/trackingRoutes.js
import express from "express";
import fs from "fs";
import path from "path";
import User from "../models/User.js";
import Detection from "../models/Detection.js";
import protect from "../middlewares/authMiddleware.js";
import {
  getLocalDateString,
  getLocalDateKey,
  calculateStreak,
  updateUserStreak,
  saveUserWithRetry,
} from "../utils/streakUtils.js";
import {
  calculateLeaderboardScore,
  LEADERBOARD_CONFIG,
} from "../services/leaderboardScoreService.js";

const router = express.Router();

// Increment coins (userId comes from token)
router.post("/coins", protect, async (req, res) => {
  try {
    const { amount } = req.body;
    const user = req.user;
    if (!user) return res.status(404).json({ message: "User not found" });

    user.coins = (user.coins || 0) + (amount || 1);
    await saveUserWithRetry(user);
    res.json({ success: true, coins: user.coins });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Increment videos watched + maintain streak
router.post("/videos-watched", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const today = getLocalDateString();
    user.videosWatched = (user.videosWatched || 0) + 1;
    user.lastDayWatched = today;
    const streak = updateUserStreak(user);

    await saveUserWithRetry(user);

    res.json({
      success: true,
      videosWatched: user.videosWatched,
      streak: user.streak,
      lastDayWatched: user.lastDayWatched,
    });
  } catch (err) {
    console.error("⚠️ Error updating videos watched:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Reduce coins when user switches tab
router.post("/coins-loss", protect, async (req, res) => {
  try {
    const { loss = 5 } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) return res.status(404).json({ message: "User not found" });

    user.coins = Math.max(0, (user.coins || 0) - loss); // never negative
    user.videosSwitched = (user.videosSwitched || 0) + 1;

    await saveUserWithRetry(user);

    res.json({
      success: true,
      message: `Coins reduced by ${loss}`,
      coins: user.coins,
      videosSwitched: user.videosSwitched,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/coins-gain", async (req, res) => {
  try {
    const { userId, gain } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.coins += gain;
    await user.save();

    res.json({ success: true, coins: user.coins });
  } catch (err) {
    console.error("Error in coins-gain:", err);
    res.status(500).json({ error: "Server error" });
  }
});



// Get user stats
router.get("/stats", protect, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      coins: user.coins,
      videosWatched: user.videosWatched,
      videosSwitched: user.videosSwitched,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 🪙 Fetch user coins by ID (for frontend coin sync)
// router.get("/coins/:userId", async (req, res) => {
//   try {
//     const user = await User.findById(req.params.userId);
//     if (!user) return res.status(404).json({ message: "User not found" });
//     res.json({ coins: user.coins });
//   } catch (err) {
//     console.error("Error fetching coins:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// });


// backend/routes/tracking.js (or controller)
router.get("/coins/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    const streak = updateUserStreak(user);
    if (user.isModified("streak")) {
      await saveUserWithRetry(user);
    }

    res.json({
      success: true,
      coins: user.coins || 0,
      streak: streak,
      videosWatched: user.videosWatched || 0,
      videosSwitched: user.videosSwitched || 0,
    });
  } catch (err) {
    console.error("Error fetching coins:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/add-history", protect, async (req, res) => {
  try {
    const { videoId, url, secondsWatched, tabSwitches, note, tag, videoTitle, isStudyVideo, duration, studyScore } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // 🚫 Don’t save empty sessions (< 5 seconds)
    if (!secondsWatched || secondsWatched < 5) {
      return res.json({ success: false, message: "Session too short, not saved" });
    }

    const cleanId = (str) => {
      if (!str) return "";
      const match = String(str).match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
      return match ? match[1] : String(str).trim();
    };

    const targetId = cleanId(videoId || url);
    const todayStr = getLocalDateString();

    const isYt = /^[0-9A-Za-z_-]{11}$/.test(targetId) && !targetId.includes(".");
    const resolvedUrl = (url && url.startsWith("http"))
      ? url
      : isYt
        ? `https://youtu.be/${targetId}`
        : (url || targetId || "Local Video");

    const resolvedTitle = videoTitle || (isYt ? targetId : (targetId || "Local Video"));

    // Fetch persistent note/tag if available
    const persistentNote = (user.notes && user.notes[targetId]) || (user.notes && user.notes[videoId]) || note || "";
    const persistentTag = (user.tags && user.tags[targetId]) || (user.tags && user.tags[videoId]) || tag || "";

    // Find if there's ALREADY an entry for THIS video ON TODAY'S DATE
    let existingIndex = user.history.findIndex((h) => {
      const hId = cleanId(h.videoId || h.url);
      if (hId !== targetId) return false;
      let dateKey = "";
      if (h.watchedAt) {
        if (typeof h.watchedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(h.watchedAt.trim())) {
          dateKey = h.watchedAt.trim();
        } else if (typeof h.watchedAt === "string" && h.watchedAt.includes("T")) {
          dateKey = h.watchedAt.split("T")[0];
        } else {
          dateKey = getLocalDateString(h.watchedAt);
        }
      }
      return dateKey === todayStr;
    });

    if (existingIndex !== -1) {
      const existing = user.history[existingIndex];
      existing.secondsWatched = (existing.secondsWatched || 0) + Math.round(secondsWatched);
      existing.tabSwitches = (existing.tabSwitches || 0) + (tabSwitches || 0);
      existing.watchedAt = todayStr;
      if (resolvedTitle) existing.videoTitle = resolvedTitle;
      if (resolvedUrl && (!existing.url || existing.url === "Local Video" || existing.url === "Local File")) {
        existing.url = resolvedUrl;
      }
      if (persistentNote) existing.note = persistentNote;
      if (persistentTag) existing.tag = persistentTag;
      if (duration && !existing.duration) existing.duration = duration;
      if (studyScore && !existing.studyScore) existing.studyScore = studyScore;

      // Move updated entry to top
      user.history.splice(existingIndex, 1);
      user.history.unshift(existing);
    } else {
      const newEntry = {
        videoId: targetId,
        videoTitle: resolvedTitle,
        url: resolvedUrl,
        secondsWatched: Math.round(secondsWatched),
        tabSwitches: tabSwitches || 0,
        watchedAt: todayStr,
        note: persistentNote,
        tag: persistentTag,
        duration: duration || 0,
        studyScore: studyScore || 0,
        isStudyVideo: isStudyVideo !== undefined ? isStudyVideo : true,
      };
      user.history.unshift(newEntry);
    }

    user.lastDayWatched = todayStr;
    updateUserStreak(user);

    user.markModified("history");
    await saveUserWithRetry(user);
    res.json({ success: true, history: user.history, streak: user.streak, lastDayWatched: user.lastDayWatched });
  } catch (err) {
    console.error("❌ Error adding history:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ✅ Get last 5 video history entries
router.get("/history", protect, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(404).json({ message: "User not found" });

    // ✅ Send full history for chart
    res.json({ success: true, history: user.history || [] });
  } catch (err) {
    console.error("⚠️ Error fetching history:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ Weekly stats: total minutes watched in last 7 days
// 📊 Weekly study performance (past 7 days)
router.get("/weekly-stats", protect, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(404).json({ message: "User not found" });

    const now = new Date();
    const pastWeek = new Date(now);
    pastWeek.setDate(now.getDate() - 6);

    // Filter user history for last 7 days
    const recentHistory = (user.history || []).filter(
      (entry) => new Date(entry.watchedAt) >= pastWeek
    );

    // Group by date
    const stats = {};
    for (let i = 0; i < 7; i++) {
      const date = new Date(pastWeek);
      date.setDate(pastWeek.getDate() + i);
      const key = getLocalDateString(date);
      stats[key] = 0;
    }

    recentHistory.forEach((entry) => {
      let dateKey = "";
      if (entry.watchedAt) {
        if (typeof entry.watchedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(entry.watchedAt.trim())) {
          dateKey = entry.watchedAt.trim();
        } else {
          dateKey = getLocalDateString(entry.watchedAt);
        }
      }
      if (stats[dateKey] !== undefined) {
        stats[dateKey] += Math.round(entry.secondsWatched / 60); // convert to minutes
      }
    });

    res.json({ success: true, stats });
  } catch (err) {
    console.error("⚠️ Error fetching weekly stats:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


router.get("/dashboard", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const streak = updateUserStreak(user);
    await saveUserWithRetry(user);

    res.json({
      success: true,
      coins: user.coins,
      videosWatched: user.videosWatched,
      videosSwitched: user.videosSwitched,
      streak: streak,
      history: user.history.slice(-5).reverse(), // last 5 sessions
    });
  } catch (err) {
    console.error("⚠️ Error fetching dashboard:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 📅 Get 30-day activity for dashboard
router.get("/monthly-activity", protect, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(404).json({ message: "User not found" });

    // Group by date
    const activity = {};
    user.history.forEach((session) => {
      let date = "";
      if (session.watchedAt) {
        if (typeof session.watchedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(session.watchedAt.trim())) {
          date = session.watchedAt.trim();
        } else {
          date = getLocalDateString(session.watchedAt);
        }
      }
      if (!date) return;
      if (!activity[date]) activity[date] = { totalSeconds: 0 };
      activity[date].totalSeconds += session.secondsWatched || 0;
    });

    res.json({ success: true, activity });
  } catch (err) {
    console.error("⚠️ Error fetching monthly activity:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ Save or update notes & tags for a specific video
router.post("/save-note-tag", protect, async (req, res) => {
  try {
    const { videoId, noteText, tagText } = req.body;
    const user = await User.findById(req.user._id);

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    if (!videoId)
      return res
        .status(400)
        .json({ success: false, message: "Missing videoId" });

    // Ensure proper Object initialization
    if (!user.notes) user.notes = {};
    if (!user.tags) user.tags = {};

    // ✅ Save note & tag
    if (noteText !== undefined) user.notes[videoId] = noteText;
    if (tagText !== undefined) user.tags[videoId] = tagText;

    // ✅ Crucial for Object persistence in Mongoose
    user.markModified("notes");
    user.markModified("tags");

    // ✅ Update ALL existing history entries for this video for consistency
    let entryFound = false;
    user.history.forEach((h) => {
      if (h.videoId === videoId) {
        if (noteText !== undefined) h.note = noteText;
        if (tagText !== undefined) h.tag = tagText;
        entryFound = true;
      }
    });

    if (!entryFound && (noteText || tagText)) {
      user.history.unshift({
        videoId,
        url: `https://youtu.be/${videoId}`,
        secondsWatched: 0,
        tabSwitches: 0,
        watchedAt: getLocalDateString(),
        note: noteText || "",
        tag: tagText || "",
      });
    }

    user.markModified("history");
    await saveUserWithRetry(user);

    // Return clean objects for frontend
    res.json({
      success: true,
      message: "Notes and tags saved successfully!",
      notes: user.notes,
      tags: user.tags,
      history: user.history,
    });
  } catch (err) {
    console.error("❌ Error saving note/tag:", err);
    res
      .status(500)
      .json({ success: false, message: err?.message || "Server error" });
  }
});

// ✅ Fetch notes + tags
router.get("/notes-tags", protect, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      success: true,
      notes: user.notes || {},
      tags: user.tags || {},
    });
  } catch (err) {
    console.error("⚠️ Error fetching notes/tags:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ Helper: Parse CSV focus logs from detector/focus_logs if available
const getLatestCsvStats = () => {
  const dirs = [
    "./detector/focus_logs",
    "./backend/detector/focus_logs",
    "./focus_logs",
    "../backend/detector/focus_logs",
  ];
  for (const d of dirs) {
    try {
      if (fs.existsSync(d)) {
        const files = fs.readdirSync(d).filter((f) => f.endsWith(".csv")).sort();
        if (files.length > 0) {
          const latestFile = path.join(d, files[files.length - 1]);
          const content = fs.readFileSync(latestFile, "utf-8");
          const lines = content.trim().split("\n").slice(1);
          if (lines.length > 0) {
            let total = 0;
            let focused = 0;
            let phoneEvents = 0;
            let lookAwayEvents = 0;
            let faceAnomalies = 0;
            let scoreSum = 0;
            for (const line of lines) {
              const parts = line.split(",");
              if (parts.length >= 6) {
                total += 1;
                const status = parts[1] || "";
                const faces = Number(parts[3]) || 0;
                const phone = Number(parts[4]) || 0;
                const score = Number(parts[5]) || 0;
                scoreSum += score;
                if (status.startsWith("Focused")) focused += 1;
                if (phone === 1 || status.includes("Phone Detected")) phoneEvents += 1;
                if (status.includes("Looking Away")) lookAwayEvents += 1;
                if (status.includes("Multiple/No Face") || faces !== 1) faceAnomalies += 1;
              }
            }
            if (total > 0) {
              const focusPct = Math.round((focused / total) * 100);
              const avgScore = Math.round(scoreSum / total);
              const penalty = (phoneEvents * 20) + (lookAwayEvents * 10) + (faceAnomalies * 10);
              const calculated = Math.max(0, Math.min(100, Math.min(focusPct, avgScore, 100 - penalty)));
              return { total, focused, phoneEvents, lookAwayEvents, faceAnomalies, calculated };
            }
          }
        }
      }
    } catch (e) {
      // Ignore directory read errors
    }
  }
  return null;
};

// ✅ POST /sync-monitoring - Sync full monitoring analytics stats from frontend / detector
router.post("/sync-monitoring", protect, async (req, res) => {
  try {
    const {
      focusScore,
      allTimeFocusScore,
      phoneDetections = 0,
      lookAwayEvents = 0,
      faceAnomalies = 0,
      totalRecords = 0,
      focusedRecords = 0,
    } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Derive score: prioritize all-time overall score from analytics dashboard if provided
    let calculatedScore = 100;
    if (allTimeFocusScore !== undefined && allTimeFocusScore !== null && !isNaN(Number(allTimeFocusScore))) {
      calculatedScore = Math.max(0, Math.min(100, Number(allTimeFocusScore)));
    } else if (typeof focusScore === "number" && !isNaN(focusScore)) {
      calculatedScore = Math.max(0, Math.min(100, Math.round(focusScore)));
    } else if (totalRecords > 0) {
      calculatedScore = Math.round((focusedRecords / totalRecords) * 100);
    }

    // Distraction penalties: phone detection, look away, no/multiple face
    const penalties = (Number(phoneDetections) * 20) + (Number(lookAwayEvents) * 10) + (Number(faceAnomalies) * 10);
    if (penalties > 0 && (allTimeFocusScore === undefined || allTimeFocusScore === null)) {
      calculatedScore = Math.min(calculatedScore, Math.max(0, 100 - penalties));
    }

    user.focusScore = calculatedScore;
    user.monitoringStats = {
      phoneDetections: Number(phoneDetections),
      lookAwayEvents: Number(lookAwayEvents),
      faceAnomalyEvents: Number(faceAnomalies),
      totalRecords: Number(totalRecords),
      focusedRecords: Number(focusedRecords),
      allTimeFocusScore: calculatedScore,
      lastSyncedAt: new Date(),
    };

    user.markModified("monitoringStats");
    user.markModified("focusScore");
    await saveUserWithRetry(user);

    res.json({
      success: true,
      focusScore: user.focusScore,
      monitoringStats: user.monitoringStats,
    });
  } catch (err) {
    console.error("Error in /sync-monitoring:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ POST /focus-score - Sync live camera monitoring focus score to User
router.post("/focus-score", protect, async (req, res) => {
  try {
    const { focusScore, phoneDetected, lookAway, faceAnomaly } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (focusScore !== undefined) {
      let score = Math.max(0, Math.min(100, Math.round(Number(focusScore))));
      if (phoneDetected) {
        // Immediate deduction if phone detected
        score = Math.min(score, Math.max(0, (user.focusScore !== undefined ? user.focusScore : 100) - 25));
      }
      user.focusScore = score;
      if (!user.monitoringStats) {
        user.monitoringStats = {
          phoneDetections: 0,
          lookAwayEvents: 0,
          faceAnomalyEvents: 0,
          totalRecords: 0,
          focusedRecords: 0,
        };
      }
      if (phoneDetected) {
        user.monitoringStats.phoneDetections = (user.monitoringStats.phoneDetections || 0) + 1;
      }
      if (lookAway) {
        user.monitoringStats.lookAwayEvents = (user.monitoringStats.lookAwayEvents || 0) + 1;
      }
      if (faceAnomaly) {
        user.monitoringStats.faceAnomalyEvents = (user.monitoringStats.faceAnomalyEvents || 0) + 1;
      }
      user.markModified("monitoringStats");
      user.markModified("focusScore");
      await saveUserWithRetry(user);
    }
    res.json({ success: true, focusScore: user.focusScore });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ GET Leaderboard - Real users ranked by Leaderboard Score:
// Formula: Leaderboard Score = AFS_all_time × (1 - TS_day / (TS_day + K)) + 10 × min(VW_day / 20, 1)
router.get("/leaderboard", async (req, res) => {
  try {
    const targetDate = req.query.date ? String(req.query.date).trim() : getLocalDateString();

    const users = await User.find(
      {},
      "name email coins videosWatched videosSwitched streak history focusScore monitoringStats createdAt"
    ).lean();

    // Extract all unique dates from users' history for the date selector
    const dateSet = new Set();
    dateSet.add(getLocalDateString()); // always include today

    users.forEach((u) => {
      if (Array.isArray(u.history)) {
        u.history.forEach((h) => {
          const dKey = getLocalDateKey(h.watchedAt);
          if (dKey) dateSet.add(dKey);
        });
      }
    });
    const availableDates = Array.from(dateSet).sort().reverse();

    const leaderboard = users.map((u) => {
      // 1. AFS_all_time: user's all-time historical focus score up to evaluated date
      let afs = 100;
      if (typeof u.focusScore === "number" && !isNaN(u.focusScore)) {
        afs = u.focusScore;
      } else if (u.monitoringStats && typeof u.monitoringStats.allTimeFocusScore === "number") {
        afs = u.monitoringStats.allTimeFocusScore;
      }

      // 2. Daily Isolation: Query/retrieve ONLY targetDate's data for TS_day and VW_day
      let TS_day = 0;
      let VW_day = 0;

      if (Array.isArray(u.history)) {
        u.history.forEach((h) => {
          const entryDate = getLocalDateKey(h.watchedAt);
          if (entryDate === targetDate) {
            VW_day += 1;
            TS_day += Number(h.tabSwitches || 0);
          }
        });
      }

      // 3. Compute score via separate reusable formula service
      const scoreResult = calculateLeaderboardScore(afs, TS_day, VW_day, LEADERBOARD_CONFIG.K);

      const coins = u.coins ?? 50;

      return {
        _id: u._id,
        name: u.name || "Student",
        email: u.email,
        coins,
        videos: VW_day, // daily videos watched (VW_day)
        tabs: TS_day,   // daily tab switches (TS_day)
        streak: u.streak || 0,
        focusScore: scoreResult.score, // Leaderboard Score (e.g. 64.17)
        scoreString: scoreResult.scoreString,
        afsAllTime: scoreResult.afsAllTime, // All-Time Focus Score rounded to 2 decimal places
        focusComponent: scoreResult.focusComponent,
        videoBonus: scoreResult.videoBonus,
        k: scoreResult.k,
      };
    });

    // Sort descending by Leaderboard Score, then coins, then daily videos
    leaderboard.sort((a, b) => {
      if (b.focusScore !== a.focusScore) {
        return b.focusScore - a.focusScore;
      }
      if (b.coins !== a.coins) {
        return b.coins - a.coins;
      }
      return b.videos - a.videos;
    });

    res.json({
      success: true,
      date: targetDate,
      availableDates,
      students: leaderboard,
    });
  } catch (err) {
    console.error("⚠️ Error fetching leaderboard:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

