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

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Leaderboard = () => {
  const [students, setStudents] = useState([]);
  const { theme } = useAppContext();
  const isDark = theme === "dark";

  useEffect(() => {
    // Generate sample students
    const names = [
      "Ananya", "Rohan", "Priya", "Karan", "Ishika", "Aarav", "Tanya", "Dev",
      "Sanya", "Arjun", "Riya", "Manav", "Simran", "Kritika", "Aditya"
    ];

    const studentsData = [];
    for (let i = 0; i < 50; i++) {
      const name =
        names[Math.floor(Math.random() * names.length)] +
        " " +
        ["Sharma", "Patel", "Singh", "Gupta", "Mehta", "Verma", "Mishra", "Jain"][
          Math.floor(Math.random() * 8)
        ];

      const coins = Math.floor(Math.random() * 500) + 100;
      const videos = Math.floor(Math.random() * 40) + 10;
      const tabs = Math.floor(Math.random() * 12);

      let focusScore = ((videos * 10) + (coins * 0.3) - (tabs * 4)) / 10;
      focusScore = Math.min(100, Math.max(0, parseFloat(focusScore.toFixed(1))));

      studentsData.push({ name, coins, videos, tabs, focusScore });
    }

    // Sort descending by focus score
    studentsData.sort((a, b) => b.focusScore - a.focusScore);
    setStudents(studentsData);
  }, []);

  const top10 = students.slice(0, 10);

  const chartData = {
    labels: top10.map((s) => s.name),
    datasets: [
      {
        label: "Focus Score (%)",
        data: top10.map((s) => s.focusScore),
        backgroundColor: isDark ? "rgba(168, 85, 247, 0.75)" : "rgba(139, 92, 246, 0.8)",
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
        text: "Top 10 Focused Students",
        color: isDark ? "#e2e8f0" : "#1e293b",
        font: { size: 16, weight: "bold" },
      },
      tooltip: {
        backgroundColor: isDark ? "rgba(15, 23, 42, 0.9)" : "rgba(255, 255, 255, 0.9)",
        titleColor: isDark ? "#fff" : "#0f172a",
        bodyColor: isDark ? "#cbd5e1" : "#334155",
        borderColor: isDark ? "rgba(168,85,247,0.3)" : "rgba(0,0,0,0.1)",
        borderWidth: 1,
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
        <h1 className="text-4xl md:text-5xl font-black text-center mb-3 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 bg-clip-text text-transparent tracking-tight">
          🏆 Focus & Study Leaderboard
        </h1>
        <p className={`text-center text-sm md:text-base font-medium mb-10 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
          Real-time top learners ranked by study consistency, focus score, and earned coins.
        </p>

        {/* TOP 3 PODIUM CARDS */}
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
                key={i}
                className={`p-6 rounded-3xl backdrop-blur-2xl border transition-all duration-300 hover:scale-[1.03] relative overflow-hidden shadow-xl ${borderGlow} ${
                  isDark
                    ? "bg-slate-900/80 text-white"
                    : "bg-[#fdfbf7] border-[#eee8de] text-slate-800 shadow-[0_10px_35px_rgba(0,0,0,0.04)]"
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
                    <div className="text-base font-black text-amber-500">🪙 {s.coins}</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Videos</div>
                    <div className="text-base font-black">🎬 {s.videos}</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Focus</div>
                    <div className="text-base font-black text-purple-500">{s.focusScore}%</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CHART */}
        <div className={`p-6 rounded-3xl backdrop-blur-2xl shadow-xl mb-12 border transition-all duration-300 ${
          isDark
            ? "bg-slate-900/80 border-purple-500/20 text-white shadow-2xl"
            : "bg-[#fdfbf7] border-[#eee8de] shadow-[0_10px_35px_rgba(0,0,0,0.04)] text-slate-800"
        }`}>
          <div className="h-72">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* FULL LEADERBOARD TABLE */}
        <div className={`rounded-3xl backdrop-blur-2xl shadow-xl border overflow-hidden transition-all duration-300 ${
          isDark
            ? "bg-slate-900/80 border-purple-500/20 text-white shadow-2xl"
            : "bg-[#fdfbf7] border-[#eee8de] shadow-[0_10px_35px_rgba(0,0,0,0.04)] text-slate-800"
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b text-xs uppercase tracking-wider font-bold ${
                  isDark
                    ? "bg-slate-800/60 border-purple-500/20 text-purple-300"
                    : "bg-slate-100/70 border-slate-200 text-slate-700"
                }`}>
                  <th className="py-4 px-6">Rank</th>
                  <th className="py-4 px-6">Student Name</th>
                  <th className="py-4 px-6">Coins</th>
                  <th className="py-4 px-6">Videos</th>
                  <th className="py-4 px-6">Tab Switches</th>
                  <th className="py-4 px-6">Focus Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm font-medium">
                {students.map((s, i) => (
                  <tr
                    key={i}
                    className={`transition-colors ${
                      isDark ? "hover:bg-slate-800/40" : "hover:bg-purple-50/50"
                    }`}
                  >
                    <td className="py-4 px-6 font-bold">
                      {i === 0 ? "🥇 1" : i === 1 ? "🥈 2" : i === 2 ? "🥉 3" : `#${i + 1}`}
                    </td>
                    <td className={`py-4 px-6 font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{s.name}</td>
                    <td className="py-4 px-6 text-amber-500 font-bold">🪙 {s.coins}</td>
                    <td className="py-4 px-6">{s.videos}</td>
                    <td className="py-4 px-6 text-rose-500">{s.tabs}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-purple-500 w-12">{s.focusScore}%</span>
                        <div className={`h-2 flex-1 max-w-[120px] rounded-full overflow-hidden ${isDark ? "bg-slate-700" : "bg-slate-200"}`}>
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                            style={{ width: `${s.focusScore}%` }}
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
      </main>

      <footer className={`py-8 text-center text-sm font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
        © {new Date().getFullYear()} StudyBuddy • Built for better learning 🔥
      </footer>
    </div>
  );
};

export default Leaderboard;
