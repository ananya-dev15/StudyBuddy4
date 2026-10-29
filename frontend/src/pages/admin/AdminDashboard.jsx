import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAdmin } from "../../context/AdminContext";
import { useAppContext } from "../../context/AppContext";
import API_BASE from "../../services/apiBase";
import ConfirmationModal from "../../components/admin/ConfirmationModal";

const AdminDashboard = () => {
  const { stats, fetchStats, token } = useAdmin();
  const { theme } = useAppContext();
  const isDark = theme === "dark";
  const [recentPendingFeedbacks, setRecentPendingFeedbacks] = useState([]);
  const [recentPendingFAQs, setRecentPendingFAQs] = useState([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);

  // Quick Action Modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    actionType: "approve",
    confirmText: "",
    onConfirm: () => {},
  });

  const [answeringFAQ, setAnsweringFAQ] = useState(null);
  const [faqAnswerText, setFaqAnswerText] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRecentItems = async () => {
    if (!token) return;
    setIsLoadingRecent(true);
    try {
      const [feedbacksRes, faqsRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/feedbacks?status=pending`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/admin/faqs?status=pending`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (feedbacksRes.ok) {
        const fData = await feedbacksRes.json();
        if (fData.success) {
          setRecentPendingFeedbacks((fData.feedbacks || []).slice(0, 4));
        }
      }

      if (faqsRes.ok) {
        const qData = await faqsRes.json();
        if (qData.success) {
          setRecentPendingFAQs((qData.faqs || []).slice(0, 4));
        }
      }
    } catch (err) {
      console.error("Error fetching recent pending items:", err);
    } finally {
      setIsLoadingRecent(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchRecentItems();
  }, [token]);

  // Quick Approve Feedback
  const handleQuickApproveFeedback = (fb) => {
    setConfirmModal({
      isOpen: true,
      title: "Approve Feedback",
      message: `Are you sure you want to approve "${fb.name || "Anonymous"}"'s feedback? It will be published immediately to the public Roadmap.`,
      actionType: "approve",
      confirmText: "Approve & Publish",
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const res = await fetch(`${API_BASE}/api/admin/feedbacks/${fb._id}/approve`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            await fetchStats();
            await fetchRecentItems();
          }
        } catch (err) {
          console.error("Approve error:", err);
        } finally {
          setActionLoading(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Quick Reject Feedback
  const handleQuickRejectFeedback = (fb) => {
    setConfirmModal({
      isOpen: true,
      title: "Reject Feedback",
      message: `Are you sure you want to reject this feedback? It will not appear on the public Roadmap.`,
      actionType: "reject",
      confirmText: "Reject Feedback",
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const res = await fetch(`${API_BASE}/api/admin/feedbacks/${fb._id}/reject`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            await fetchStats();
            await fetchRecentItems();
          }
        } catch (err) {
          console.error("Reject error:", err);
        } finally {
          setActionLoading(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Quick Answer FAQ submit
  const handlePublishAnswer = async (e) => {
    e.preventDefault();
    if (!answeringFAQ || !faqAnswerText.trim()) return;

    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/faqs/${answeringFAQ._id}/answer`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ answer: faqAnswerText.trim() }),
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setAnsweringFAQ(null);
        setFaqAnswerText("");
        await fetchStats();
        await fetchRecentItems();
      } else {
        alert(data?.message || "Failed to publish answer. Status: " + res.status);
      }
    } catch (err) {
      console.error("Publish FAQ error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const statCards = [
    {
      label: "Pending Feedback",
      count: stats.pendingFeedbacks,
      hint: "Requires verification",
      link: "/admin/feedback-requests",
      accent: "from-amber-500 to-orange-500",
      bgBadge: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30",
      icon: (
        <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Approved Feedback",
      count: stats.approvedFeedbacks,
      hint: "Active on Roadmap",
      link: "/admin/approved-feedback",
      accent: "from-emerald-500 to-teal-500",
      bgBadge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
      icon: (
        <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Rejected Feedback",
      count: stats.rejectedFeedbacks,
      hint: "Archived submissions",
      link: "/admin/rejected-feedback",
      accent: "from-rose-500 to-pink-500",
      bgBadge: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30",
      icon: (
        <svg className="w-6 h-6 text-rose-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Total Feedback",
      count: stats.totalFeedbacks,
      hint: "All recorded reviews",
      link: "/admin/feedback-requests",
      accent: "from-blue-500 to-indigo-500",
      bgBadge: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30",
      icon: (
        <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
        </svg>
      ),
    },
    {
      label: "Pending Questions",
      count: stats.pendingFAQs,
      hint: "Awaiting your answer",
      link: "/admin/faq-questions",
      accent: "from-purple-500 to-violet-500",
      bgBadge: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30",
      icon: (
        <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Published FAQs",
      count: stats.publishedFAQs,
      hint: "Live on homepage",
      link: "/admin/published-faqs",
      accent: "from-indigo-500 to-sky-500",
      bgBadge: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30",
      icon: (
        <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      label: "Total FAQs",
      count: stats.totalFAQs,
      hint: "All questions in DB",
      link: "/admin/faq-questions",
      accent: "from-cyan-500 to-blue-500",
      bgBadge: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30",
      icon: (
        <svg className="w-6 h-6 text-cyan-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      label: "Unread Notifications",
      count: stats.unreadNotifications,
      hint: "Requires attention",
      link: "/admin/notifications",
      accent: "from-rose-500 to-orange-500",
      bgBadge: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30",
      icon: (
        <svg className="w-6 h-6 text-rose-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Welcome Banner */}
      <div className={`relative overflow-hidden rounded-2xl p-6 sm:p-8 transition-all ${
        isDark
          ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-xl shadow-indigo-500/15"
          : "bg-[#fbf9f3] border border-[#eee8de] text-slate-800 shadow-[0_10px_35px_rgba(0,0,0,0.04)]"
      }`}>
        <div className="relative z-10 max-w-2xl">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-3 ${
            isDark
              ? "bg-white/20 backdrop-blur-md text-white"
              : "bg-[#eaf3ee] text-[#1b3f30] border border-[#1b3f30]/30"
          }`}>
            <span>🛡️ StudyBuddy Control Center</span>
          </div>
          <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
            isDark ? "text-white" : "text-slate-800"
          }`}>
            Administrator Overview
          </h2>
          <p className={`mt-2 text-sm sm:text-base leading-relaxed ${
            isDark ? "text-indigo-100/90" : "text-slate-600"
          }`}>
            Manage student feedback, moderate community FAQs, review incoming submissions, and inspect live MongoDB platform metrics.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/admin/feedback-requests"
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md hover:scale-[1.02] active:scale-95 ${
                isDark
                  ? "bg-white text-indigo-600 hover:bg-indigo-50"
                  : "bg-[#1b3f30] hover:bg-[#143024] text-white shadow-[#1b3f30]/20"
              }`}
            >
              Review Pending Feedbacks ({stats.pendingFeedbacks})
            </Link>
            <Link
              to="/admin/faq-questions"
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all border shadow-xs hover:scale-[1.02] active:scale-95 ${
                isDark
                  ? "bg-white/15 backdrop-blur-md border-white/30 text-white hover:bg-white/25"
                  : "bg-[#eaf3ee] text-[#1b3f30] border border-[#1b3f30]/30 hover:bg-[#d4e7dd]"
              }`}
            >
              Answer FAQs ({stats.pendingFAQs})
            </Link>
            <button
              onClick={() => {
                fetchStats();
                fetchRecentItems();
              }}
              className={`px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer shadow-xs hover:scale-[1.02] active:scale-95 ${
                isDark
                  ? "bg-black/20 hover:bg-black/30 backdrop-blur-md text-white"
                  : "bg-[#eaf3ee] text-[#1b3f30] border border-[#1b3f30]/30 hover:bg-[#d4e7dd]"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh Stats</span>
            </button>
          </div>
        </div>

        {/* Ambient background decoration */}
        {isDark && (
          <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        )}
      </div>

      {/* 8 Stats Metrics Grid */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <span>Platform Metrics</span>
          <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
            (Synced live from MongoDB)
          </span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, idx) => (
            <Link
              key={idx}
              to={card.link}
              className={`group p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                isDark
                  ? "bg-slate-900/80 backdrop-blur-2xl border-white/10 text-white shadow-xl hover:border-purple-500/40"
                  : "bg-[#fbf9f3] border-[#eee8de] text-slate-800 shadow-[0_10px_35px_rgba(0,0,0,0.04)] hover:border-[#1b3f30]/40 hover:shadow-md"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {card.label}
                  </span>
                  <div className={`text-3xl font-black mt-1 ${isDark ? "text-white" : "text-slate-900"}`}>
                    {card.count}
                  </div>
                </div>
                <div className={`p-2.5 rounded-xl ${card.bgBadge}`}>
                  {card.icon}
                </div>
              </div>
              <div className={`mt-4 pt-3 border-t flex items-center justify-between text-xs ${
                isDark ? "border-white/10 text-slate-400" : "border-[#eee8de] text-slate-500"
              }`}>
                <span>{card.hint}</span>
                <span className={`group-hover:translate-x-1 transition-transform font-bold ${
                  isDark ? "text-indigo-400" : "text-[#1b3f30]"
                }`}>
                  View &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Two-Column Recent Pending Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Pending Feedbacks */}
        <div className={`rounded-2xl p-6 border transition-all flex flex-col justify-between ${
          isDark
            ? "bg-slate-900/80 backdrop-blur-2xl border-white/10 text-white shadow-xl"
            : "bg-[#fbf9f3] border-[#eee8de] text-slate-800 shadow-[0_10px_35px_rgba(0,0,0,0.04)]"
        }`}>
          <div>
            <div className={`flex items-center justify-between pb-4 border-b ${
              isDark ? "border-white/10" : "border-[#eee8de]"
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <h4 className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                  Pending Feedbacks
                </h4>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${
                  isDark
                    ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                    : "bg-[#eaf3ee] text-[#1b3f30] border-[#1b3f30]/30"
                }`}>
                  {stats.pendingFeedbacks}
                </span>
              </div>
              <Link
                to="/admin/feedback-requests"
                className={`text-xs font-bold hover:underline ${
                  isDark ? "text-indigo-400" : "text-[#1b3f30]"
                }`}
              >
                View All &rarr;
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {isLoadingRecent ? (
                <div className="py-8 text-center text-slate-400 text-sm">
                  Loading pending feedbacks...
                </div>
              ) : recentPendingFeedbacks.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">
                  🎉 No pending feedbacks awaiting verification!
                </div>
              ) : (
                recentPendingFeedbacks.map((fb) => (
                  <div
                    key={fb._id}
                    className={`p-4 rounded-xl border transition ${
                      isDark
                        ? "bg-slate-800/60 border-white/10 hover:border-white/20 text-white"
                        : "bg-white border-[#eee8de] hover:border-[#1b3f30]/30 text-slate-800 shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-sm truncate ${isDark ? "text-white" : "text-slate-900"}`}>
                            {fb.name || "Anonymous User"}
                          </span>
                          {fb.milestone && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                              isDark
                                ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30"
                                : "bg-[#eaf3ee] text-[#1b3f30] border-[#1b3f30]/30"
                            }`}>
                              {fb.milestone}
                            </span>
                          )}
                          {fb.role && (
                            <span className={`text-[11px] truncate ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                              • {fb.role}
                            </span>
                          )}
                        </div>
                        <p className={`text-xs mt-1 line-clamp-2 italic ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                          "{fb.review || fb.message || fb.feedbackText}"
                        </p>
                      </div>
                      <div className="flex items-center text-amber-500 flex-shrink-0 text-xs font-bold">
                        ★ {fb.stars || fb.rating || 5}
                      </div>
                    </div>

                    <div className={`mt-3 pt-2.5 border-t flex items-center justify-end gap-2 ${
                      isDark ? "border-white/10" : "border-[#eee8de]"
                    }`}>
                      <button
                        onClick={() => handleQuickRejectFeedback(fb)}
                        disabled={actionLoading}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleQuickApproveFeedback(fb)}
                        disabled={actionLoading}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg text-white transition-all shadow-md hover:scale-[1.02] active:scale-95 cursor-pointer ${
                          isDark
                            ? "bg-emerald-600 hover:bg-emerald-700"
                            : "bg-[#1b3f30] hover:bg-[#143024] shadow-[#1b3f30]/20"
                        }`}
                      >
                        Approve & Publish
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Pending FAQ Questions */}
        <div className={`rounded-2xl p-6 border transition-all flex flex-col justify-between ${
          isDark
            ? "bg-slate-900/80 backdrop-blur-2xl border-white/10 text-white shadow-xl"
            : "bg-[#fbf9f3] border-[#eee8de] text-slate-800 shadow-[0_10px_35px_rgba(0,0,0,0.04)]"
        }`}>
          <div>
            <div className={`flex items-center justify-between pb-4 border-b ${
              isDark ? "border-white/10" : "border-[#eee8de]"
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#1b3f30] animate-pulse" />
                <h4 className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                  Pending FAQ Questions
                </h4>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${
                  isDark
                    ? "bg-purple-500/15 text-purple-400 border-purple-500/30"
                    : "bg-[#eaf3ee] text-[#1b3f30] border-[#1b3f30]/30"
                }`}>
                  {stats.pendingFAQs}
                </span>
              </div>
              <Link
                to="/admin/faq-questions"
                className={`text-xs font-bold hover:underline ${
                  isDark ? "text-indigo-400" : "text-[#1b3f30]"
                }`}
              >
                View All &rarr;
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {isLoadingRecent ? (
                <div className="py-8 text-center text-slate-400 text-sm">
                  Loading pending questions...
                </div>
              ) : recentPendingFAQs.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">
                  ✨ No pending user questions awaiting answer!
                </div>
              ) : (
                recentPendingFAQs.map((faq) => (
                  <div
                    key={faq._id}
                    className={`p-4 rounded-xl border transition ${
                      isDark
                        ? "bg-slate-800/60 border-white/10 hover:border-white/20 text-white"
                        : "bg-white border-[#eee8de] hover:border-[#1b3f30]/30 text-slate-800 shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className={`text-xs font-bold ${isDark ? "text-purple-400" : "text-[#1b3f30]"}`}>
                          {faq.userName ? `From ${faq.userName}` : "Submitted by User"}
                        </span>
                        <p className={`text-sm font-bold mt-1 ${isDark ? "text-white" : "text-slate-900"}`}>
                          {faq.question}
                        </p>
                      </div>
                    </div>

                    <div className={`mt-3 pt-2.5 border-t flex items-center justify-end gap-2 ${
                      isDark ? "border-white/10" : "border-[#eee8de]"
                    }`}>
                      <button
                        onClick={() => {
                          setAnsweringFAQ(faq);
                          setFaqAnswerText("");
                        }}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg text-white transition-all shadow-md hover:scale-[1.02] active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                          isDark
                            ? "bg-indigo-600 hover:bg-indigo-700"
                            : "bg-[#1b3f30] hover:bg-[#143024] shadow-[#1b3f30]/20"
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        <span>Answer & Publish</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        actionType={confirmModal.actionType}
        confirmText={confirmModal.confirmText}
        loading={actionLoading}
      />

      {/* Quick Answer FAQ Modal */}
      {answeringFAQ && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-lg rounded-3xl shadow-2xl p-6 overflow-hidden border transition-all ${
            isDark
              ? "bg-slate-900/95 backdrop-blur-2xl border-white/15 text-white"
              : "bg-[#fbf9f3] border-[#eee8de] text-slate-800 shadow-2xl"
          }`}>
            <div className={`flex items-center justify-between pb-4 border-b ${
              isDark ? "border-white/10" : "border-[#eee8de]"
            }`}>
              <h3 className={`text-lg font-bold flex items-center gap-2 ${isDark ? "text-white" : "text-slate-900"}`}>
                <span>Answer & Publish FAQ</span>
              </h3>
              <button
                onClick={() => setAnsweringFAQ(null)}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  isDark ? "text-slate-400 hover:text-white hover:bg-white/5" : "text-slate-400 hover:text-slate-600 hover:bg-[#1b3f30]/10"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handlePublishAnswer} className="mt-4 space-y-4">
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${
                  isDark ? "text-slate-400" : "text-slate-500"
                }`}>
                  User Question
                </label>
                <div className={`p-3.5 rounded-xl border text-sm font-bold ${
                  isDark
                    ? "bg-slate-800/80 border-white/10 text-white"
                    : "bg-white border-[#eee8de] text-slate-800 shadow-xs"
                }`}>
                  {answeringFAQ.question}
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${
                  isDark ? "text-slate-400" : "text-slate-500"
                }`}>
                  Your Answer (Will be displayed publicly on website)
                </label>
                <textarea
                  required
                  rows={4}
                  value={faqAnswerText}
                  onChange={(e) => setFaqAnswerText(e.target.value)}
                  placeholder="Provide an informative, clear answer to this user question..."
                  className={`w-full p-3.5 rounded-xl border text-sm placeholder-slate-400 focus:outline-none focus:ring-2 ${
                    isDark
                      ? "bg-slate-800/80 border-white/15 text-white focus:ring-purple-500/50 focus:border-purple-500"
                      : "bg-white border-[#eee8de] text-slate-900 focus:ring-[#1b3f30]/40 focus:border-[#1b3f30]"
                  }`}
                />
              </div>

              <div className={`pt-3 border-t flex items-center justify-end gap-3 ${
                isDark ? "border-white/10" : "border-[#eee8de]"
              }`}>
                <button
                  type="button"
                  onClick={() => setAnsweringFAQ(null)}
                  disabled={actionLoading}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    isDark ? "text-slate-300 hover:bg-white/5" : "text-slate-600 hover:bg-[#1b3f30]/10"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !faqAnswerText.trim()}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-md hover:scale-[1.02] active:scale-95 disabled:opacity-50 cursor-pointer ${
                    isDark
                      ? "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-indigo-500/25"
                      : "bg-[#1b3f30] hover:bg-[#143024] shadow-[#1b3f30]/20"
                  }`}
                >
                  {actionLoading ? "Publishing..." : "Publish to Website"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
