import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import API_BASE from "../services/apiBase";
import Navbar from "./Navbar";
import PageIntroCard from "./PageIntroCard";

const Analytics = () => {
  const { theme } = useAppContext();
  const isDark = theme === "dark";

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch all saved monitoring & focus reports from backend
  const fetchReports = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/api/reports/my`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: "include",
      });
      const data = await res.json();
      if (data.success && data.reports) {
        setReports(data.reports);
      }
    } catch (err) {
      console.error("Failed to load saved reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

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

        <div
          className={`p-6 sm:p-8 rounded-3xl border backdrop-blur-xl transition-all duration-300 shadow-xl ${
            isDark
              ? "bg-slate-900/80 border-purple-500/20 text-white shadow-2xl"
              : "bg-[#fbf9f3] border-[#eee8de] shadow-[0_10px_35px_rgba(0,0,0,0.04)] text-slate-800"
          }`}
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h2 className="text-xl sm:text-2xl font-black mb-1 flex items-center gap-2.5">
                <span className="text-2xl sm:text-3xl">📑</span>
                <span className={isDark ? "text-white" : "text-slate-900"}>
                  Saved Monitoring & Focus Reports
                </span>
              </h2>
              <p className={`text-xs sm:text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                All downloaded and saved session reports from your monitoring dashboard.
              </p>
            </div>
            <button
              onClick={fetchReports}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-95 ${
                isDark
                  ? "bg-emerald-950/50 text-emerald-300 hover:bg-emerald-900/60 border border-emerald-500/40"
                  : "bg-[#eaf3ee] text-[#1b3f30] hover:bg-[#d4e7dd] border border-[#1b3f30]/30"
              }`}
            >
              <span>↻</span>
              <span>Refresh Reports</span>
            </button>
          </div>

          {/* Loading Spinner */}
          {loading && (
            <div className="flex justify-center items-center py-24">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          )}

          {/* Empty State */}
          {!loading && reports.length === 0 && (
            <div className="text-center py-20 px-4">
              <span className="text-5xl mb-3 block">📑</span>
              <p className="text-base font-bold mb-1">No saved reports found yet.</p>
              <p className={`text-xs sm:text-sm max-w-md mx-auto mb-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                When you export or download reports from your Monitoring Dashboard, they will automatically appear here.
              </p>
              <Link
                to="/monitoring"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg hover:scale-105 transition"
              >
                <span>Go to Monitoring Dashboard</span>
                <span>➔</span>
              </Link>
            </div>
          )}

          {/* Reports Grid */}
          {!loading && reports.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reports.map((pdf) => {
                const rawUrl = pdf.fileUrl || pdf.pdfUrl;
                const fullUrl = rawUrl
                  ? rawUrl.startsWith("http")
                    ? rawUrl
                    : `${API_BASE}${rawUrl}`
                  : null;

                return (
                  <div
                    key={pdf._id}
                    className={`rounded-2xl p-5 border transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between ${
                      isDark
                        ? "bg-slate-800/70 border-slate-700/60 shadow-md hover:border-purple-500/40"
                        : "bg-white border-[#eee8de] shadow-sm hover:border-indigo-300"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl shrink-0">📄</span>
                        <h4 className={`font-bold text-sm truncate flex-1 ${isDark ? "text-white" : "text-slate-900"}`}>
                          {pdf.title || "Study Session Report"}
                        </h4>
                      </div>
                      <p className={`text-xs mb-4 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Saved on:{" "}
                        {pdf.createdAt
                          ? new Date(pdf.createdAt).toLocaleString("en-GB", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })
                          : "Recent"}
                      </p>
                    </div>

                    {fullUrl && (
                      <div className="flex gap-2.5 mt-2">
                        <a
                          href={fullUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={`flex-1 text-center py-2 px-3 rounded-xl text-xs font-bold transition-all shadow-md hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-1.5 ${
                            isDark
                              ? "bg-blue-950/70 text-blue-300 border border-blue-800/80 hover:bg-blue-900/80"
                              : "bg-[#eaf3ee] text-[#1b3f30] border border-[#1b3f30]/30 hover:bg-[#d4e7dd]"
                          }`}
                        >
                          <span>👁️</span>
                          <span>View PDF</span>
                        </a>
                        <a
                          href={fullUrl}
                          download={pdf.title ? `${pdf.title}.pdf` : "Study_Report.pdf"}
                          className={`flex-1 text-center py-2 px-3 rounded-xl text-xs font-bold text-white transition-all shadow-md hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-1.5 ${
                            isDark
                              ? "bg-[#4f46e5] hover:bg-[#4338ca] shadow-indigo-500/25"
                              : "bg-[#1b3f30] hover:bg-[#143024] shadow-emerald-950/20"
                          }`}
                        >
                          <span>⬇️</span>
                          <span>Download</span>
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
