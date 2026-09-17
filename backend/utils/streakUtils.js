import User from "../models/User.js";

export const getLocalDateString = (date = new Date()) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getLocalDateKey = (watchedAt) => {
  if (!watchedAt) return "";
  if (typeof watchedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(watchedAt.trim())) {
    return watchedAt.trim();
  }
  return getLocalDateString(watchedAt);
};

export const calculateStreak = (history = [], lastDayWatched = null) => {
  const today = getLocalDateString(new Date());

  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = getLocalDateString(yesterdayDate);

  const studyDatesSet = new Set();

  if (Array.isArray(history)) {
    history.forEach((entry) => {
      const dateKey = getLocalDateKey(entry.watchedAt);
      if (dateKey && (entry.secondsWatched === undefined || entry.secondsWatched > 0 || entry.seconds > 0)) {
        studyDatesSet.add(dateKey);
      }
    });
  }

  if (lastDayWatched && /^\d{4}-\d{2}-\d{2}$/.test(String(lastDayWatched).trim())) {
    studyDatesSet.add(String(lastDayWatched).trim());
  }

  const sortedDates = Array.from(studyDatesSet).sort().reverse(); // descending

  if (sortedDates.length === 0) return 0;

  const latestDateStr = sortedDates[0];

  // If the latest study date is neither today nor yesterday, active streak is broken (0).
  if (latestDateStr !== today && latestDateStr !== yesterday) {
    return 0;
  }

  let currentStreak = 0;
  let checkDate = new Date(latestDateStr);

  while (true) {
    const checkStr = getLocalDateString(checkDate);
    if (studyDatesSet.has(checkStr)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return currentStreak;
};

export const updateUserStreak = (user) => {
  if (!user) return 0;
  const newStreak = calculateStreak(user.history || [], user.lastDayWatched);
  user.streak = newStreak;
  return newStreak;
};

export const saveUserWithRetry = async (user, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await user.save();
    } catch (err) {
      if (err.name === "VersionError" && i < maxRetries - 1) {
        console.warn(`⚠️ VersionError on save user ${user._id}, retrying attempt ${i + 1}...`);
        const freshUser = await User.findById(user._id);
        if (!freshUser) throw err;

        if (user.history) freshUser.history = user.history;
        if (user.coins !== undefined) freshUser.coins = user.coins;
        if (user.videosWatched !== undefined) freshUser.videosWatched = user.videosWatched;
        if (user.videosSwitched !== undefined) freshUser.videosSwitched = user.videosSwitched;
        if (user.streak !== undefined) freshUser.streak = user.streak;
        if (user.lastDayWatched) freshUser.lastDayWatched = user.lastDayWatched;
        if (user.notes) freshUser.notes = user.notes;
        if (user.tags) freshUser.tags = user.tags;

        freshUser.markModified("history");
        freshUser.markModified("notes");
        freshUser.markModified("tags");
        user = freshUser;
      } else {
        throw err;
      }
    }
  }
};
