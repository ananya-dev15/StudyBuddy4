import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import profileIcon from '../assets/profile_icon.png';
import API_BASE from "../services/apiBase";
import Navbar from "../components/Navbar";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  Area,
} from "recharts";
import { eachDayOfInterval, format, startOfMonth, endOfMonth } from "date-fns";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const Dashboard = () => {
  const { appState, theme } = useAppContext();
  const storedUser = JSON.parse(localStorage.getItem("user")) || null;
  const [user, setUser] = useState(appState?.user || storedUser);
  const { coins = 0, streak = 0, history = [], videosWatched = 0, videosSwitched = 0 } =
    appState || {};

  const [monthlyActivity, setMonthlyActivity] = useState({});
  const [loading, setLoading] = useState(true);
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const navigate = useNavigate();

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

  const handleLogout = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      localStorage.removeItem("user");
      localStorage.removeItem("token");
      setUser(null);
      setDropdownOpen(false);

      if (res.ok) {
        navigate("/");
      } else {
        console.error("Logout failed:", data.message);
      }
    } catch (error) {
      console.error("Error during logout:", error);
      // Ensure frontend logout even if server call fails
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      setUser(null);
      setDropdownOpen(false);
      alert("An error occurred during logout.");
    }
  };

  if (!user)
    return <p>Please log in to view your dashboard.</p>;
  if (loading)
    return (
      <p className="text-gray-500 text-center mt-10">
        Loading your dashboard...
      </p>
    );

  const getLocalDateKey = (watchedAt) => {
    if (!watchedAt) return "";
    if (typeof watchedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(watchedAt.trim())) {
      return watchedAt.trim();
    }
    const d = new Date(watchedAt);
    if (isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Unified daily activity calculation (matches Video Tracker bar chart)
  const finalActivity = {};
  const historyList = (history && history.length > 0)
    ? history
    : JSON.parse(localStorage.getItem(`userHistory_${user?._id}`)) || [];

  if (historyList.length > 0) {
    historyList.forEach((h) => {
      const dayKey = getLocalDateKey(h.watchedAt);
      if (!dayKey) return;
      if (!finalActivity[dayKey]) finalActivity[dayKey] = { totalSeconds: 0 };
      finalActivity[dayKey].totalSeconds += Number(h.seconds ?? h.secondsWatched ?? 0) || 0;
    });
  } else if (monthlyActivity && Object.keys(monthlyActivity).length > 0) {
    Object.keys(monthlyActivity).forEach((key) => {
      finalActivity[key] = { totalSeconds: monthlyActivity[key]?.totalSeconds || 0 };
    });
  }


  // Full Month Days
  const now = new Date();
  const allDays = eachDayOfInterval({
    start: startOfMonth(now),
    end: endOfMonth(now),
  });

  // Build chart dataset
  const chartData = allDays.map((day) => {
    const key = format(day, "yyyy-MM-dd");
    const totalSeconds = finalActivity[key]?.totalSeconds || 0;

    return {
      date: format(day, "MMM d"),
      mins: Math.round(totalSeconds / 60),
    };
  });

  // Calendar days
  const days = allDays;

  return (
    <div className={`min-h-screen font-sans relative z-10 transition-colors duration-500 ${theme === "dark" ? "text-white" : "text-slate-800"}`}>
      {/* Unified Navbar with Permanent ThemeToggle */}
      <Navbar />

      {/* Main Content */}
      <div className="px-6 md:px-10 py-10">
        <h1 className="text-4xl md:text-5xl font-extrabold text-center mb-10">
          <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
            Welcome back, {user?.name || "Learner"} 👋
          </span>
        </h1>

        {/* Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
          <StatCard title="Coins" value={coins} icon="🪙" theme={theme} />
          <StatCard title="Videos Watched" value={videosWatched} icon="🎬" theme={theme} />
          <StatCard title="Tab Switches" value={videosSwitched} icon="🔁" theme={theme} />
          <StatCard title="Streak" value={`${streak} days`} icon="🔥" theme={theme} />
        </div>

        {/* Graph */}
        <div className={`p-6 rounded-3xl backdrop-blur-2xl shadow-xl mb-8 border transition-all duration-300 ${
          theme === "dark"
            ? "bg-slate-900/80 border-purple-500/20 text-white shadow-2xl"
            : "bg-[#fdfbf7] border-[#eee8de] shadow-[0_10px_35px_rgba(0,0,0,0.04)] text-slate-800"
        }`}>
          <h2 className={`text-lg font-bold mb-3 ${theme === "dark" ? "text-purple-300" : "text-slate-900"}`}>
            Study Progress (Last 30 Days)
          </h2>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="date"
                  stroke="#6B7280"
                  tick={{ fontSize: 10 }}
                  interval={2}
                />
                <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} />

                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const mins = payload[0].value;
                      const hrs = Math.floor(mins / 60);
                      const rem = mins % 60;
                      const formatted =
                        hrs > 0
                          ? `${hrs} hr${hrs > 1 ? "s" : ""} ${rem ? `${rem} min` : ""
                          }`
                          : `${rem} min`;

                      return (
                        <div
                          style={{
                            background: "rgba(255,255,255,0.9)",
                            backdropFilter: "blur(8px)",
                            border: "1px solid #ddd",
                            borderRadius: "10px",
                            padding: "8px 10px",
                            color: "#333",
                            fontSize: "13px",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                          }}
                        >
                          <div style={{ fontWeight: "bold" }}>{label}</div>
                          <div>🕒 Total Watched: {formatted}</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                <defs>
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#EC4899" stopOpacity={0.3} />
                  </linearGradient>
                </defs>

                <Area
                  type="monotone"
                  dataKey="mins"
                  stroke="none"
                  fill="url(#lineGradient)"
                  fillOpacity={1}
                />
                <Line
                  type="monotone"
                  dataKey="mins"
                  stroke="url(#lineGradient)"
                  strokeWidth={3}
                  dot={{ r: 3, fill: "#8B5CF6" }}
                  activeDot={{ r: 6, fill: "#EC4899" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>


        {/* Last Sessions */}
        <div className={`p-6 rounded-3xl backdrop-blur-2xl shadow-xl border transition-all duration-300 ${
          theme === "dark"
            ? "bg-slate-900/80 border-purple-500/20 text-white shadow-2xl"
            : "bg-[#fdfbf7] border-[#eee8de] shadow-[0_10px_35px_rgba(0,0,0,0.04)] text-slate-800"
        }`}>
          <h2 className={`text-lg font-bold mb-4 ${theme === "dark" ? "text-purple-300" : "text-slate-900"}`}>
            🎬 Last 5 Study Sessions
          </h2>
          {(history || []).length === 0 ? (
            <p className={theme === "dark" ? "text-slate-400" : "text-slate-500"}>No recent study sessions found.</p>
          ) : (
            (history || []).map((h, i) => (
              <div
                key={i}
                className={`p-4 mb-3 rounded-2xl border transition-all ${
                  theme === "dark"
                    ? "bg-slate-800/60 border-purple-500/20 text-slate-200 hover:border-purple-500/40"
                    : "bg-white/70 border-purple-200/70 text-slate-700 shadow-sm hover:bg-white/90"
                }`}
              >
                <p>
                  <b className={theme === "dark" ? "text-purple-300" : "text-purple-700"}>Video:</b>{" "}
                  {h.url && h.url.startsWith("http") ? (
                    <a
                      href={h.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-purple-500 hover:text-purple-400 underline font-medium"
                    >
                      {h.videoTitle || h.videoId}
                    </a>
                  ) : (
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      📁 {h.videoTitle || h.videoId || "Local Video"} <span className="text-xs opacity-75 font-normal">(System Video)</span>
                    </span>
                  )}
                </p>
                <p>
                  <b className={theme === "dark" ? "text-purple-300" : "text-purple-700"}>Watched:</b>{" "}
                  {(h.secondsWatched ?? h.seconds ?? 0) >= 60
                    ? `${Math.floor((h.secondsWatched ?? h.seconds ?? 0) / 60)}m ${(h.secondsWatched ?? h.seconds ?? 0) % 60}s`
                    : `${h.secondsWatched ?? h.seconds ?? 0}s`}
                </p>
                <p>
                  <b className={theme === "dark" ? "text-purple-300" : "text-purple-700"}>Tab Switches:</b> {h.tabSwitches || 0}
                </p>
                <p>
                  <b className={theme === "dark" ? "text-purple-300" : "text-purple-700"}>Date:</b>{" "}
                  {h.watchedAt
                    ? typeof h.watchedAt === "string" && h.watchedAt.includes("T")
                      ? new Date(h.watchedAt).toLocaleDateString("en-IN")
                      : typeof h.watchedAt === "string"
                      ? h.watchedAt
                      : new Date(h.watchedAt).toLocaleDateString("en-IN")
                    : "Today"}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// Stat card
const StatCard = ({ title, value, icon, theme }) => (
  <div className={`rounded-3xl p-5 text-center transition-all duration-300 hover:scale-[1.03] backdrop-blur-2xl border ${
    theme === "dark"
      ? "bg-slate-900/80 border-purple-500/20 text-white shadow-xl hover:border-purple-500/40"
      : "bg-[#fdfbf7] border-[#eee8de] shadow-[0_10px_30px_rgba(0,0,0,0.04)] hover:border-[#dfd7ca] text-slate-800"
  }`}>
    <div className="text-3xl mb-2">{icon}</div>
    <h3 className={`text-xs md:text-sm font-semibold tracking-wide uppercase ${theme === "dark" ? "text-purple-300/80" : "text-slate-500"}`}>{title}</h3>
    <p className={`text-2xl font-black mt-1 ${theme === "dark" ? "text-white" : "text-slate-900"}`}>{value}</p>
  </div>
);

// Legend item
const Legend = ({ color, text }) => (
  <div className="flex items-center gap-1.5">
    <div className={`w-3.5 h-3.5 rounded-full ${color} shadow-sm`}></div> <span>{text}</span>
  </div>
);

export default Dashboard;
