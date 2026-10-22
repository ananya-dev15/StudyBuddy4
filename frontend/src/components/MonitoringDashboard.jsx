import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import API_BASE from "../services/apiBase";
import ThemeToggle from "./ThemeToggle";
import Navbar from "./Navbar";
import PageIntroCard from "./PageIntroCard";
import { jsPDF } from "jspdf";
import {
  getAvailableDates,
  getLogsByDate,
  getAllMonitoringLogs,
  clearMonitoringLogs,
  exportLogsToCSV,
} from "../services/monitoringDB";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
} from "recharts";

const PIE_COLORS = {
  "Focused (screen)": "#10b981", // Emerald
  "Focused (notebook)": "#3b82f6", // Blue
  "Focused (temporary glance away)": "#f59e0b", // Amber
  "Not Focused (Phone Detected)": "#ef4444", // Red
  "Not Focused (Multiple/No Face)": "#8b5cf6", // Purple
  "Not Focused (Looking Away >10s)": "#ec4899", // Pink
  "Other": "#64748b",
};

const MonitoringDashboard = () => {
  const { theme } = useAppContext();
  const isDark = theme === "dark";

  // Tab State: 0: Overview, 1: Distraction, 2: Phone, 3: Export, 4: Comparison, 5: History, 6: Raw Log, 7: Cloud Reports
  const [activeTab, setActiveTab] = useState(0);

  // Date selection state
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [logs, setLogs] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [loading, setLoading] = useState(true);



  // Comparison Tab state
  const [compareDay1, setCompareDay1] = useState("");
  const [compareDay2, setCompareDay2] = useState("");
  const [day1Logs, setDay1Logs] = useState([]);
  const [day2Logs, setDay2Logs] = useState([]);

  // Raw Log pagination
  const [rawPage, setRawPage] = useState(1);
  const rawPageSize = 25;

  // 1. Initial Load: Read available dates from IndexedDB
  const refreshDates = async () => {
    setLoading(true);
    try {
      const dates = await getAvailableDates();
      setAvailableDates(dates);
      if (dates.length > 0) {
        // Select latest date by default
        const latest = dates[dates.length - 1];
        setSelectedDate(latest);
        const dayLogs = await getLogsByDate(latest);
        setLogs(dayLogs);

        // Pre-populate comparison days if available
        setCompareDay1(latest);
        setDay1Logs(dayLogs);
        if (dates.length > 1) {
          const prev = dates[dates.length - 2];
          setCompareDay2(prev);
          const prevLogs = await getLogsByDate(prev);
          setDay2Logs(prevLogs);
        } else {
          setCompareDay2(latest);
          setDay2Logs(dayLogs);
        }
      } else {
        setSelectedDate("");
        setLogs([]);
      }

      // Fetch all logs for history trend and weekly comparison
      const all = await getAllMonitoringLogs();
      setAllLogs(all);
    } catch (err) {
      console.error("Failed to load local monitoring data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshDates();
  }, []);

  // Upload generated PDF to backend so it is saved in Analytics
  const uploadReportToCloud = async (pdfBlob, fileName, title) => {
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("pdf", pdfBlob, fileName);
      formData.append("title", title);

      const headers = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE}/api/reports/upload`, {
        method: "POST",
        headers,
        credentials: "include",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        fetchCloudReports();
      }
    } catch (err) {
      console.warn("Failed to auto-save report to cloud:", err);
    }
  };

  // Handle Date Change
  const handleDateChange = async (dateStr) => {
    setSelectedDate(dateStr);
    setLoading(true);
    try {
      const dayLogs = await getLogsByDate(dateStr);
      setLogs(dayLogs);
      setRawPage(1);
    } catch (e) {
      console.error("Error loading date logs:", e);
    } finally {
      setLoading(false);
    }
  };

  // Handle Day 1 Comparison Change
  const handleCompareDay1Change = async (dateStr) => {
    setCompareDay1(dateStr);
    const d1 = await getLogsByDate(dateStr);
    setDay1Logs(d1);
  };

  // Handle Day 2 Comparison Change
  const handleCompareDay2Change = async (dateStr) => {
    setCompareDay2(dateStr);
    const d2 = await getLogsByDate(dateStr);
    setDay2Logs(d2);
  };

  // Clear Local Data
  const handleClearData = async () => {
    if (window.confirm("Are you sure you want to delete all local focus monitoring logs from this browser? This cannot be undone.")) {
      await clearMonitoringLogs();
      await refreshDates();
      alert("All local monitoring records have been cleared.");
    }
  };

  // --- METRICS COMPUTATION FOR SELECTED DATE ---
  const kpis = useMemo(() => {
    const total = logs.length;
    if (total === 0) {
      return { total: 0, focusPct: 0, avgScore: 0, phoneCount: 0 };
    }
    const focusedCount = logs.filter((l) => l.status && l.status.startsWith("Focused")).length;
    const focusPct = ((focusedCount / total) * 100).toFixed(1);
    const totalScore = logs.reduce((sum, l) => sum + (l.focus_score || 0), 0);
    const avgScore = (totalScore / total).toFixed(1);
    const phoneCount = logs.filter((l) => l.phone_detected === 1).length;

    return { total, focusPct, avgScore, phoneCount };
  }, [logs]);

  // --- OVERALL METRICS COMPUTATION (ALL-TIME HISTORY) ---
  const overallAvgScore = useMemo(() => {
    if (!allLogs || allLogs.length === 0) {
      return "0.0";
    }
    const validLogs = allLogs.filter(
      (l) => l.focus_score !== undefined && l.focus_score !== null && !isNaN(Number(l.focus_score))
    );
    if (validLogs.length === 0) return "0.0";
    const totalScore = validLogs.reduce((sum, l) => sum + Number(l.focus_score), 0);
    const avg = totalScore / validLogs.length;
    return Math.max(0, Math.min(100, avg)).toFixed(1);
  }, [allLogs]);

  // Status Breakdown Data
  const statusBreakdown = useMemo(() => {
    if (!logs.length) return [];
    const counts = {};
    logs.forEach((l) => {
      counts[l.status] = (counts[l.status] || 0) + 1;
    });
    return Object.keys(counts).map((st) => ({
      status: st,
      count: counts[st],
      pct: ((counts[st] / logs.length) * 100).toFixed(1),
    }));
  }, [logs]);

  // Focus Score Trend Data (Downsampled for smooth line chart)
  const focusTrendData = useMemo(() => {
    if (!logs.length) return [];
    const step = Math.max(1, Math.floor(logs.length / 80));
    return logs
      .filter((_, idx) => idx % step === 0)
      .map((l) => ({
        time: l.timestamp ? l.timestamp.split(" ")[1] : "",
        score: l.focus_score,
      }));
  }, [logs]);

  // Phone Events
  const phoneEvents = useMemo(() => {
    return logs.filter((l) => l.phone_detected === 1);
  }, [logs]);

  // History Trend (Aggregate all logs by date)
  const historyTrendData = useMemo(() => {
    if (!allLogs.length) return [];
    const byDate = {};
    allLogs.forEach((l) => {
      const d = l.date || (l.timestamp ? l.timestamp.split(" ")[0] : "Unknown");
      if (!byDate[d]) {
        byDate[d] = { date: d, total: 0, focused: 0, scoreSum: 0, phones: 0 };
      }
      byDate[d].total += 1;
      if (l.status && l.status.startsWith("Focused")) {
        byDate[d].focused += 1;
      }
      byDate[d].scoreSum += l.focus_score || 0;
      if (l.phone_detected === 1) {
        byDate[d].phones += 1;
      }
    });

    return Object.values(byDate)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((item) => ({
        date: item.date,
        total: item.total,
        focusPct: Number(((item.focused / item.total) * 100).toFixed(1)),
        avgScore: Number((item.scoreSum / item.total).toFixed(1)),
        phoneEvents: item.phones,
      }));
  }, [allLogs]);

  // Weekly Comparison Computation (This Week vs Last Week)
  const weeklyComparison = useMemo(() => {
    if (!historyTrendData.length) return null;
    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;

    const thisWeekLogs = [];
    const lastWeekLogs = [];

    allLogs.forEach((log) => {
      const d = new Date(log.date || (log.timestamp ? log.timestamp.split(" ")[0] : ""));
      if (isNaN(d.getTime())) return;
      const diffDays = Math.floor((now - d) / oneDay);
      if (diffDays >= 0 && diffDays < 7) {
        thisWeekLogs.push(log);
      } else if (diffDays >= 7 && diffDays < 14) {
        lastWeekLogs.push(log);
      }
    });

    const calcPct = (arr) => {
      if (!arr.length) return null;
      const foc = arr.filter((l) => l.status && l.status.startsWith("Focused")).length;
      return (foc / arr.length) * 100;
    };

    const thisWeek = calcPct(thisWeekLogs);
    const lastWeek = calcPct(lastWeekLogs);

    return {
      thisWeek: thisWeek !== null ? Number(thisWeek.toFixed(1)) : null,
      lastWeek: lastWeek !== null ? Number(lastWeek.toFixed(1)) : null,
      change: thisWeek !== null && lastWeek !== null ? Number((thisWeek - lastWeek).toFixed(1)) : null,
    };
  }, [allLogs, historyTrendData]);

  // Day 1 vs Day 2 Comparison
  const day1Stats = useMemo(() => {
    if (!day1Logs.length) return { focusPct: 0, avgScore: 0, total: 0 };
    const foc = day1Logs.filter((l) => l.status && l.status.startsWith("Focused")).length;
    return {
      total: day1Logs.length,
      focusPct: ((foc / day1Logs.length) * 100).toFixed(1),
      avgScore: (day1Logs.reduce((s, l) => s + l.focus_score, 0) / day1Logs.length).toFixed(1),
    };
  }, [day1Logs]);

  const day2Stats = useMemo(() => {
    if (!day2Logs.length) return { focusPct: 0, avgScore: 0, total: 0 };
    const foc = day2Logs.filter((l) => l.status && l.status.startsWith("Focused")).length;
    return {
      total: day2Logs.length,
      focusPct: ((foc / day2Logs.length) * 100).toFixed(1),
      avgScore: (day2Logs.reduce((s, l) => s + l.focus_score, 0) / day2Logs.length).toFixed(1),
    };
  }, [day2Logs]);

  const [saveNotification, setSaveNotification] = useState("");

  // --- CLIENT-SIDE PDF GENERATION (Auto-saves to Analytics Saved Reports) ---
  const generateTodayPDF = () => {
    if (!logs.length) {
      alert("No data recorded for the selected date.");
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59);
    doc.text("Study Focus Dashboard Report", 20, 25);

    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 35);
    doc.text(`Session Date: ${selectedDate}`, 20, 42);

    doc.setDrawColor(203, 213, 225);
    doc.line(20, 48, 190, 48);

    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text("Key Performance Indicators (KPIs)", 20, 58);

    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85);
    doc.text(`Total Records Logged: ${kpis.total}`, 25, 68);
    doc.text(`Time Focused: ${kpis.focusPct}%`, 25, 76);
    doc.text(`Average Focus Score: ${kpis.avgScore} / 100`, 25, 84);
    doc.text(`Phone Distraction Events: ${kpis.phoneCount}`, 25, 92);

    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text("Status Breakdown Summary", 20, 110);

    let y = 122;
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("Status Category", 25, y);
    doc.text("Records", 130, y);
    doc.text("Percentage", 165, y);
    doc.line(20, y + 3, 190, y + 3);

    y += 10;
    doc.setTextColor(51, 65, 85);
    statusBreakdown.forEach((st) => {
      doc.text(st.status, 25, y);
      doc.text(String(st.count), 130, y);
      doc.text(`${st.pct}%`, 165, y);
      y += 8;
    });

    doc.line(20, y + 5, 190, y + 5);
    y += 15;

    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text("100% Private, Client-Side Biometric Monitoring by StudyBuddy", 20, 280);

    const fileName = `Today_Study_Report_${selectedDate}.pdf`;
    const title = `Today's Focus Report - ${selectedDate}`;
    const pdfBlob = doc.output("blob");
    doc.save(fileName);
    uploadReportToCloud(pdfBlob, fileName, title);
    setSaveNotification("✅ Today's report downloaded & saved to Analytics Saved Reports!");
    setTimeout(() => setSaveNotification(""), 5000);
  };

  const generateWeeklyPDF = () => {
    if (!historyTrendData.length) {
      alert("No weekly history data found.");
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text("📅 Weekly Study Focus Report", 20, 25);

    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 34);
    doc.line(20, 40, 190, 40);

    let y = 52;
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text("Date", 25, y);
    doc.text("Focus %", 75, y);
    doc.text("Avg Score", 115, y);
    doc.text("Phone Events", 155, y);
    doc.line(20, y + 3, 190, y + 3);

    y += 10;
    historyTrendData.slice(-7).forEach((row) => {
      doc.text(row.date, 25, y);
      doc.text(`${row.focusPct}%`, 75, y);
      doc.text(`${row.avgScore}`, 115, y);
      doc.text(`${row.phoneEvents}`, 155, y);
      y += 8;
    });

    const fileName = `Weekly_Study_Report_${new Date().toISOString().split("T")[0]}.pdf`;
    const title = `Weekly Study Focus Report - ${new Date().toLocaleDateString()}`;
    const pdfBlob = doc.output("blob");
    doc.save("Weekly_Study_Report.pdf");
    uploadReportToCloud(pdfBlob, fileName, title);
    setSaveNotification("✅ Weekly report downloaded & saved to Analytics Saved Reports!");
    setTimeout(() => setSaveNotification(""), 5000);
  };

  const generateMonthlyPDF = () => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthData = historyTrendData.filter((r) => r.date.startsWith(currentMonth));

    if (!monthData.length) {
      alert("No data recorded for the current month.");
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text("🗓️ Monthly Study Focus Report", 20, 25);

    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text(`Month: ${currentMonth} | Generated: ${new Date().toLocaleDateString()}`, 20, 34);
    doc.line(20, 40, 190, 40);

    let y = 52;
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text("Date", 25, y);
    doc.text("Focus %", 75, y);
    doc.text("Avg Score", 115, y);
    doc.text("Phone Events", 155, y);
    doc.line(20, y + 3, 190, y + 3);

    y += 10;
    monthData.forEach((row) => {
      doc.text(row.date, 25, y);
      doc.text(`${row.focusPct}%`, 75, y);
      doc.text(`${row.avgScore}`, 115, y);
      doc.text(`${row.phoneEvents}`, 155, y);
      y += 8;
    });

    const fileName = `Monthly_Study_Report_${currentMonth}.pdf`;
    const title = `Monthly Focus Report - ${currentMonth}`;
    const pdfBlob = doc.output("blob");
    doc.save("Monthly_Study_Report.pdf");
    uploadReportToCloud(pdfBlob, fileName, title);
    setSaveNotification("✅ Monthly report downloaded & saved to Analytics Saved Reports!");
    setTimeout(() => setSaveNotification(""), 5000);
  };

  const tabs = [
    { label: "Overview", icon: "📊" },
    { label: "Distraction Breakdown", icon: "📈" },
    { label: "Phone Timeline", icon: "📱" },
    { label: "Export Reports", icon: "📅" },
    { label: "Comparison", icon: "🔄" },
    { label: "History Trend", icon: "📊" },
    { label: "Raw Log", icon: "🗂️" },
  ];

  return (
    <div
      className={`min-h-screen relative z-10 transition-colors duration-500 ${
        isDark ? "text-white" : "text-slate-800"
      }`}
    >
      {/* Unified Navbar with ThemeToggle */}
      <Navbar />

      <div className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto">
        {/* Page Introduction Card */}
        <PageIntroCard className="mb-6" />

        {/* Top Controls: Date Selector */}
        {availableDates.length > 0 && (
          <div className="flex items-center justify-end mb-6">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Date:
              </span>
              <select
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition outline-none cursor-pointer ${
                  isDark
                    ? "bg-slate-900 border-purple-500/30 text-purple-200"
                    : "bg-white border-slate-300 text-slate-800 shadow-sm"
                }`}
              >
                {availableDates.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}



        {/* Tab Navigation Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-8 no-scrollbar">
          {tabs.map((tab, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTab(idx)}
              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 flex items-center gap-2 ${
                activeTab === idx
                  ? isDark
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25 scale-[1.02]"
                    : "bg-[#1b3f30] hover:bg-[#143024] text-white shadow-md scale-[1.02]"
                  : isDark
                  ? "bg-slate-900/50 hover:bg-slate-800/70 text-slate-300 border border-purple-500/20"
                  : "bg-white/70 hover:bg-white text-slate-700 border border-slate-200 shadow-sm"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        )}

        {/* Empty State Banner if No Data in IndexedDB */}
        {!loading && availableDates.length === 0 && activeTab !== 7 && (
          <div
            className={`text-center py-16 px-6 rounded-3xl backdrop-blur-2xl border max-w-xl mx-auto my-12 ${
              isDark
                ? "bg-slate-900/70 border-purple-500/20 text-slate-300"
                : "bg-[#fbf9f3] border-[#eee8de] text-slate-600 shadow-lg"
            }`}
          >
            <span className="text-6xl mb-4 block">🎯</span>
            <h3 className="text-2xl font-bold mb-3 text-purple-400">No Local Focus Records Found</h3>
            <p className="text-sm mb-6 leading-relaxed">
              No monitoring logs have been recorded in this browser yet. Start a study session with Live Focus Detection to generate real-time metrics, attention breakdowns, and analytics.
            </p>
            <Link
              to="/videos"
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white shadow-lg transition hover:scale-105 ${
                isDark
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 shadow-purple-500/30"
                  : "bg-[#1b3f30] hover:bg-[#143024] shadow-emerald-950/20"
              }`}
            >
              <span>🎥</span>
              <span>Start Camera Analysis</span>
            </Link>
          </div>
        )}

        {/* =========================================================================
            TAB 0: OVERVIEW
        ========================================================================= */}
        {!loading && availableDates.length > 0 && activeTab === 0 && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Top 4 KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div
                className={`p-6 rounded-3xl border backdrop-blur-xl transition hover:scale-[1.01] ${
                  isDark
                    ? "bg-slate-900/80 border-purple-500/30 shadow-lg"
                    : "bg-[#fbf9f3] border-[#eee8de] text-slate-800 shadow-md"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Total Records</span>
                  <span className="text-2xl">📝</span>
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold">{kpis.total}</div>
                <div className="text-xs text-slate-400 mt-1">Logged data points (~1 record/sec)</div>
              </div>

              <div
                className={`p-6 rounded-3xl border backdrop-blur-xl transition hover:scale-[1.01] ${
                  isDark
                    ? "bg-slate-900/80 border-emerald-500/30 shadow-lg"
                    : "bg-[#fbf9f3] border-[#eee8de] text-slate-800 shadow-md"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Time Focused</span>
                  <span className="text-2xl">🎯</span>
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold text-emerald-500">{kpis.focusPct}%</div>
                <div className="text-xs text-slate-400 mt-1">Screen & Notebook focus time</div>
              </div>

              <div
                className={`p-6 rounded-3xl border backdrop-blur-xl transition hover:scale-[1.01] ${
                  isDark
                    ? "bg-slate-900/80 border-indigo-500/30 shadow-lg"
                    : "bg-[#fbf9f3] border-[#eee8de] text-slate-800 shadow-md"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Average Focus Score</span>
                  <span className="text-2xl">⚡</span>
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold text-indigo-400">{kpis.avgScore} / 100</div>
                <div className="text-xs text-slate-400 mt-1">Continuous biometric score average</div>
              </div>

              <div
                className={`p-6 rounded-3xl border backdrop-blur-xl transition hover:scale-[1.01] ${
                  isDark
                    ? "bg-slate-900/80 border-amber-500/30 shadow-lg"
                    : "bg-[#fbf9f3] border-[#eee8de] text-slate-800 shadow-md"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Overall Average Focus Score</span>
                  <span className="text-2xl">🌟</span>
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold text-amber-400">{overallAvgScore} / 100</div>
                <div className="text-xs text-slate-400 mt-1">All-time history biometric average</div>
              </div>
            </div>


            {/* Status Breakdown Table & Bar Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Table */}
              <div
                className={`lg:col-span-5 p-6 rounded-3xl border backdrop-blur-xl ${
                  isDark
                    ? "bg-slate-900/80 border-purple-500/30"
                    : "bg-[#fbf9f3] border-[#eee8de] text-slate-800 shadow-md"
                }`}
              >
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span>📋</span>
                  <span>Status Breakdown (Table)</span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className={`border-b ${isDark ? "border-slate-800 text-slate-400" : "border-slate-200 text-slate-600"}`}>
                        <th className="py-2.5 font-bold">Status</th>
                        <th className="py-2.5 font-bold text-center">Count</th>
                        <th className="py-2.5 font-bold text-right">Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {statusBreakdown.map((row, idx) => (
                        <tr key={idx} className="hover:bg-purple-500/5 transition">
                          <td className="py-2.5 font-medium flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: PIE_COLORS[row.status] || "#94a3b8" }}
                            />
                            <span>{row.status}</span>
                          </td>
                          <td className="py-2.5 text-center font-bold">{row.count}</td>
                          <td className="py-2.5 text-right font-semibold text-purple-400">{row.pct}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bar Chart */}
              <div
                className={`lg:col-span-7 p-6 rounded-3xl border backdrop-blur-xl ${
                  isDark
                    ? "bg-slate-900/80 border-purple-500/30"
                    : "bg-[#fbf9f3] border-[#eee8de] text-slate-800 shadow-md"
                }`}
              >
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span>📊</span>
                  <span>Status Breakdown (Chart)</span>
                </h3>
                <div className="h-64 sm:h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusBreakdown} margin={{ top: 10, right: 20, left: -10, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#334155" : "#e2e8f0"} />
                      <XAxis
                        dataKey="status"
                        tick={{ fill: isDark ? "#94a3b8" : "#475569", fontSize: 10 }}
                        angle={-30}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis tick={{ fill: isDark ? "#94a3b8" : "#475569", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark ? "#0f172a" : "#ffffff",
                          borderColor: isDark ? "#475569" : "#cbd5e1",
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="count" fill="#05917C" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Focus Score Over Time Chart */}
            <div
              className={`p-6 rounded-3xl border backdrop-blur-xl ${
                isDark
                  ? "bg-slate-900/80 border-purple-500/30"
                  : "bg-[#fbf9f3] border-[#eee8de] text-slate-800 shadow-md"
              }`}
            >
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span>⚡</span>
                <span>Focus Score Over Time</span>
              </h3>
              <div className="h-64 sm:h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={focusTrendData} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                    <defs>
                      <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#334155" : "#e2e8f0"} />
                    <XAxis dataKey="time" tick={{ fill: isDark ? "#94a3b8" : "#475569", fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: isDark ? "#94a3b8" : "#475569", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? "#0f172a" : "#ffffff",
                        borderColor: isDark ? "#475569" : "#cbd5e1",
                        borderRadius: "12px",
                      }}
                    />
                    <Area type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#scoreGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 1: DISTRACTION BREAKDOWN
        ========================================================================= */}
        {!loading && availableDates.length > 0 && activeTab === 1 && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div
              className={`p-6 sm:p-8 rounded-3xl border backdrop-blur-xl ${
                isDark
                  ? "bg-slate-900/80 border-purple-500/30"
                  : "bg-[#fbf9f3] border-[#eee8de] text-slate-800 shadow-md"
              }`}
            >
              <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                <span>📈</span>
                <span>Attention & Distraction Distribution</span>
              </h3>
              <p className={`text-xs sm:text-sm mb-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Breakdown of study time across Focused, Looking Away, Phone Distractions, and Multitasking.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                {/* Donut Chart */}
                <div className="md:col-span-6 h-72 sm:h-80 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusBreakdown}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={105}
                        paddingAngle={3}
                      >
                        {statusBreakdown.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={PIE_COLORS[entry.status] || PIE_COLORS["Other"]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark ? "#0f172a" : "#ffffff",
                          borderColor: isDark ? "#475569" : "#cbd5e1",
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Categorical List */}
                <div className="md:col-span-6 space-y-3">
                  {statusBreakdown.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                        isDark ? "bg-slate-800/40 border-slate-700/50" : "bg-white/80 border-slate-200 shadow-sm"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: PIE_COLORS[item.status] || "#94a3b8" }}
                        />
                        <span className="text-xs sm:text-sm font-semibold">{item.status}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 font-mono">{item.count} pts</span>
                        <span className="text-sm font-extrabold text-purple-400 font-mono">{item.pct}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: PHONE DETECTION TIMELINE
        ========================================================================= */}
        {!loading && availableDates.length > 0 && activeTab === 2 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div
              className={`p-6 sm:p-8 rounded-3xl border backdrop-blur-xl ${
                isDark
                  ? "bg-slate-900/80 border-purple-500/30"
                  : "bg-[#fbf9f3] border-[#eee8de] text-slate-800 shadow-md"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2 text-rose-500">
                    <span>📱</span>
                    <span>Phone Detection Timeline</span>
                  </h3>
                  <p className={`text-xs sm:text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Chronological record of all detected mobile phone distraction events for {selectedDate}.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  {phoneEvents.length} Events Detected
                </span>
              </div>

              {phoneEvents.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <span className="text-5xl mb-3 block">🎉</span>
                  <h4 className="text-lg font-bold text-emerald-400 mb-1">Zero Phone Distractions!</h4>
                  <p className="text-xs sm:text-sm text-slate-400">
                    No cell phone was detected during your study session on this date. Great discipline!
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className={`border-b ${isDark ? "border-slate-800 text-slate-400" : "border-slate-200 text-slate-600"}`}>
                        <th className="py-3 font-bold">#</th>
                        <th className="py-3 font-bold">Timestamp</th>
                        <th className="py-3 font-bold">Status</th>
                        <th className="py-3 font-bold text-center">Focus Score</th>
                        <th className="py-3 font-bold text-right">Detection</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {phoneEvents.map((event, idx) => (
                        <tr key={idx} className="hover:bg-rose-500/5 transition">
                          <td className="py-2.5 text-slate-500 font-mono">{idx + 1}</td>
                          <td className="py-2.5 font-mono font-medium">{event.timestamp}</td>
                          <td className="py-2.5 font-semibold text-rose-400">{event.status}</td>
                          <td className="py-2.5 text-center font-bold">
                            <span className="px-2 py-0.5 rounded-md text-xs bg-rose-500/10 text-rose-300 font-mono">
                              {event.focus_score} / 100
                            </span>
                          </td>
                          <td className="py-2.5 text-right">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-600 text-white">
                              📱 Phone
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: EXPORT REPORTS
        ========================================================================= */}
        {!loading && availableDates.length > 0 && activeTab === 3 && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div
              className={`p-6 sm:p-8 rounded-3xl border backdrop-blur-xl ${
                isDark
                  ? "bg-slate-900/80 border-purple-500/30"
                  : "bg-[#fbf9f3] border-[#eee8de] text-slate-800 shadow-md"
              }`}
            >
              <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                <span>📅</span>
                <span>Export Focus Reports (Client-Side PDF)</span>
              </h3>
              <p className={`text-xs sm:text-sm mb-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Generate comprehensive study analytics PDFs directly in your browser. All downloaded reports are also automatically saved in your Analytics Saved Reports tab!
              </p>

              {saveNotification && (
                <div className="mb-6 p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-between text-sm animate-in fade-in">
                  <span className="font-semibold">{saveNotification}</span>
                  <Link
                    to="/analytics"
                    className="underline text-xs font-bold hover:text-white ml-3 shrink-0"
                  >
                    View in Analytics ➔
                  </Link>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Today PDF */}
                <div
                  className={`p-6 rounded-2xl border flex flex-col justify-between transition hover:scale-[1.02] ${
                    isDark ? "bg-slate-800/40 border-purple-500/30" : "bg-white/80 border-slate-200 shadow-md"
                  }`}
                >
                  <div>
                    <div className="text-3xl mb-3">📄</div>
                    <h4 className="text-lg font-bold mb-1">Today's Session Report</h4>
                    <p className="text-xs text-slate-400 mb-6">
                      Export detailed KPIs, status distribution, and score breakdown for {selectedDate}.
                    </p>
                  </div>
                  <button
                    onClick={generateTodayPDF}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-white shadow-md hover:scale-[1.02] active:scale-95 transition ${
                      isDark
                        ? "bg-gradient-to-r from-emerald-500 to-teal-600 shadow-emerald-500/25"
                        : "bg-[#1b3f30] hover:bg-[#143024] shadow-emerald-950/20"
                    }`}
                  >
                    ⬇️ Download Today PDF
                  </button>
                </div>

                {/* Weekly PDF */}
                <div
                  className={`p-6 rounded-2xl border flex flex-col justify-between transition hover:scale-[1.02] ${
                    isDark ? "bg-slate-800/40 border-indigo-500/30" : "bg-white/80 border-slate-200 shadow-md"
                  }`}
                >
                  <div>
                    <div className="text-3xl mb-3">🗂️</div>
                    <h4 className="text-lg font-bold mb-1">Weekly Summary PDF</h4>
                    <p className="text-xs text-slate-400 mb-6">
                      7-day historical focus percentage, average scores, and phone detection summaries.
                    </p>
                  </div>
                  <button
                    onClick={generateWeeklyPDF}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-white shadow-md hover:scale-[1.02] active:scale-95 transition ${
                      isDark
                        ? "bg-gradient-to-r from-indigo-500 to-purple-600 shadow-indigo-500/25"
                        : "bg-[#1b3f30] hover:bg-[#143024] shadow-emerald-950/20"
                    }`}
                  >
                    ⬇️ Download Weekly PDF
                  </button>
                </div>

                {/* Monthly PDF */}
                <div
                  className={`p-6 rounded-2xl border flex flex-col justify-between transition hover:scale-[1.02] ${
                    isDark ? "bg-slate-800/40 border-pink-500/30" : "bg-white/80 border-slate-200 shadow-md"
                  }`}
                >
                  <div>
                    <div className="text-3xl mb-3">🗓️</div>
                    <h4 className="text-lg font-bold mb-1">Monthly Focus Report</h4>
                    <p className="text-xs text-slate-400 mb-6">
                      Aggregated monthly study trends, consistency metrics, and focus evolution.
                    </p>
                  </div>
                  <button
                    onClick={generateMonthlyPDF}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-white shadow-md hover:scale-[1.02] active:scale-95 transition ${
                      isDark
                        ? "bg-gradient-to-r from-pink-500 to-rose-600 shadow-pink-500/25"
                        : "bg-[#1b3f30] hover:bg-[#143024] shadow-emerald-950/20"
                    }`}
                  >
                    ⬇️ Download Monthly PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 4: COMPARISON
        ========================================================================= */}
        {!loading && availableDates.length > 0 && activeTab === 4 && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Weekly Comparison */}
            <div
              className={`p-6 sm:p-8 rounded-3xl border backdrop-blur-xl ${
                isDark
                  ? "bg-slate-900/80 border-purple-500/30"
                  : "bg-[#fbf9f3] border-[#eee8de] text-slate-800 shadow-md"
              }`}
            >
              <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                <span>📆</span>
                <span>Weekly Comparison (This Week vs Last Week)</span>
              </h3>
              <p className={`text-xs sm:text-sm mb-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Assess weekly improvement in overall study focus percentage.
              </p>

              {weeklyComparison && weeklyComparison.thisWeek !== null ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-6">
                    <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                      <span className="text-xs text-slate-400 block font-bold">This Week Avg Focus</span>
                      <span className="text-2xl font-black text-purple-400">{weeklyComparison.thisWeek}%</span>
                    </div>

                    {weeklyComparison.lastWeek !== null ? (
                      <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700">
                        <span className="text-xs text-slate-400 block font-bold">Last Week Avg Focus</span>
                        <span className="text-2xl font-black text-slate-300">{weeklyComparison.lastWeek}%</span>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 italic">No previous week recorded yet.</div>
                    )}
                  </div>

                  {weeklyComparison.change !== null && (
                    <div
                      className={`p-3.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 ${
                        weeklyComparison.change >= 0
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      <span>{weeklyComparison.change >= 0 ? "✅" : "⚠️"}</span>
                      <span>
                        {weeklyComparison.change >= 0
                          ? `Improvement of +${weeklyComparison.change}% this week!`
                          : `Decrease of ${weeklyComparison.change}% this week.`}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-slate-400 italic">Not enough historical logs recorded yet.</div>
              )}
            </div>

            {/* Compare Two Days */}
            <div
              className={`p-6 sm:p-8 rounded-3xl border backdrop-blur-xl ${
                isDark
                  ? "bg-slate-900/80 border-purple-500/30"
                  : "bg-[#fbf9f3] border-[#eee8de] text-slate-800 shadow-md"
              }`}
            >
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span>🔄</span>
                <span>Compare Two Days</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Select First Day:</label>
                  <select
                    value={compareDay1}
                    onChange={(e) => handleCompareDay1Change(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-sm font-semibold border ${
                      isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-800"
                    }`}
                  >
                    {availableDates.map((d) => (
                      <option key={`d1-${d}`} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Select Second Day:</label>
                  <select
                    value={compareDay2}
                    onChange={(e) => handleCompareDay2Change(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-sm font-semibold border ${
                      isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-800"
                    }`}
                  >
                    {availableDates.map((d) => (
                      <option key={`d2-${d}`} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Side-by-side metric display */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                  <h4 className="text-sm font-bold text-purple-300 mb-2">{compareDay1}</h4>
                  <div className="text-3xl font-extrabold text-purple-400 mb-1">{day1Stats.focusPct}% Focused</div>
                  <div className="text-xs text-slate-400">
                    Avg Score: {day1Stats.avgScore} | Total: {day1Stats.total} pts
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                  <h4 className="text-sm font-bold text-indigo-300 mb-2">{compareDay2}</h4>
                  <div className="text-3xl font-extrabold text-indigo-400 mb-1">{day2Stats.focusPct}% Focused</div>
                  <div className="text-xs text-slate-400">
                    Avg Score: {day2Stats.avgScore} | Total: {day2Stats.total} pts
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 5: HISTORY TREND
        ========================================================================= */}
        {!loading && availableDates.length > 0 && activeTab === 5 && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div
              className={`p-6 sm:p-8 rounded-3xl border backdrop-blur-xl ${
                isDark
                  ? "bg-slate-900/80 border-purple-500/30"
                  : "bg-[#fbf9f3] border-[#eee8de] text-slate-800 shadow-md"
              }`}
            >
              <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                <span>📊</span>
                <span>Focus Improvement Over Days</span>
              </h3>
              <p className={`text-xs sm:text-sm mb-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Longitudinal focus percentage trends across all recorded study days.
              </p>

              {/* Line Chart */}
              <div className="h-64 sm:h-80 w-full mb-8">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historyTrendData} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#334155" : "#e2e8f0"} />
                    <XAxis dataKey="date" tick={{ fill: isDark ? "#94a3b8" : "#475569", fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: isDark ? "#94a3b8" : "#475569", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? "#0f172a" : "#ffffff",
                        borderColor: isDark ? "#475569" : "#cbd5e1",
                        borderRadius: "12px",
                      }}
                    />
                    <Line type="monotone" dataKey="focusPct" stroke="#00FFAA" strokeWidth={3} dot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* History Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className={`border-b ${isDark ? "border-slate-800 text-slate-400" : "border-slate-200 text-slate-600"}`}>
                      <th className="py-2.5 font-bold">Date</th>
                      <th className="py-2.5 font-bold text-center">Focus %</th>
                      <th className="py-2.5 font-bold text-center">Avg Score</th>
                      <th className="py-2.5 font-bold text-center">Phone Events</th>
                      <th className="py-2.5 font-bold text-right">Total Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {historyTrendData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-purple-500/5 transition">
                        <td className="py-2.5 font-mono font-medium">{row.date}</td>
                        <td className="py-2.5 text-center font-bold text-emerald-400">{row.focusPct}%</td>
                        <td className="py-2.5 text-center font-mono font-semibold">{row.avgScore}</td>
                        <td className="py-2.5 text-center font-mono text-rose-400">{row.phoneEvents}</td>
                        <td className="py-2.5 text-right font-mono text-slate-400">{row.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 6: RAW LOG
        ========================================================================= */}
        {!loading && availableDates.length > 0 && activeTab === 6 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div
              className={`p-6 sm:p-8 rounded-3xl border backdrop-blur-xl ${
                isDark
                  ? "bg-slate-900/80 border-purple-500/30"
                  : "bg-[#fbf9f3] border-[#eee8de] text-slate-800 shadow-md"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <span>🗂️</span>
                    <span>Raw Log Data ({selectedDate})</span>
                  </h3>
                  <p className={`text-xs sm:text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Inspect the underlying second-by-second biometric records stored inside browser IndexedDB.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => exportLogsToCSV(selectedDate)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow transition hover:scale-105 active:scale-95 ${
                      isDark
                        ? "bg-purple-600 hover:bg-purple-700"
                        : "bg-[#1b3f30] hover:bg-[#143024] shadow-emerald-950/20"
                    }`}
                  >
                    ⬇️ Export CSV
                  </button>
                  <button
                    onClick={handleClearData}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow transition hover:scale-105 active:scale-95"
                  >
                    🗑️ Clear Local Logs
                  </button>
                </div>
              </div>

              {/* Log Table */}
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className={`sticky top-0 ${isDark ? "bg-slate-900 text-slate-400" : "bg-slate-100 text-slate-600"}`}>
                    <tr className="border-b border-slate-700">
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Gaze</th>
                      <th className="py-2.5 px-3 text-center">Faces</th>
                      <th className="py-2.5 px-3 text-center">Phone</th>
                      <th className="py-2.5 px-3 text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {logs
                      .slice((rawPage - 1) * rawPageSize, rawPage * rawPageSize)
                      .map((log, idx) => (
                        <tr key={idx} className="hover:bg-purple-500/5 transition">
                          <td className="py-2 px-3 whitespace-nowrap">{log.timestamp}</td>
                          <td className="py-2 px-3 font-semibold">{log.status}</td>
                          <td className="py-2 px-3 text-purple-400">{log.gaze_status}</td>
                          <td className="py-2 px-3 text-center">{log.faces_detected}</td>
                          <td className="py-2 px-3 text-center">
                            {log.phone_detected ? (
                              <span className="text-rose-400 font-bold">1 📱</span>
                            ) : (
                              "0"
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-400">{log.focus_score}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 text-xs">
                <span className="text-slate-400">
                  Showing {(rawPage - 1) * rawPageSize + 1} - {Math.min(rawPage * rawPageSize, logs.length)} of {logs.length}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={rawPage <= 1}
                    onClick={() => setRawPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg border bg-slate-800 text-white disabled:opacity-30"
                  >
                    Previous
                  </button>
                  <button
                    disabled={rawPage * rawPageSize >= logs.length}
                    onClick={() => setRawPage((p) => p + 1)}
                    className="px-3 py-1.5 rounded-lg border bg-slate-800 text-white disabled:opacity-30"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MonitoringDashboard;
