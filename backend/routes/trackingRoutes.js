// routes/trackingRoutes.js
import express from "express";
import User from "../models/User.js";
import protect from "../middlewares/authMiddleware.js";
// ✅ use JWT middleware

const router = express.Router();

// ✅ Helper: Get local date string in YYYY-MM-DD format (respects timezone)
const getLocalDateString = (date = new Date()) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Increment coins (userId comes from token)
router.post("/coins", protect, async (req, res) => {
  try {
    const { amount } = req.body;
    const user = req.user; // ✅ got from JWT
    if (!user) return res.status(404).json({ message: "User not found" });

    user.coins = (user.coins || 0) + (amount || 1);
    await user.save();
    res.json({ success: true, coins: user.coins });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Increment videos watched + maintain streak
// ✅ Increment videos watched + maintain streak
router.post("/videos-watched", protect, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(404).json({ message: "User not found" });

    const today = getLocalDateString();
    const lastWatchedDate = user.lastDayWatched; // now a String (YYYY-MM-DD or null)

    // ✅ Increment total videos watched
    user.videosWatched = (user.videosWatched || 0) + 1;

    if (!lastWatchedDate) {
      // First time studying
      user.streak = 1;
    } else if (lastWatchedDate === today) {
      // Already studied today - keep current streak
    } else {
      // Check if it's exactly the next day
      const lastDate = new Date(lastWatchedDate);
      const todayDate = new Date(today);
      const diffTime = Math.abs(todayDate - lastDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        user.streak = (user.streak || 0) + 1;
      } else {
        user.streak = 1;
      }
    }

    user.lastDayWatched = today;
    await user.save();

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
    const { loss = 1 } = req.body;
    const user = req.user;

    if (!user) return res.status(404).json({ message: "User not found" });

    user.coins = Math.max(0, (user.coins || 0) - loss); // never negative
    user.videosSwitched = (user.videosSwitched || 0) + 1;

    await user.save();

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

    res.json({
      success: true,
      coins: user.coins || 0,
      streak: user.streak || 0,
      videosWatched: user.videosWatched || 0,
      videosSwitched: user.videosSwitched || 0,
    });
  } catch (err) {
    console.error("Error fetching coins:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});



// ✅ Add video watch history (keeps last 5 days)
// router.post("/add-history", protect, async (req, res) => {
//   try {
//     const { videoId, url, secondsWatched, tabSwitches } = req.body;
//     const user = req.user;
//     if (!user) return res.status(404).json({ message: "User not found" });

//     // create history entry
//     const newEntry = {
//       videoId,
//       url,
//       secondsWatched: secondsWatched || 0,
//       tabSwitches: tabSwitches || 0,
//       watchedAt: new Date(),
//     };

//     // push new entry
//     user.history.push(newEntry);

//     // only keep last 5 entries
//     if (user.history.length > 5) {
//       user.history = user.history.slice(-5);
//     }

//     await user.save();

//     res.json({ success: true, history: user.history });
//   } catch (err) {
//     console.error("⚠️ Error adding history:", err);
//     res.status(500).json({ success: false, message: err.message });
//   }
// });


router.post("/add-history", protect, async (req, res) => {
  try {
    const { videoId, url, secondsWatched, tabSwitches, note, tag } = req.body;
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
      if (persistentNote) existing.note = persistentNote;
      if (persistentTag) existing.tag = persistentTag;

      // Move updated entry to top
      user.history.splice(existingIndex, 1);
      user.history.unshift(existing);
    } else {
      const newEntry = {
        videoId: targetId,
        url: url || `https://youtu.be/${targetId}`,
        secondsWatched: Math.round(secondsWatched),
        tabSwitches: tabSwitches || 0,
        watchedAt: todayStr,
        note: persistentNote,
        tag: persistentTag,
      };
      user.history.unshift(newEntry);
    }

    user.markModified("history");
    await user.save();
    res.json({ success: true, history: user.history });
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
    const user = req.user;
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      success: true,
      coins: user.coins,
      videosWatched: user.videosWatched,
      videosSwitched: user.videosSwitched,
      streak: user.streak,
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

    if (!entryFound) {
      // If no entry found (edge case), add one cleanly
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

    await user.save();

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
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

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




export default router;
