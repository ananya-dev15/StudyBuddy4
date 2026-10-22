import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import API_BASE from "../services/apiBase";
import Navbar from "../components/Navbar";
import PageIntroCard from "../components/PageIntroCard";
import { eachDayOfInterval, format, startOfMonth, endOfMonth } from "date-fns";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Helper: Get local date string in YYYY-MM-DD format (respects timezone)
const getLocalDateString = (date = new Date()) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const Dashboard = () => {
  const { appState, theme } = useAppContext();
  const isDark = theme === "dark";
  const storedUser = JSON.parse(localStorage.getItem("user")) || null;
  const [user, setUser] = useState(appState?.user || storedUser);
  const userId = user?._id || user?.id || null;
  const { coins = 0, streak = 0, history = [], videosWatched = 0, videosSwitched = 0 } =
    appState || {};

  const [monthlyActivity, setMonthlyActivity] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // ─── Heatmap state ───
  const [heatmapMonth, setHeatmapMonth] = useState(new Date().getMonth());
  const [heatmapYear, setHeatmapYear] = useState(new Date().getFullYear());

  // ─── Weekly Duration Card state ───
  const [weeklySelectedMonth, setWeeklySelectedMonth] = useState(new Date().getMonth());
  const [weeklySelectedYear, setWeeklySelectedYear] = useState(new Date().getFullYear());

  // ✅ Fetch monthly activity
  const fetchMonthlyActivity = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch(`${API_BASE}/api/tracking/monthly-activity`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });

      const data = await res.json();
      if (data.success && data.activity) {
        setMonthlyActivity(data.activity);
        localStorage.setItem("monthlyActivity", JSON.stringify(data.activity));
      }
    } catch (err) {
      console.error("Error fetching monthly activity:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cached = localStorage.getItem("monthlyActivity");
    if (cached) setMonthlyActivity(JSON.parse(cached));
    fetchMonthlyActivity();
  }, []);

  // ─── Heatmap Activity (unified daily activity) ───
  const heatmapActivity = useMemo(() => {
    const act = {};
    const historyList = (history && history.length > 0)
      ? history
      : JSON.parse(localStorage.getItem(`userHistory_${userId}`)) || [];

    if (historyList.length > 0) {
      historyList.forEach((h) => {
        let dayKey = "";
        if (h.watchedAt) {
          if (typeof h.watchedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(h.watchedAt.trim())) {
            dayKey = h.watchedAt.trim();
          } else if (typeof h.watchedAt === "string" && h.watchedAt.includes("T")) {
            dayKey = h.watchedAt.split("T")[0];
          } else {
            dayKey = getLocalDateString(h.watchedAt);
          }
        }
        if (!dayKey) return;
        if (!act[dayKey]) act[dayKey] = { totalSeconds: 0 };
        act[dayKey].totalSeconds += Number(h.seconds ?? h.secondsWatched ?? 0) || 0;
      });
    }

    try {
      const cached = JSON.parse(localStorage.getItem("monthlyActivity") || "{}");
      if (cached && Object.keys(cached).length > 0) {
        Object.keys(cached).forEach((key) => {
          if (!act[key]) act[key] = { totalSeconds: cached[key]?.totalSeconds || 0 };
          else if (cached[key]?.totalSeconds > act[key].totalSeconds) {
            act[key].totalSeconds = cached[key].totalSeconds;
          }
        });
      }
    } catch (e) {
      // ignore
    }

    return act;
  }, [history, userId]);

  // ─── Card 1: Total tab switches throughout ───
  const totalTabSwitchesAllTime = useMemo(() => {
    const historyList = (history && history.length > 0)
      ? history
      : JSON.parse(localStorage.getItem(`userHistory_${userId}`)) || [];

    let sum = 0;
    historyList.forEach((h) => {
      sum += Number(h.tabSwitches || h.totalTabSwitches || 0);
    });
    const userSwitches = Number(videosSwitched ?? appState.user?.videosSwitched ?? 0);
    return Math.max(sum, userSwitches);
  }, [history, videosSwitched, appState.user?.videosSwitched, userId]);

  // ─── Card 2: Total tab switches today ───
  const totalTabSwitchesToday = useMemo(() => {
    const todayStr = getLocalDateString(new Date());
    const historyList = (history && history.length > 0)
      ? history
      : JSON.parse(localStorage.getItem(`userHistory_${userId}`)) || [];

    let todaySum = 0;
    historyList.forEach((h) => {
      let itemDate = "";
      if (h.watchedAt) {
        if (typeof h.watchedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(h.watchedAt.trim())) {
          itemDate = h.watchedAt.trim();
        } else if (typeof h.watchedAt === "string" && h.watchedAt.includes("T")) {
          itemDate = h.watchedAt.split("T")[0];
        } else {
          itemDate = getLocalDateString(h.watchedAt);
        }
      }
      if (itemDate === todayStr) {
        todaySum += Number(h.tabSwitches || h.totalTabSwitches || 0);
      }
    });
    return todaySum;
  }, [history, userId]);

  // ─── Card 3: Total videos watched ───
  const totalVideosWatchedCount = useMemo(() => {
    const historyList = (history && history.length > 0)
      ? history
      : JSON.parse(localStorage.getItem(`userHistory_${userId}`)) || [];

    const uniqueIds = new Set();
    historyList.forEach((h) => {
      if (h.videoId || h.url) {
        uniqueIds.add(h.videoId || h.url);
      }
    });
    const userVideos = Number(videosWatched ?? appState.user?.videosWatched ?? 0);
    return Math.max(uniqueIds.size, historyList.length, userVideos);
  }, [history, videosWatched, appState.user?.videosWatched, userId]);

  // ─── Card 4: Maximum streak achieved so far ───
  const maxStreakAchieved = useMemo(() => {
    const currentStreak = Number(streak ?? appState.user?.streak ?? 0);
    const historyList = (history && history.length > 0)
      ? history
      : JSON.parse(localStorage.getItem(`userHistory_${userId}`)) || [];

    const uniqueDates = Array.from(new Set(
      historyList.map((h) => {
        if (!h.watchedAt) return "";
        if (typeof h.watchedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(h.watchedAt.trim())) {
          return h.watchedAt.trim();
        }
        if (typeof h.watchedAt === "string" && h.watchedAt.includes("T")) {
          return h.watchedAt.split("T")[0];
        }
        return getLocalDateString(h.watchedAt);
      }).filter(Boolean)
    )).sort();

    let longestRun = 0;
    let currentRun = 0;
    let prevDate = null;

    uniqueDates.forEach((dStr) => {
      const curDate = new Date(dStr + "T00:00:00");
      if (prevDate) {
        const diffDays = Math.round((curDate - prevDate) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          currentRun += 1;
        } else if (diffDays > 1) {
          currentRun = 1;
        }
      } else {
        currentRun = 1;
      }
      if (currentRun > longestRun) longestRun = currentRun;
      prevDate = curDate;
    });

    const storedMax = Number(localStorage.getItem(`maxStreak_${userId}`)) || 0;
    const finalMax = Math.max(currentStreak, longestRun, storedMax, 1);
    if (finalMax > storedMax && userId) {
      localStorage.setItem(`maxStreak_${userId}`, finalMax);
    }
    return finalMax;
  }, [streak, appState.user?.streak, history, userId]);

  // ─── Card 5: Current running week duration (Monday to Sunday) ───
  const currentWeekInfo = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diffToMon = (day === 0 ? -6 : 1) - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMon);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    let totalSec = 0;
    for (let d = new Date(monday); d <= sunday; d.setDate(d.getDate() + 1)) {
      const dKey = getLocalDateString(d);
      totalSec += heatmapActivity[dKey]?.totalSeconds || 0;
    }

    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const label = totalSec > 0 ? `${h > 0 ? `${h}h ` : ""}${m}m` : "0m";

    const monStr = monday.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const sunStr = sunday.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    return { totalSec, label, rangeStr: `${monStr} – ${sunStr}` };
  }, [heatmapActivity]);

  // ─── Weeks for the selected month in dropdown (Monday to Sunday) ───
  const weeksInSelectedMonth = useMemo(() => {
    const year = Number(weeklySelectedYear);
    const month = Number(weeklySelectedMonth);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const weeks = [];
    let currentDays = [];
    let weekIndex = 1;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month, day);
      const dayOfWeek = dateObj.getDay();
      currentDays.push(day);

      if (dayOfWeek === 0 || day === daysInMonth) {
        let weekTotalSec = 0;
        currentDays.forEach((d) => {
          const dKey = getLocalDateString(new Date(year, month, d));
          weekTotalSec += heatmapActivity[dKey]?.totalSeconds || 0;
        });

        const startD = currentDays[0];
        const endD = currentDays[currentDays.length - 1];
        const monthShort = MONTHS[month].slice(0, 3);
        const rangeStr = `${monthShort} ${startD} – ${monthShort} ${endD}`;

        const h = Math.floor(weekTotalSec / 3600);
        const m = Math.floor((weekTotalSec % 3600) / 60);
        const durationLabel = weekTotalSec > 0 ? `${h > 0 ? `${h}h ` : ""}${m}m` : "0m";

        weeks.push({
          weekNumber: weekIndex++,
          startDay: startD,
          endDay: endD,
          rangeStr,
          totalSeconds: weekTotalSec,
          durationLabel,
        });

        currentDays = [];
      }
    }

    return weeks;
  }, [weeklySelectedYear, weeklySelectedMonth, heatmapActivity]);

  // ─── Total duration for the selected month ───
  const selectedMonthTotalDuration = useMemo(() => {
    let totalSec = 0;
    weeksInSelectedMonth.forEach((w) => {
      totalSec += w.totalSeconds;
    });
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    return totalSec > 0 ? `${h > 0 ? `${h}h ` : ""}${m}m` : "0m";
  }, [weeksInSelectedMonth]);

  if (!user)
    return <p>Please log in to view your dashboard.</p>;
  if (loading)
    return (
      <p className="text-gray-500 text-center mt-10">
        Loading your dashboard...
      </p>
    );

  return (
    <div className={`min-h-screen font-sans relative z-10 transition-colors duration-500 ${isDark ? "text-white" : "text-slate-800"}`}>
      {/* Unified Navbar with Permanent ThemeToggle */}
      <Navbar />

      {/* Main Content */}
      <div className="px-6 md:px-10 py-10">
        {/* Page Introduction Card */}
        <PageIntroCard className="mb-6" />

        {/* ================= 4 KEY METRIC CARDS (Row 1) ================= */}
        <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5 mb-5">
          {/* Card 1: Total Tab Switches Throughout */}
          <div
            className={`rounded-3xl p-5 sm:p-6 flex flex-col justify-between transition-all duration-300 border shadow-xs hover:shadow-md hover:scale-[1.01] ${
              isDark
                ? "bg-[#161a20] border-gray-800/90 shadow-[0_8px_32px_rgba(0,0,0,0.35)] text-white"
                : "bg-[#fbf9f3] border-[#eee8de] shadow-[0_8px_30px_rgba(0,0,0,0.03)] text-gray-900"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs sm:text-sm font-bold tracking-tight uppercase opacity-75">
                Total Tab Switches
              </span>
              <span className="text-2xl select-none">🔁</span>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black tracking-tight text-purple-600 dark:text-purple-400">
                {totalTabSwitchesAllTime}
              </div>
              <p className={`text-[11px] sm:text-xs font-medium mt-1 m-0 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Throughout all study sessions
              </p>
            </div>
          </div>

          {/* Card 2: Total Tab Switches Today */}
          <div
            className={`rounded-3xl p-5 sm:p-6 flex flex-col justify-between transition-all duration-300 border shadow-xs hover:shadow-md hover:scale-[1.01] ${
              isDark
                ? "bg-[#161a20] border-gray-800/90 shadow-[0_8px_32px_rgba(0,0,0,0.35)] text-white"
                : "bg-[#fbf9f3] border-[#eee8de] shadow-[0_8px_30px_rgba(0,0,0,0.03)] text-gray-900"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs sm:text-sm font-bold tracking-tight uppercase opacity-75">
                Switches Today
              </span>
              <span className="text-2xl select-none">⚡</span>
            </div>
            <div>
              <div className={`text-2xl sm:text-3xl font-black tracking-tight ${
                totalTabSwitchesToday > 0
                  ? isDark ? "text-rose-400" : "text-rose-600"
                  : isDark ? "text-emerald-400" : "text-emerald-600"
              }`}>
                {totalTabSwitchesToday}
              </div>
              <p className={`text-[11px] sm:text-xs font-medium mt-1 m-0 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {totalTabSwitchesToday === 0 ? "Zero distractions today! 🎉" : "Distractions recorded today"}
              </p>
            </div>
          </div>

          {/* Card 3: Total Videos Watched */}
          <div
            className={`rounded-3xl p-5 sm:p-6 flex flex-col justify-between transition-all duration-300 border shadow-xs hover:shadow-md hover:scale-[1.01] ${
              isDark
                ? "bg-[#161a20] border-gray-800/90 shadow-[0_8px_32px_rgba(0,0,0,0.35)] text-white"
                : "bg-[#fbf9f3] border-[#eee8de] shadow-[0_8px_30px_rgba(0,0,0,0.03)] text-gray-900"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs sm:text-sm font-bold tracking-tight uppercase opacity-75">
                Videos Watched
              </span>
              <span className="text-2xl select-none">🎬</span>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black tracking-tight text-blue-600 dark:text-blue-400">
                {totalVideosWatchedCount}
              </div>
              <p className={`text-[11px] sm:text-xs font-medium mt-1 m-0 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Total lessons tracked &amp; completed
              </p>
            </div>
          </div>

          {/* Card 4: Maximum Streak So Far */}
          <div
            className={`rounded-3xl p-5 sm:p-6 flex flex-col justify-between transition-all duration-300 border shadow-xs hover:shadow-md hover:scale-[1.01] ${
              isDark
                ? "bg-[#161a20] border-gray-800/90 shadow-[0_8px_32px_rgba(0,0,0,0.35)] text-white"
                : "bg-[#fbf9f3] border-[#eee8de] shadow-[0_8px_30px_rgba(0,0,0,0.03)] text-gray-900"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs sm:text-sm font-bold tracking-tight uppercase opacity-75">
                Max Streak
              </span>
              <span className="text-2xl select-none">🏆</span>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black tracking-tight text-amber-500 dark:text-amber-400">
                {maxStreakAchieved} {maxStreakAchieved === 1 ? "day" : "days"}
              </div>
              <p className={`text-[11px] sm:text-xs font-medium mt-1 m-0 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                All-time highest streak record
              </p>
            </div>
          </div>
        </div>

        {/* ================= CARD 5: STUDY DURATION — WEEK WISE ================= */}
        <div
          className={`w-full rounded-3xl p-6 sm:p-7 border transition-all duration-300 mb-6 shadow-xs hover:shadow-md ${
            isDark
              ? "bg-[#161a20] border-gray-800/90 shadow-[0_8px_32px_rgba(0,0,0,0.35)] text-white"
              : "bg-[#fbf9f3] border-[#eee8de] shadow-[0_8px_30px_rgba(0,0,0,0.03)] text-gray-900"
          }`}
        >
          {/* Top: Header + Current running week info + Month dropdown */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl select-none">⏱️</span>
                <h3 className="text-lg sm:text-xl font-bold m-0 tracking-tight">
                  Study Duration — Week Wise
                </h3>
              </div>
              <p className={`text-xs m-0 mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Weekly breakdown (Monday to Sunday) and monthly duration overview
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Current running week highlight */}
              <div
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border text-xs font-semibold ${
                  isDark
                    ? "bg-purple-950/40 border-purple-500/30 text-purple-300"
                    : "bg-purple-50 border-purple-200 text-purple-900"
                }`}
                title={`Current week: ${currentWeekInfo.rangeStr}`}
              >
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                <span>Current Week ({currentWeekInfo.rangeStr}):</span>
                <span className="font-extrabold text-sm text-purple-600 dark:text-purple-300">
                  {currentWeekInfo.label}
                </span>
              </div>

              {/* Month & Year Dropdown Selector */}
              <div className="flex items-center gap-2">
                <select
                  value={weeklySelectedMonth}
                  onChange={(e) => setWeeklySelectedMonth(Number(e.target.value))}
                  className={`px-3 py-1.5 rounded-xl text-sm font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer border transition-colors ${
                    isDark
                      ? "bg-slate-800 text-purple-200 border-slate-700"
                      : "bg-white text-slate-800 border-slate-300"
                  }`}
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i} className={isDark ? "bg-slate-900 text-white" : "bg-white text-slate-800"}>
                      {m}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  value={weeklySelectedYear}
                  onChange={(e) => setWeeklySelectedYear(Number(e.target.value))}
                  className={`w-20 px-3 py-1.5 rounded-xl text-sm font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-purple-500 border transition-colors ${
                    isDark
                      ? "bg-slate-800 text-purple-200 border-slate-700"
                      : "bg-white text-slate-800 border-slate-300"
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Weeks Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 my-5">
            {weeksInSelectedMonth.map((w) => {
              const hasActivity = w.totalSeconds > 0;
              return (
                <div
                  key={w.weekNumber}
                  className={`p-4 rounded-2xl border transition-all ${
                    isDark
                      ? "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                      : "bg-white/80 border-slate-200/80 hover:border-slate-300 shadow-xs"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                      Week {w.weekNumber}
                    </span>
                    <span className={`text-[11px] font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      {w.rangeStr}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between mt-2">
                    <div className="text-xl sm:text-2xl font-extrabold tracking-tight">
                      {w.durationLabel}
                    </div>
                    {hasActivity && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                        Active
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-200/80 dark:bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (w.totalSeconds / (10 * 3600)) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom: Total Duration for Selected Month */}
          <div
            className={`flex flex-col sm:flex-row items-center justify-between p-4 rounded-2xl border text-sm font-semibold transition-colors ${
              isDark
                ? "bg-slate-900/80 border-slate-800 text-slate-200"
                : "bg-slate-50 border-slate-200/90 text-slate-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-base select-none">📊</span>
              <span>
                Total Duration for {MONTHS[weeklySelectedMonth]} {weeklySelectedYear}:
              </span>
            </div>
            <div className="text-base sm:text-lg font-black text-purple-600 dark:text-purple-400 mt-1 sm:mt-0">
              {selectedMonthTotalDuration}
            </div>
          </div>
        </div>

        {/* ================= STUDY ACTIVITY HEATMAP ================= */}
        <div
          className={`p-6 rounded-3xl backdrop-blur-2xl shadow-xl border transition-all duration-300 mb-8 ${
            isDark
              ? "bg-slate-900/80 border-purple-500/20 text-white shadow-2xl"
              : "bg-[#fdfbf7] border-[#eee8de] shadow-[0_10px_35px_rgba(0,0,0,0.04)] text-slate-800"
          }`}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
            <h2 className={`text-lg font-bold flex items-center gap-2 ${isDark ? "text-purple-300" : "text-slate-900"}`}>
              <span>🗓️</span> Study Activity — {MONTHS[heatmapMonth]} {heatmapYear}
            </h2>

            {/* Month & Year Selectors */}
            <div className="flex items-center gap-2">
              <select
                value={heatmapMonth}
                onChange={(e) => setHeatmapMonth(Number(e.target.value))}
                className={`px-3 py-1.5 rounded-xl text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer border transition-colors ${
                  isDark
                    ? "bg-slate-800/90 text-purple-200 border-purple-500/40"
                    : "bg-white/90 text-slate-800 border-slate-300"
                }`}
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i} className={isDark ? "bg-slate-900 text-white" : "bg-white text-slate-800"}>
                    {m}
                  </option>
                ))}
              </select>

              <input
                type="number"
                value={heatmapYear}
                onChange={(e) => setHeatmapYear(Number(e.target.value))}
                className={`w-20 px-3 py-1.5 rounded-xl text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 border transition-colors ${
                  isDark
                    ? "bg-slate-800/90 text-purple-200 border-purple-500/40"
                    : "bg-white/90 text-slate-800 border-slate-300"
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center">
            {eachDayOfInterval({
              start: startOfMonth(new Date(heatmapYear, heatmapMonth, 1)),
              end: endOfMonth(new Date(heatmapYear, heatmapMonth, 1)),
            }).map((day, i) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const totalSeconds = heatmapActivity[dateKey]?.totalSeconds || 0;
              const totalMins = totalSeconds / 60;
              const totalHours = totalMins / 60;

              let bgClass = isDark
                ? "bg-slate-800/60 text-slate-400 border border-white/5"
                : "bg-slate-100 text-slate-500 border border-slate-200/50";
              if (totalHours >= 9) bgClass = "bg-green-500 text-white font-bold shadow-md shadow-green-500/30";
              else if (totalHours >= 5) bgClass = "bg-yellow-400 text-slate-900 font-bold shadow-md shadow-yellow-400/30";
              else if (totalHours >= 2) bgClass = "bg-orange-500 text-white font-bold shadow-md shadow-orange-500/30";
              else if (totalMins >= 1) bgClass = "bg-rose-500 text-white font-bold shadow-md shadow-rose-500/30";

              const hrs = Math.floor(totalHours);
              const mins = Math.floor(totalMins % 60);
              const timeLabel =
                totalMins >= 1 ? `${hrs ? `${hrs}h ` : ""}${mins}m` : "";

              return (
                <div
                  key={i}
                  className={`p-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-transform hover:scale-105 ${bgClass}`}
                  title={`${timeLabel || "No activity"} on ${format(day, "MMM d")}`}
                >
                  <div>{format(day, "d")}</div>
                  {timeLabel && (
                    <div className="text-[10px] opacity-90 mt-0.5">{timeLabel}</div>
                  )}
                </div>
              );
            })}
          </div>

          <div className={`flex justify-around mt-6 text-sm font-medium flex-wrap gap-2 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded-full bg-rose-500 shadow-sm" /> <span>0–2 hrs</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded-full bg-orange-500 shadow-sm" /> <span>2–5 hrs</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded-full bg-yellow-400 shadow-sm" /> <span>5–9 hrs</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded-full bg-green-500 shadow-sm" /> <span>9+ hrs</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
