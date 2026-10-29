import React, { useState, useEffect } from "react";
import { useAdmin } from "../../context/AdminContext";
import { useAppContext } from "../../context/AppContext";
import API_BASE from "../../services/apiBase";
import ConfirmationModal from "../../components/admin/ConfirmationModal";

const AdminFeedbackRequests = () => {
  const { token, fetchStats } = useAdmin();
  const { theme } = useAppContext();
  const isDark = theme === "dark";
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
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
      const res = await fetch(`${API_BASE}/api/admin/feedbacks?status=pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setFeedbacks(data.feedbacks || []);
        }
      }
    } catch (err) {
      console.error("Error fetching pending feedbacks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, [token]);

  // Actions
  const handleApprove = (fb) => {
    setConfirmModal({
      isOpen: true,
      title: "Approve Feedback",
      message: `Approve feedback from "${fb.name || "Anonymous"}"? It will immediately become visible to all students on the public Feedback Journey Roadmap.`,
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
            await fetchFeedbacks();
            await fetchStats();
          }
        } catch (err) {
          console.error("Approve feedback error:", err);
        } finally {
          setActionLoading(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleReject = (fb) => {
    setConfirmModal({
      isOpen: true,
      title: "Reject Feedback",
      message: `Reject feedback from "${fb.name || "Anonymous"}"? It will be moved to the Rejected Feedbacks archive and will not be displayed on the public site.`,
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
            await fetchFeedbacks();
            await fetchStats();
          }
        } catch (err) {
          console.error("Reject feedback error:", err);
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
      message: `Warning: This action will permanently remove this feedback from MongoDB and clean up any associated notifications. This cannot be undone.`,
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

  // Filtered feedbacks
  const filteredFeedbacks = feedbacks.filter((fb) => {
    const matchesSearch =
      (fb.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (fb.review || fb.message || fb.feedbackText || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (fb.milestone || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (fb.role || "").toLowerCase().includes(searchQuery.toLowerCase());

    const starsValue = Number(fb.stars || fb.rating || 5);
    const matchesRating =
      ratingFilter === "all" ? true : starsValue === Number(ratingFilter);

    return matchesSearch && matchesRating;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Bar */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b ${
        isDark ? "border-white/10" : "border-[#eee8de]"
      }`}>
        <div>
          <h2 className={`text-xl sm:text-2xl font-bold flex items-center gap-2 ${isDark ? "text-white" : "text-slate-900"}`}>
            <span>Feedback Requests</span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
              isDark
                ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                : "bg-[#eaf3ee] text-[#1b3f30] border-[#1b3f30]/30"
            }`}>
              {feedbacks.length} Pending
            </span>
          </h2>
          <p className={`text-xs sm:text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Review user feedback submissions before they are published to the public Feedback Journey Roadmap.
          </p>
        </div>

        <button
          onClick={fetchFeedbacks}
          className={`self-start sm:self-auto px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-95 ${
            isDark
              ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
              : "bg-[#eaf3ee] text-[#1b3f30] hover:bg-[#d4e7dd] border-[#1b3f30]/30"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student name, role, or review text..."
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm placeholder-slate-400 focus:outline-none focus:ring-2 ${
              isDark
                ? "bg-slate-800/80 border-white/15 text-white focus:ring-purple-500/50"
                : "bg-white border-[#eee8de] text-slate-800 shadow-sm focus:ring-[#1b3f30]/40 focus:border-[#1b3f30]"
            }`}
          />
        </div>

        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value)}
          className={`px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 cursor-pointer ${
            isDark
              ? "bg-slate-800/80 border-white/15 text-white focus:ring-purple-500/50"
              : "bg-white border-[#eee8de] text-slate-700 shadow-sm focus:ring-[#1b3f30]/40 focus:border-[#1b3f30]"
          }`}
        >
          <option value="all">All Ratings</option>
          <option value="5">5 Stars ★★★★★</option>
          <option value="4">4 Stars ★★★★</option>
          <option value="3">3 Stars ★★★</option>
          <option value="2">2 Stars ★★</option>
          <option value="1">1 Star ★</option>
        </select>
      </div>

      {/* Feedback Items List */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          <div className={`w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3 ${
            isDark ? "border-indigo-500" : "border-[#1b3f30]"
          }`} />
          Loading feedback requests...
        </div>
      ) : filteredFeedbacks.length === 0 ? (
        <div className={`py-16 text-center rounded-2xl border p-8 ${
          isDark
            ? "bg-slate-900/80 backdrop-blur-2xl border-white/10 text-white shadow-xl"
            : "bg-[#fbf9f3] border-[#eee8de] text-slate-800 shadow-[0_10px_35px_rgba(0,0,0,0.04)]"
        }`}>
          <div className="w-16 h-16 rounded-2xl bg-[#eaf3ee] text-[#1b3f30] flex items-center justify-center mx-auto mb-4 border border-[#1b3f30]/20">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
            No Pending Feedbacks
          </h3>
          <p className={`text-sm max-w-sm mx-auto mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {searchQuery || ratingFilter !== "all"
              ? "No feedback requests match your current filters."
              : "All feedback submissions have been verified and processed! New submissions will appear here automatically."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFeedbacks.map((fb) => (
            <div
              key={fb._id}
              className={`p-5 sm:p-6 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 ${
                isDark
                  ? "bg-slate-900/80 backdrop-blur-2xl border-white/10 text-white shadow-xl hover:border-purple-500/40"
                  : "bg-[#fbf9f3] border-[#eee8de] text-slate-800 shadow-[0_10px_35px_rgba(0,0,0,0.04)] hover:border-[#1b3f30]/40 hover:shadow-md"
              }`}
            >
              {/* Content */}
              <div className="space-y-3 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl text-white font-bold text-sm flex items-center justify-center flex-shrink-0 shadow-sm ${
                    isDark ? "bg-gradient-to-tr from-indigo-500 to-purple-600" : "bg-[#1b3f30]"
                  }`}>
                    {fb.name ? fb.name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-base ${isDark ? "text-white" : "text-slate-900"}`}>
                        {fb.name || "Anonymous Student"}
                      </span>
                      {fb.milestone && (
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                          isDark
                            ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30"
                            : "bg-[#eaf3ee] text-[#1b3f30] border-[#1b3f30]/30"
                        }`}>
                          {fb.milestone}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                        isDark
                          ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                          : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}>
                        Pending
                      </span>
                    </div>
                    <div className={`flex items-center gap-2 text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      <span>{fb.role || "Student"}</span>
                      {fb.createdAt && (
                        <>
                          <span>•</span>
                          <span>
                            {new Date(fb.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Rating Stars */}
                <div className="flex items-center gap-1 text-amber-400 text-sm">
                  {[...Array(5)].map((_, i) => (
                    <span key={i}>
                      {i < (fb.stars || fb.rating || 5) ? "★" : "☆"}
                    </span>
                  ))}
                  <span className={`ml-1 text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    ({fb.stars || fb.rating || 5}/5)
                  </span>
                </div>

                {/* Message text */}
                <p className={`text-sm leading-relaxed p-3.5 rounded-xl border ${
                  isDark
                    ? "bg-slate-800/60 border-white/10 text-slate-200"
                    : "bg-white border-[#eee8de] text-slate-800 shadow-sm"
                }`}>
                  "{fb.review || fb.message || fb.feedbackText}"
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center md:flex-col gap-2 flex-shrink-0 self-end md:self-center">
                <button
                  onClick={() => handleApprove(fb)}
                  disabled={actionLoading}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-1.5 w-full cursor-pointer ${
                    isDark
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-[#1b3f30] hover:bg-[#143024] shadow-[#1b3f30]/20"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Approve & Publish</span>
                </button>

                <button
                  onClick={() => handleReject(fb)}
                  disabled={actionLoading}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 w-full cursor-pointer ${
                    isDark
                      ? "bg-slate-800/80 border-white/10 text-slate-300 hover:bg-slate-700"
                      : "bg-[#eaf3ee] border-[#1b3f30]/30 text-[#1b3f30] hover:bg-[#d4e7dd] shadow-xs"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Reject</span>
                </button>

                <button
                  onClick={() => handleDelete(fb)}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition flex items-center justify-center gap-1.5 w-full cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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

export default AdminFeedbackRequests;
