import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAdmin } from "../../context/AdminContext";
import { useAppContext } from "../../context/AppContext";
import API_BASE from "../../services/apiBase";

const AdminNotifications = () => {
  const { token, fetchStats, stats } = useAdmin();
  const { theme } = useAppContext();
  const isDark = theme === "dark";
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all"); // "all" | "unread" | "feedback" | "faq"
  const [actionLoading, setActionLoading] = useState(false);

  const fetchNotifications = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setNotifications(data.notifications || []);
        }
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [token]);

  // Mark single read
  const handleMarkRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`${API_BASE}/api/admin/notifications/${id}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
        );
        await fetchStats();
      }
    } catch (err) {
      console.error("Error marking notification read:", err);
    }
  };

  // Mark all read
  const handleMarkAllRead = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/notifications/mark-all-read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        await fetchStats();
      }
    } catch (err) {
      console.error("Error marking all read:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete single notification
  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`${API_BASE}/api/admin/notifications/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotifications((prev) => prev.filter((n) => n._id !== id));
        await fetchStats();
      }
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  // Navigate on click
  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      await handleMarkRead(notif._id);
    }
    if (notif.type === "feedback") {
      navigate("/admin/feedback-requests");
    } else if (notif.type === "faq") {
      navigate("/admin/faq-questions");
    }
  };

  // Filtered notifications
  const filteredNotifications = notifications.filter((n) => {
    if (filterType === "unread") return !n.isRead;
    if (filterType === "feedback") return n.type === "feedback";
    if (filterType === "faq") return n.type === "faq";
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Bar */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b ${
        isDark ? "border-white/10" : "border-[#eee8de]"
      }`}>
        <div>
          <h2 className={`text-xl sm:text-2xl font-bold flex items-center gap-2 ${isDark ? "text-white" : "text-slate-800"}`}>
            <span>Notifications Center</span>
            {stats.unreadNotifications > 0 && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/30">
                {stats.unreadNotifications} Unread
              </span>
            )}
          </h2>
          <p className={`text-xs sm:text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            Real-time alerts triggered by student feedback submissions and public FAQ inquiries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {stats.unreadNotifications > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={actionLoading}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                isDark
                  ? "bg-purple-500/15 border-purple-500/30 text-purple-300 hover:bg-purple-500/25"
                  : "bg-[#eaf3ee] border border-[#1b3f30]/30 text-[#1b3f30] hover:bg-[#d4e7dd] shadow-xs"
              }`}
            >
              Mark All as Read
            </button>
          )}

          <button
            onClick={fetchNotifications}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
              isDark
                ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
                : "bg-[#eaf3ee] text-[#1b3f30] border border-[#1b3f30]/30 hover:bg-[#d4e7dd] shadow-xs"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilterType("all")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            filterType === "all"
              ? isDark
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25"
                : "bg-[#1b3f30] text-white shadow-md"
              : isDark
              ? "bg-slate-800/80 border border-white/10 text-slate-300 hover:bg-slate-700"
              : "bg-[#eaf3ee] border border-[#1b3f30]/30 text-[#1b3f30] hover:bg-[#d4e7dd] shadow-xs"
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilterType("unread")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            filterType === "unread"
              ? isDark
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25"
                : "bg-[#1b3f30] text-white shadow-md"
              : isDark
              ? "bg-slate-800/80 border border-white/10 text-slate-300 hover:bg-slate-700"
              : "bg-[#eaf3ee] border border-[#1b3f30]/30 text-[#1b3f30] hover:bg-[#d4e7dd] shadow-xs"
          }`}
        >
          Unread ({notifications.filter((n) => !n.isRead).length})
        </button>
        <button
          onClick={() => setFilterType("feedback")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            filterType === "feedback"
              ? isDark
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25"
                : "bg-[#1b3f30] text-white shadow-md"
              : isDark
              ? "bg-slate-800/80 border border-white/10 text-slate-300 hover:bg-slate-700"
              : "bg-[#eaf3ee] border border-[#1b3f30]/30 text-[#1b3f30] hover:bg-[#d4e7dd] shadow-xs"
          }`}
        >
          Feedbacks ({notifications.filter((n) => n.type === "feedback").length})
        </button>
        <button
          onClick={() => setFilterType("faq")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            filterType === "faq"
              ? isDark
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25"
                : "bg-[#1b3f30] text-white shadow-md"
              : isDark
              ? "bg-slate-800/80 border border-white/10 text-slate-300 hover:bg-slate-700"
              : "bg-[#eaf3ee] border border-[#1b3f30]/30 text-[#1b3f30] hover:bg-[#d4e7dd] shadow-xs"
          }`}
        >
          FAQ Questions ({notifications.filter((n) => n.type === "faq").length})
        </button>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          <div className={`w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3 ${
            isDark ? "border-indigo-500" : "border-[#1b3f30]"
          }`} />
          Loading notifications...
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className={`py-16 text-center rounded-2xl border p-8 ${
          isDark
            ? "bg-slate-900/80 backdrop-blur-2xl border-white/10 text-white shadow-xl"
            : "bg-[#fbf9f3] border-[#eee8de] text-slate-800 shadow-[0_10px_35px_rgba(0,0,0,0.04)]"
        }`}>
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
            No Notifications Found
          </h3>
          <p className={`text-sm max-w-sm mx-auto mt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            {filterType !== "all"
              ? "No notifications match this filter."
              : "You're completely up to date! When users submit reviews or questions, alerts will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notif) => (
            <div
              key={notif._id}
              onClick={() => handleNotificationClick(notif)}
              className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                notif.isRead
                  ? isDark
                    ? "bg-slate-900/60 backdrop-blur-xl border-white/10 text-slate-300 opacity-80 hover:opacity-100 hover:border-white/20"
                    : "bg-white border-[#eee8de] text-slate-700 opacity-90 hover:opacity-100 hover:border-[#1b3f30]/30 shadow-xs"
                  : isDark
                  ? "bg-slate-900/90 backdrop-blur-2xl border-purple-500/40 text-white shadow-xl ring-1 ring-purple-500/20 hover:border-purple-500/60"
                  : "bg-[#fbf9f3] border-[#1b3f30]/40 text-slate-800 shadow-[0_10px_35px_rgba(0,0,0,0.04)] ring-1 ring-[#1b3f30]/20 hover:border-[#1b3f30]"
              }`}
            >
              <div className="flex items-start gap-3.5 flex-1 min-w-0">
                {/* Icon */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    notif.type === "feedback"
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25"
                      : "bg-[#eaf3ee] text-[#1b3f30] border border-[#1b3f30]/30"
                  }`}
                >
                  {notif.type === "feedback" ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>

                {/* Text */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {!notif.isRead && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0 animate-pulse" />
                    )}
                    <h4 className={`font-bold text-sm truncate ${isDark ? "text-white" : "text-slate-800"}`}>
                      {notif.title}
                    </h4>
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                      • {notif.type}
                    </span>
                  </div>

                  <p className={`text-xs sm:text-sm mt-1 line-clamp-2 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                    {notif.message}
                  </p>

                  <span className="text-[11px] text-slate-400 mt-1.5 block">
                    {notif.createdAt &&
                      new Date(notif.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                {!notif.isRead && (
                  <button
                    onClick={(e) => handleMarkRead(notif._id, e)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition cursor-pointer ${
                      isDark
                        ? "bg-slate-800/80 border-white/10 text-slate-300 hover:bg-slate-700"
                        : "bg-[#eaf3ee] border-[#1b3f30]/30 text-[#1b3f30] hover:bg-[#d4e7dd] shadow-xs"
                    }`}
                  >
                    Mark Read
                  </button>
                )}

                <button
                  onClick={(e) => handleDelete(notif._id, e)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition cursor-pointer"
                  title="Delete notification"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminNotifications;

