import React, { useState, useEffect } from "react";
import { useAdmin } from "../../context/AdminContext";
import { useAppContext } from "../../context/AppContext";
import API_BASE from "../../services/apiBase";
import ConfirmationModal from "../../components/admin/ConfirmationModal";

const AdminRejectedFeedback = () => {
  const { token, fetchStats } = useAdmin();
  const { theme } = useAppContext();
  const isDark = theme === "dark";
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Modal confirmation
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    actionType: "approve",
    confirmText: "",
    onConfirm: () => {},
  });

  const fetchFeedbacks = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/feedbacks?status=rejected`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setFeedbacks(data.feedbacks || []);
        }
      }
    } catch (err) {
      console.error("Error fetching rejected feedbacks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, [token]);

  // Actions
  const handleRestoreApprove = (fb) => {
    setConfirmModal({
      isOpen: true,
      title: "Restore & Publish Feedback",
      message: `Restore feedback from "${fb.name || "Anonymous"}"? It will be marked as approved and will appear on the public Feedback Journey Roadmap.`,
      actionType: "approve",
      confirmText: "Restore & Publish",
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const res = await fetch(`${API_BASE}/api/admin/feedbacks/${fb._id}/approve`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            await fetchFeedbacks();
            await fetchStats();
          }
        } catch (err) {
          console.error("Restore error:", err);
        } finally {
          setActionLoading(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleDelete = (fb) => {
    setConfirmModal({
      isOpen: true,
      title: "Permanently Delete Feedback",
      message: `Permanently remove this rejected feedback from MongoDB? This operation cannot be undone.`,
      actionType: "delete",
      confirmText: "Delete Permanently",
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const res = await fetch(`${API_BASE}/api/admin/feedbacks/${fb._id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            await fetchFeedbacks();
            await fetchStats();
          }
        } catch (err) {
          console.error("Delete feedback error:", err);
        } finally {
          setActionLoading(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const filteredFeedbacks = feedbacks.filter((fb) => {
    return (
      (fb.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (fb.review || fb.message || fb.feedbackText || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (fb.milestone || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (fb.role || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Bar */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b ${
        isDark ? "border-white/10" : "border-[#eee8de]"
      }`}>
        <div>
          <h2 className={`text-xl sm:text-2xl font-bold flex items-center gap-2 ${isDark ? "text-white" : "text-slate-800"}`}>
            <span>Rejected Feedback Archive</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/30">
              {feedbacks.length} Archived
            </span>
          </h2>
          <p className={`text-xs sm:text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            Archived feedback submissions that were declined or unpublished. You can restore them to the public roadmap or permanently delete them.
          </p>
        </div>

        <button
          onClick={fetchFeedbacks}
          className={`self-start sm:self-auto px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
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

      {/* Filter and Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search archived feedback..."
          className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm placeholder-slate-400 focus:outline-none focus:ring-2 ${
            isDark
              ? "bg-slate-800/80 border-white/15 text-white focus:ring-purple-500/50"
              : "bg-white border-[#eee8de] text-slate-800 shadow-sm focus:ring-[#1b3f30]/40"
          }`}
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          <div className={`w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3 ${
            isDark ? "border-indigo-500" : "border-[#1b3f30]"
          }`} />
          Loading rejected feedbacks...
        </div>
      ) : filteredFeedbacks.length === 0 ? (
        <div className={`py-16 text-center rounded-2xl border p-8 ${
          isDark
            ? "bg-slate-900/80 backdrop-blur-2xl border-white/10 text-white shadow-xl"
            : "bg-[#fbf9f3] border-[#eee8de] text-slate-800 shadow-[0_10px_35px_rgba(0,0,0,0.04)]"
        }`}>
          <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
            No Rejected Feedback
          </h3>
          <p className={`text-sm max-w-sm mx-auto mt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            {searchQuery
              ? "No archived feedback matches your search query."
              : "No feedback submissions are currently in the rejected archive."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFeedbacks.map((fb) => (
            <div
              key={fb._id}
              className={`p-5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                isDark
                  ? "bg-slate-900/80 backdrop-blur-2xl border-white/10 text-white shadow-xl hover:border-purple-500/40"
                  : "bg-[#fbf9f3] border-[#eee8de] text-slate-800 shadow-[0_10px_35px_rgba(0,0,0,0.04)] hover:border-[#1b3f30]/40 hover:shadow-md"
              }`}
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-sm ${isDark ? "text-white" : "text-slate-800"}`}>
                    {fb.name || "Anonymous User"}
                  </span>
                  {fb.milestone && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      isDark
                        ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30"
                        : "bg-[#eaf3ee] text-[#1b3f30] border-[#1b3f30]/30"
                    }`}>
                      {fb.milestone}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                    Rejected
                  </span>
                  {fb.role && (
                    <span className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>• {fb.role}</span>
                  )}
                </div>

                <div className={`p-3 rounded-xl border text-xs sm:text-sm ${
                  isDark
                    ? "bg-slate-800/60 border-white/10 text-slate-200"
                    : "bg-white border-[#eee8de] text-slate-800 shadow-sm"
                }`}>
                  "{fb.review || fb.message || fb.feedbackText}"
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleRestoreApprove(fb)}
                  disabled={actionLoading}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                    isDark
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                      : "bg-[#1b3f30] hover:bg-[#143024] text-white shadow-md hover:scale-[1.02] active:scale-95"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Restore & Publish</span>
                </button>

                <button
                  onClick={() => handleDelete(fb)}
                  disabled={actionLoading}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl text-rose-500 hover:bg-rose-500/10 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
    </div>
  );
};

export default AdminRejectedFeedback;
