import React, { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { useAppContext } from "../context/AppContext";
import Navbar from "./Navbar";
import PageIntroCard from "./PageIntroCard";
import API_BASE from "../services/apiBase";
import evaluationDateIcon from "../assets/icons/evaluation date.png";
import coinIcon from "../assets/icons/coin.png";
import videosIcon from "../assets/icons/videos.png";
import { getAllMonitoringLogs } from "../services/monitoringDB";
import {
  calculateLeaderboardScore,
  LEADERBOARD_CONFIG,
} from "../services/leaderboardScore";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const getTodayDateStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const Leaderboard = () => {
  const todayStr = getTodayDateStr();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [availableDates, setAvailableDates] = useState([todayStr]);
  const { theme, appState } = useAppContext();
  const isDark = theme === "dark";

  const currentUserId = appState?.user?._id || appState?.user?.id;
  const currentUserEmail = appState?.user?.email;

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");

        // 1. Read local monitoring analytics data (IndexedDB)
        // AFS_all_time = user's Average Focus Score calculated from all focus records up to current date
        let localAfsAllTime = null;
        try {
          const logs = await getAllMonitoringLogs();
          if (logs && logs.length > 0) {
            const validLogs = logs.filter(
              (l) => l.focus_score !== undefined && l.focus_score !== null && !isNaN(Number(l.focus_score))
            );
            if (validLogs.length > 0) {
              const totalScore = validLogs.reduce((sum, l) => sum + Number(l.focus_score), 0);
              localAfsAllTime = Number((totalScore / validLogs.length).toFixed(2));
            } else {
              localAfsAllTime = 0;
            }
          } else {
            localAfsAllTime = 0;
          }

          // Sync to backend so MongoDB is updated with user's all-time focus score
          if (token && localAfsAllTime !== null) {
            await fetch(`${API_BASE}/api/tracking/sync-monitoring`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              credentials: "include",
              body: JSON.stringify({
                allTimeFocusScore: localAfsAllTime,
                focusScore: localAfsAllTime,
              }),
            });
          }
        } catch (e) {
          console.warn("Local monitoring read note:", e);
        }

        // 2. Fetch all real users from backend for selectedDate
        const queryDate = selectedDate || todayStr;
        const res = await fetch(`${API_BASE}/api/tracking/leaderboard?date=${encodeURIComponent(queryDate)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          credentials: "include",
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.students)) {
          if (Array.isArray(data.availableDates) && data.availableDates.length > 0) {
            setAvailableDates(data.availableDates);
          }
          let list = [...data.students];

          // If local user has computed AFS from analytics dashboard, update their score with the exact formula
          if (localAfsAllTime !== null) {
            const idx = list.findIndex(
              (s) =>
                (currentUserId && String(s._id) === String(currentUserId)) ||
                (currentUserEmail && s.email === currentUserEmail)
            );
            if (idx !== -1) {
              const currentUserEntry = list[idx];
              const recalculated = calculateLeaderboardScore(
                localAfsAllTime,
                currentUserEntry.tabs || 0, // TS_day: only selected day's tab switches
                currentUserEntry.videos || 0, // VW_day: only selected day's videos
                LEADERBOARD_CONFIG.K
              );
              list[idx] = {
                ...currentUserEntry,
                afsAllTime: recalculated.afsAllTime,
                focusScore: recalculated.score,
                scoreString: recalculated.scoreString,
                focusComponent: recalculated.focusComponent,
                videoBonus: recalculated.videoBonus,
              };
            }
          }

          // Re-sort descending by Leaderboard Score, then coins, then daily videos
          list.sort((a, b) => {
            if (b.focusScore !== a.focusScore) return b.focusScore - a.focusScore;
            if (b.coins !== a.coins) return b.coins - a.coins;
            return b.videos - a.videos;
          });
          setStudents(list);
        }
      } catch (err) {
        console.error("Failed to load real users leaderboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [selectedDate, currentUserId, currentUserEmail, todayStr]);

  const top10 = students.slice(0, 10);

  const chartData = {
    labels: top10.map((s) => s.name),
    datasets: [
      {
        label: "Leaderboard Score",
        data: top10.map((s) => s.focusScore),
        backgroundColor: isDark ? "rgba(168, 85, 247, 0.75)" : "#1b3f30",
        borderRadius: 8,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: `Top 10 Students (${selectedDate === todayStr ? "Today" : selectedDate})`,
        color: isDark ? "#e2e8f0" : "#1e293b",
        font: { size: 16, weight: "bold" },
      },
      tooltip: {
        backgroundColor: isDark ? "rgba(15, 23, 42, 0.9)" : "rgba(255, 255, 255, 0.9)",
        titleColor: isDark ? "#fff" : "#0f172a",
        bodyColor: isDark ? "#cbd5e1" : "#334155",
        borderColor: isDark ? "rgba(168,85,247,0.3)" : "rgba(0,0,0,0.1)",
        borderWidth: 1,
        callbacks: {
          label: (ctx) => {
            const student = top10[ctx.dataIndex];
            return [
              `Score: ${student.scoreString || Number(student.focusScore).toFixed(2)}`,
              `All-Time AFS: ${Number(student.afsAllTime ?? student.focusScore).toFixed(2)}`,
              `Focus Comp: ${student.focusComponent ?? "-"} | Video Bonus: ${student.videoBonus ?? "-"}`,
            ];
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { color: isDark ? "#94a3b8" : "#64748b" },
        grid: { color: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" },
      },
      x: {
        ticks: { color: isDark ? "#94a3b8" : "#64748b" },
        grid: { display: false },
      },
    },
  };

  return (
    <div className={`min-h-screen relative z-10 font-sans transition-colors duration-500 ${isDark ? "text-white" : "text-slate-800"}`}>
      {/* Unified Navbar with ThemeToggle */}
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        {/* Page Introduction Card */}
        <PageIntroCard className="mb-8" />

        {/* Date Selector & Formula Badge Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-10 p-4 rounded-2xl border backdrop-blur-xl transition-all duration-300 shadow-md ${
          isDark ? 'bg-slate-900/60 border-purple-500/20' : 'bg-[#fbf9f3] border-[#eee8de]'
        }">
          <div className="flex items-center gap-3">
            <span className={`text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDark ? "text-purple-300" : "text-slate-700"}`}>
              <img src={evaluationDateIcon} alt="Evaluation Date" className="w-4 h-4 object-contain inline-block select-none" />
              <span>Evaluation Date:</span>
            </span>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold border cursor-pointer transition ${
                isDark
                  ? "bg-slate-800 border-purple-500/40 text-purple-200 focus:outline-none focus:border-purple-400"
                  : "bg-white border-slate-300 text-slate-800 shadow-sm focus:outline-none focus:border-emerald-600"
              }`}
            >
              {availableDates.map((d) => (
                <option key={d} value={d} className={isDark ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>
                  {d} {d === todayStr ? "(Today)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className={`text-[11px] sm:text-xs px-3.5 py-1.5 rounded-xl border font-mono font-medium ${
            isDark ? "bg-slate-800/80 border-purple-500/30 text-purple-300" : "bg-white border-slate-200 text-slate-700 shadow-sm"
          }`}>
            Score = AFS_all_time × (1 - TS / (TS + {LEADERBOARD_CONFIG.K})) + 10 × min(VW / 20, 1)
          </div>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1b3f30] dark:border-purple-500"></div>
          </div>
        )}

        {/* Empty State */}
        {!loading && students.length === 0 && (
          <div className={`text-center py-16 px-6 rounded-3xl backdrop-blur-2xl border max-w-lg mx-auto ${
            isDark ? "bg-slate-900/70 border-purple-500/20 text-slate-300" : "bg-[#fbf9f3] border-[#eee8de] text-slate-600 shadow-md"
          }`}>
            <span className="text-5xl mb-4 block">🎓</span>
            <h3 className="text-xl font-bold mb-2">No Students Found</h3>
            <p className="text-sm">Register students and watch study lessons to see live ranking on the leaderboard.</p>
          </div>
        )}

        {/* TOP 3 PODIUM CARDS */}
        {!loading && students.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {students.slice(0, 3).map((s, i) => {
              const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉";
              const borderGlow =
                i === 0
                  ? "border-amber-400/60 shadow-amber-500/20"
                  : i === 1
                  ? "border-slate-300/60 shadow-slate-400/20"
                  : "border-amber-700/60 shadow-amber-800/20";

              return (
                <div
                  key={s._id || i}
                  className={`p-6 rounded-3xl backdrop-blur-2xl border transition-all duration-300 hover:scale-[1.03] relative overflow-hidden shadow-xl ${borderGlow} ${
                    isDark
                      ? "bg-slate-900/80 text-white"
                      : "bg-[#fbf9f3] border-[#eee8de] text-slate-800 shadow-[0_10px_35px_rgba(0,0,0,0.04)]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl">{medal}</span>
                    <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                      i === 0
                        ? "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                        : i === 1
                        ? "bg-slate-400/20 text-slate-400 border border-slate-400/30"
                        : "bg-amber-700/20 text-amber-700 border border-amber-700/30"
                    }`}>
                      Rank #{i + 1}
                    </span>
                  </div>

                  <h2 className={`text-xl font-extrabold mb-4 truncate ${isDark ? "text-purple-200" : "text-slate-900"}`}>{s.name}</h2>

                  <div className={`grid grid-cols-3 gap-2 p-3 rounded-2xl ${
                    isDark ? "bg-slate-800/60 border border-white/5" : "bg-white/60 border border-slate-200/60 shadow-inner"
                  }`}>
                    <div className="text-center">
                      <div className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Coins</div>
                      <div className="text-base font-black text-amber-500 flex items-center justify-center gap-1">
                        <img src={coinIcon} alt="Coins" className="w-4 h-4 object-contain inline-block select-none" />
                        <span>{s.coins}</span>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Videos</div>
                      <div className="text-base font-black flex items-center justify-center gap-1">
                        <img src={videosIcon} alt="Videos" className="w-4 h-4 object-contain inline-block select-none" />
                        <span>{s.videos}</span>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Score</div>
                      <div className={`text-base font-black ${isDark ? "text-purple-400" : "text-[#1b3f30]"}`}>
                        {s.scoreString || Number(s.focusScore).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        AFS: {Number(s.afsAllTime ?? s.focusScore).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* CHART */}
        {!loading && top10.length > 0 && (
          <div className={`p-6 rounded-3xl backdrop-blur-2xl shadow-xl mb-12 border transition-all duration-300 ${
            isDark
              ? "bg-slate-900/80 border-purple-500/20 text-white shadow-2xl"
              : "bg-[#fbf9f3] border-[#eee8de] shadow-[0_10px_35px_rgba(0,0,0,0.04)] text-slate-800"
          }`}>
            <div className="h-72">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>
        )}

        {/* FULL LEADERBOARD TABLE */}
        {!loading && students.length > 0 && (
          <div className={`rounded-3xl backdrop-blur-2xl shadow-xl border overflow-hidden transition-all duration-300 ${
            isDark
              ? "bg-slate-900/80 border-purple-500/20 text-white shadow-2xl"
              : "bg-[#fbf9f3] border-[#eee8de] shadow-[0_10px_35px_rgba(0,0,0,0.04)] text-slate-800"
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`border-b text-xs uppercase tracking-wider font-bold ${
                    isDark
                      ? "bg-slate-800/60 border-purple-500/20 text-purple-300"
                      : "bg-[#f4efe4] border-[#eee8de] text-slate-700"
                  }`}>
                    <th className="py-4 px-6">Rank</th>
                    <th className="py-4 px-6">Student Name</th>
                    <th className="py-4 px-6">Coins</th>
                    <th className="py-4 px-6">Videos</th>
                    <th className="py-4 px-6">Tab Switches</th>
                    <th className="py-4 px-6">Focus Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5 text-sm font-medium">
                  {students.map((s, i) => (
                    <tr
                      key={s._id || i}
                      className={`transition-colors ${
                        isDark ? "hover:bg-slate-800/40" : "hover:bg-[#f5efe2]/70"
                      }`}
                    >
                      <td className="py-4 px-6 font-bold">
                        {i === 0 ? "🥇 1" : i === 1 ? "🥈 2" : i === 2 ? "🥉 3" : `#${i + 1}`}
                      </td>
                      <td className={`py-4 px-6 font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{s.name}</td>
                      <td className="py-4 px-6 text-amber-500 font-bold">
                        <span className="inline-flex items-center gap-1">
                          <img src={coinIcon} alt="Coins" className="w-4 h-4 object-contain inline-block select-none" />
                          <span>{s.coins}</span>
                        </span>
                      </td>
                      <td className="py-4 px-6 font-semibold">{s.videos}</td>
                      <td className="py-4 px-6 text-rose-500 font-semibold">{s.tabs}</td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                          <div className="flex items-center gap-2">
                            <span className={`font-extrabold text-base min-w-[55px] ${isDark ? "text-purple-400" : "text-[#1b3f30]"}`}>
                              {s.scoreString || Number(s.focusScore).toFixed(2)}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                                isDark
                                  ? "bg-purple-950/40 text-purple-300 border-purple-500/30"
                                  : "bg-emerald-50 text-emerald-800 border-emerald-200"
                              }`}
                              title="User's All-Time Focus Score (Analytics Dashboard)"
                            >
                              AFS: {Number(s.afsAllTime ?? s.focusScore).toFixed(2)}
                            </span>
                          </div>
                          <div className={`h-2.5 flex-1 max-w-[130px] rounded-full overflow-hidden ${isDark ? "bg-slate-700" : "bg-[#ded6c5]"}`}>
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${isDark ? "bg-gradient-to-r from-purple-500 to-pink-500" : "bg-[#1b3f30]"}`}
                              style={{ width: `${Math.min(100, Math.max(0, s.focusScore))}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <footer className={`py-8 text-center text-sm font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
        © {new Date().getFullYear()} StudyBuddy • Built for better learning 🔥
      </footer>
    </div>
  );
};

export default Leaderboard;
