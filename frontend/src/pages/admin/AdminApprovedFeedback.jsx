import React, { useState, useEffect } from "react";
import { useAdmin } from "../../context/AdminContext";
import { useAppContext } from "../../context/AppContext";
import API_BASE from "../../services/apiBase";
import ConfirmationModal from "../../components/admin/ConfirmationModal";

const AdminApprovedFeedback = () => {
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
    actionType: "reject",
    confirmText: "",
    onConfirm: () => {},
  });

  const fetchFeedbacks = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/feedbacks?status=approved`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setFeedbacks(data.feedbacks || []);
        }
      }
    } catch (err) {
      console.error("Error fetching approved feedbacks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, [token]);

  // Actions
  const handleReject = (fb) => {
    setConfirmModal({
      isOpen: true,
      title: "Remove from Public Roadmap",
      message: `Move feedback from "${fb.name || "Anonymous"}" to the rejected archive? It will immediately stop appearing on the public roadmap.`,
      actionType: "reject",
      confirmText: "Unpublish / Reject",
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
          console.error("Unpublish error:", err);
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
      message: `Warning: This action will permanently remove this feedback from MongoDB. It will be removed from the database and public roadmap immediately.`,
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
          <h2 className={`text-xl sm:text-2xl font-bold flex items-center gap-2 ${isDark ? "text-white" : "text-slate-800"}`}>
            <span>Approved Feedback</span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
              isDark
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                : "bg-[#eaf3ee] text-[#1b3f30] border-[#1b3f30]/30"
            }`}>
              {feedbacks.length} Active
            </span>
          </h2>
          <p className={`text-xs sm:text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            These feedbacks are verified and currently visible to everyone on the public Feedback Journey Roadmap.
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
            placeholder="Search approved reviews..."
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm placeholder-slate-400 focus:outline-none focus:ring-2 ${
              isDark
                ? "bg-slate-800/80 border-white/15 text-white focus:ring-purple-500/50"
                : "bg-white border-[#eee8de] text-slate-800 shadow-sm focus:ring-[#1b3f30]/40"
            }`}
          />
        </div>

        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value)}
          className={`px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 cursor-pointer ${
            isDark
              ? "bg-slate-800/80 border-white/15 text-white focus:ring-purple-500/50"
              : "bg-white border-[#eee8de] text-slate-800 shadow-sm focus:ring-[#1b3f30]/40"
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

      {/* Feedbacks Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          <div className={`w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3 ${
            isDark ? "border-indigo-500" : "border-[#1b3f30]"
          }`} />
          Loading approved feedbacks...
        </div>
      ) : filteredFeedbacks.length === 0 ? (
        <div className={`py-16 text-center rounded-2xl border p-8 ${
          isDark
            ? "bg-slate-900/80 backdrop-blur-2xl border-white/10 text-white shadow-xl"
            : "bg-[#fbf9f3] border-[#eee8de] text-slate-800 shadow-[0_10px_35px_rgba(0,0,0,0.04)]"
        }`}>
          <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
            No Approved Feedbacks Found
          </h3>
          <p className={`text-sm max-w-sm mx-auto mt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            {searchQuery || ratingFilter !== "all"
              ? "No approved feedback matches your search."
              : "No feedback has been approved yet. Check the Feedback Requests tab to approve new submissions."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFeedbacks.map((fb) => (
            <div
              key={fb._id}
              className={`p-5 rounded-2xl border transition flex flex-col justify-between ${
                isDark
                  ? "bg-slate-900/80 backdrop-blur-2xl border-white/10 text-white shadow-xl hover:border-purple-500/40"
                  : "bg-[#fbf9f3] border-[#eee8de] text-slate-800 shadow-[0_10px_35px_rgba(0,0,0,0.04)] hover:border-[#1b3f30]/40 hover:shadow-md"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-[#1b3f30] text-white font-bold text-sm flex items-center justify-center flex-shrink-0 shadow-sm">
                      {fb.name ? fb.name.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className={`font-bold text-sm ${isDark ? "text-white" : "text-slate-800"}`}>
                          {fb.name || "Anonymous Student"}
                        </h4>
                        {fb.milestone && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isDark
                              ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30"
                              : "bg-[#eaf3ee] text-[#1b3f30] border-[#1b3f30]/30"
                          }`}>
                            {fb.milestone}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        {fb.role || "Student"}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 ${
                    isDark
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      : "bg-[#eaf3ee] text-[#1b3f30] border-[#1b3f30]/30"
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Live
                  </span>
                </div>

                <div className="flex items-center gap-1 text-amber-400 text-xs">
                  {[...Array(5)].map((_, i) => (
                    <span key={i}>
                      {i < (fb.stars || fb.rating || 5) ? "★" : "☆"}
                    </span>
                  ))}
                  <span className={`ml-1 text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    ({fb.stars || fb.rating || 5}/5)
                  </span>
                </div>

                <p className={`text-xs sm:text-sm leading-relaxed p-3 rounded-xl border ${
                  isDark
                    ? "bg-slate-800/60 border-white/10 text-slate-200"
                    : "bg-white border-[#eee8de] text-slate-800 shadow-sm"
                }`}>
                  "{fb.review || fb.message || fb.feedbackText}"
                </p>
              </div>

              <div className={`mt-4 pt-3 border-t flex items-center justify-between ${
                isDark ? "border-white/10" : "border-[#eee8de]"
              }`}>
                <span className="text-[11px] text-slate-400">
                  {fb.createdAt &&
                    new Date(fb.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleReject(fb)}
                    disabled={actionLoading}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg text-amber-500 hover:bg-amber-500/10 transition cursor-pointer"
                  >
                    Unpublish
                  </button>
                  <button
                    onClick={() => handleDelete(fb)}
                    disabled={actionLoading}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                  >
                    Delete Permanently
                  </button>
                </div>
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

export default AdminApprovedFeedback;
