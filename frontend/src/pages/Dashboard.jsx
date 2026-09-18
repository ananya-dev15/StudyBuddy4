import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import profileIcon from '../assets/profile_icon.png';
import API_BASE from "../services/apiBase";
import UserProfileModal from "../components/UserProfileModal";
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
  const { appState } = useAppContext();
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
    <div
      className="min-h-screen font-sans"
      style={{
        background: "linear-gradient(180deg, #E9E3FF 0%, #F7E9FF 100%)",
      }}
    >
      {/* Navbar */}
      <nav className="bg-white/30 backdrop-blur-lg shadow-lg py-4 px-8 flex justify-between items-center sticky top-0 z-50 rounded-b-2xl">
        <Link
          to="/"
          className="text-2xl font-extrabold bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600 bg-clip-text text-transparent tracking-tight"
        >
          StudyBuddy
        </Link>

        <div className="hidden md:flex gap-8 font-medium">
          <Link
            to="/dashboard"
            className="hover:text-pink-500 transition-colors duration-300"
          >
            Dashboard
          </Link>
          <Link to="/videos" className="hover:text-pink-500 transition-colors duration-300">Video Tracker</Link>
          <Link to="/analytics" className="hover:text-pink-500 transition-colors duration-300">Analytics</Link>
          <Link to="/assignments" className="hover:text-pink-500 transition-colors duration-300">Assignments</Link>
        </div>

        {/* Conditional Navbar with Logout Dropdown */}
        {user ? (
          <div className="relative">
            {/* Clickable profile icon to toggle dropdown */}
            <button onClick={() => setDropdownOpen(!isDropdownOpen)} className="flex items-center gap-3 cursor-pointer">
              <img
                src={user.profileImage || profileIcon}
                alt="Profile"
                className="w-10 h-10 rounded-full border-2 border-indigo-700"
              />
              <span className="font-semibold text-gray-900">{user.name}</span>
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 py-2 w-52 bg-white rounded-xl shadow-2xl z-50 border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    setIsProfileModalOpen(true);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 font-semibold flex items-center gap-2 transition-colors"
                >
                  👤 View Profile
                </button>
                <div className="border-t border-gray-100 my-1"></div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 font-bold hover:bg-red-50 flex items-center gap-2 transition-colors"
                >
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex gap-3">
            <Link
              to="/login"
              className="px-4 py-2 border border-indigo-700 text-indigo-700 rounded-lg hover:bg-indigo-50 transition-all duration-300"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 bg-gradient-to-r from-indigo-700 to-pink-600 text-white rounded-lg shadow-xl hover:shadow-2xl hover:scale-105 transform transition-all duration-300"
            >
              Sign Up
            </Link>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <div className="px-6 md:px-10 py-10">
        <h1 className="text-4xl md:text-5xl font-extrabold text-center mb-10">
          <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
            Welcome back, {user?.name || "Learner"} 👋
          </span>
        </h1>

        {/* Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
          <StatCard title="Coins" value={coins} icon="🪙" />
          <StatCard title="Videos Watched" value={videosWatched} icon="🎬" />
          <StatCard title="Tab Switches" value={videosSwitched} icon="🔁" />
          <StatCard title="Streak" value={`${streak} days`} icon="🔥" />
        </div>

        {/* Graph */}
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-lg mb-8">
          <h2 className="text-lg font-semibold mb-3 text-gray-700">
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

        {/* Calendar */}
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-lg mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
            <h2 className="text-lg font-semibold text-gray-700">
              Study Activity — {MONTHS[selectedMonth]} {selectedYear}
            </h2>

            {/* Month & Year Selectors */}
            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i}>
                    {m}
                  </option>
                ))}
              </select>

              <input
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-20 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center">
            {eachDayOfInterval({
              start: startOfMonth(new Date(selectedYear, selectedMonth, 1)),
              end: endOfMonth(new Date(selectedYear, selectedMonth, 1)),
            }).map((day, i) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const totalSeconds = finalActivity[dateKey]?.totalSeconds || 0;
              const totalMins = totalSeconds / 60;
              const totalHours = totalMins / 60;

              let bgClass = "bg-gray-200 text-gray-600";
              if (totalHours >= 9) bgClass = "bg-green-500 text-white";
              else if (totalHours >= 5) bgClass = "bg-yellow-400 text-gray-800";
              else if (totalHours >= 2) bgClass = "bg-orange-400 text-white";
              else if (totalMins >= 1) bgClass = "bg-red-500 text-white";

              const hrs = Math.floor(totalHours);
              const mins = Math.floor(totalMins % 60);
              const timeLabel =
                totalMins >= 1 ? `${hrs ? `${hrs}h ` : ""}${mins}m` : "";

              return (
                <div
                  key={i}
                  className={`p-2 rounded-lg text-sm font-medium cursor-pointer transition-transform hover:scale-105 ${bgClass}`}
                  title={`${timeLabel || "No activity"} on ${format(day, "MMM d")}`}
                >
                  <div>{format(day, "d")}</div>
                  {timeLabel && (
                    <div className="text-[10px] opacity-80">{timeLabel}</div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-around mt-6 text-sm text-gray-600 flex-wrap gap-2">
            <Legend color="bg-red-500" text="0–2 hrs" />
            <Legend color="bg-orange-400" text="2–5 hrs" />
            <Legend color="bg-yellow-400" text="5–9 hrs" />
            <Legend color="bg-green-500" text="9+ hrs" />
          </div>
        </div>

        {/* Last Sessions */}
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-lg">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">
            🎬 Last 5 Study Sessions
          </h2>
          {(history || []).length === 0 ? (
            <p className="text-gray-500">No recent study sessions found.</p>
          ) : (
            (history || []).map((h, i) => (
              <div
                key={i}
                className="bg-gradient-to-r from-purple-100 to-pink-100 p-4 mb-3 rounded-xl border border-purple-200 shadow-sm"
              >
                <p>
                  <b>Video:</b>{" "}
                  <a
                    href={h.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-600 underline"
                  >
                    {h.videoId}
                  </a>
                </p>
                <p>
                  <b>Watched:</b>{" "}
                  {h.secondsWatched >= 60
                    ? `${Math.floor(h.secondsWatched / 60)}m ${h.secondsWatched % 60
                    }s`
                    : `${h.secondsWatched}s`}
                </p>
                <p>
                  <b>Tab Switches:</b> {h.tabSwitches}
                </p>
                <p>
                  <b>Date:</b>{" "}
                  {new Date(h.watchedAt).toLocaleDateString("en-IN")}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
        onUpdateUser={(updated) => setUser(updated)}
      />
    </div>
  );
};

// Stat card
const StatCard = ({ title, value, icon }) => (
  <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 text-center shadow-lg hover:scale-[1.03] transition-transform duration-200">
    <div className="text-3xl mb-2">{icon}</div>
    <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
    <p className="text-2xl font-bold text-gray-800">{value}</p>
  </div>
);

// Legend item
const Legend = ({ color, text }) => (
  <div className="flex items-center gap-1">
    <div className={`w-4 h-4 rounded ${color}`}></div> <span>{text}</span>
  </div>
);

export default Dashboard;
