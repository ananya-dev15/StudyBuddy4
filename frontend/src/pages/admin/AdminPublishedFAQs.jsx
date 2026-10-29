import React, { useState, useEffect } from "react";
import { useAdmin } from "../../context/AdminContext";
import { useAppContext } from "../../context/AppContext";
import API_BASE from "../../services/apiBase";
import ConfirmationModal from "../../components/admin/ConfirmationModal";

const AdminPublishedFAQs = () => {
  const { token, fetchStats } = useAdmin();
  const { theme } = useAppContext();
  const isDark = theme === "dark";
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Edit FAQ Modal state
  const [editingFAQ, setEditingFAQ] = useState(null);
  const [editForm, setEditForm] = useState({ question: "", answer: "" });

  // Create FAQ Modal state
  const [isCreating, setIsCreating] = useState(false);
  const [newFAQForm, setNewFAQForm] = useState({ question: "", answer: "" });

  // Confirmation modal
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    actionType: "delete",
    confirmText: "",
    onConfirm: () => {},
  });

  const fetchPublishedFAQs = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/faqs?status=answered`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setFaqs(data.faqs || []);
        }
      }
    } catch (err) {
      console.error("Error fetching published FAQs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublishedFAQs();
  }, [token]);

  // Edit published FAQ submit
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingFAQ || !editForm.answer.trim()) return;

    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/faqs/${editingFAQ._id}/edit`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: editForm.question.trim(),
          answer: editForm.answer.trim(),
        }),
      });

      if (res.ok) {
        setEditingFAQ(null);
        await fetchPublishedFAQs();
        await fetchStats();
      }
    } catch (err) {
      console.error("Error editing FAQ:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // Direct create FAQ submit
  const handleCreateFAQ = async (e) => {
    e.preventDefault();
    if (!newFAQForm.question.trim() || !newFAQForm.answer.trim()) return;

    setActionLoading(true);
    try {
      // 1. Submit question
      const createRes = await fetch(`${API_BASE}/api/faqs/question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: newFAQForm.question.trim(),
          userName: "StudyBuddy Admin",
        }),
      });

      if (createRes.ok) {
        const createData = await createRes.json();
        const createdId = createData.faq?._id;
        if (createdId) {
          // 2. Answer & publish it immediately
          await fetch(`${API_BASE}/api/admin/faqs/${createdId}/answer`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              answer: newFAQForm.answer.trim(),
            }),
          });
        }
        setIsCreating(false);
        setNewFAQForm({ question: "", answer: "" });
        await fetchPublishedFAQs();
        await fetchStats();
      }
    } catch (err) {
      console.error("Error creating new FAQ:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // Unpublish FAQ
  const handleUnpublish = (faq) => {
    setConfirmModal({
      isOpen: true,
      title: "Unpublish FAQ",
      message: `Unpublish "${faq.question}"? It will stop appearing on the public website and be placed into pending.`,
      actionType: "reject",
      confirmText: "Unpublish",
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const res = await fetch(`${API_BASE}/api/admin/faqs/${faq._id}/reject`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            await fetchPublishedFAQs();
            await fetchStats();
          }
        } catch (err) {
          console.error("Unpublish FAQ error:", err);
        } finally {
          setActionLoading(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Delete FAQ permanently
  const handleDelete = (faq) => {
    setConfirmModal({
      isOpen: true,
      title: "Permanently Delete FAQ",
      message: `Warning: This will permanently remove this FAQ from MongoDB and delete it from the website immediately. This cannot be undone.`,
      actionType: "delete",
      confirmText: "Delete Permanently",
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const res = await fetch(`${API_BASE}/api/admin/faqs/${faq._id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            await fetchPublishedFAQs();
            await fetchStats();
          }
        } catch (err) {
          console.error("Delete FAQ error:", err);
        } finally {
          setActionLoading(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const filteredFaqs = faqs.filter((faq) => {
    return (
      (faq.question || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (faq.answer || "").toLowerCase().includes(searchQuery.toLowerCase())
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
            <span>Published FAQs</span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
              isDark
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                : "bg-[#eaf3ee] text-[#1b3f30] border-[#1b3f30]/30"
            }`}>
              {faqs.length} Live on Website
            </span>
          </h2>
          <p className={`text-xs sm:text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            These questions and answers are live on the public Frequently Asked Questions section. You can edit answers, add new items, or delete them.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreating(true)}
            className={`px-3.5 py-2 rounded-xl text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              isDark
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md shadow-purple-500/25"
                : "bg-[#1b3f30] hover:bg-[#143024] shadow-md hover:scale-[1.02] active:scale-95"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Add New FAQ</span>
          </button>
          <button
            onClick={fetchPublishedFAQs}
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
          placeholder="Search published FAQs by question or answer text..."
          className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm placeholder-slate-400 focus:outline-none focus:ring-2 ${
            isDark
              ? "bg-slate-800/80 border-white/15 text-white focus:ring-purple-500/50"
              : "bg-white border-[#eee8de] text-slate-800 shadow-sm focus:ring-[#1b3f30]/40"
          }`}
        />
      </div>

      {/* Published FAQs List */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          <div className={`w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3 ${
            isDark ? "border-indigo-500" : "border-[#1b3f30]"
          }`} />
          Loading published FAQs...
        </div>
      ) : filteredFaqs.length === 0 ? (
        <div className={`py-16 text-center rounded-2xl border p-8 ${
          isDark
            ? "bg-slate-900/80 backdrop-blur-2xl border-white/10 text-white shadow-xl"
            : "bg-[#fbf9f3] border-[#eee8de] text-slate-800 shadow-[0_10px_35px_rgba(0,0,0,0.04)]"
        }`}>
          <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
            No Published FAQs Found
          </h3>
          <p className={`text-sm max-w-sm mx-auto mt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            {searchQuery
              ? "No published FAQs match your search query."
              : "No FAQs are currently published. You can answer pending questions or click 'Add New FAQ' above."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFaqs.map((faq, index) => (
            <div
              key={faq._id}
              className={`p-5 sm:p-6 rounded-2xl border transition flex flex-col justify-between gap-4 ${
                isDark
                  ? "bg-slate-900/80 backdrop-blur-2xl border-white/10 text-white shadow-xl hover:border-purple-500/40"
                  : "bg-[#fbf9f3] border-[#eee8de] text-slate-800 shadow-[0_10px_35px_rgba(0,0,0,0.04)] hover:border-[#1b3f30]/40 hover:shadow-md"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className={`w-8 h-8 rounded-xl text-xs font-bold flex items-center justify-center flex-shrink-0 border ${
                      isDark
                        ? "bg-purple-500/15 border-purple-500/30 text-purple-400"
                        : "bg-[#eaf3ee] border-[#1b3f30]/30 text-[#1b3f30]"
                    }`}>
                      Q{index + 1}
                    </span>
                    <div>
                      <h4 className={`text-base font-bold leading-snug ${isDark ? "text-white" : "text-slate-800"}`}>
                        {faq.question}
                      </h4>
                      {faq.userName && (
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Asked by {faq.userName} {faq.userEmail ? `(${faq.userEmail})` : ""}
                        </p>
                      )}
                    </div>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1.5 flex-shrink-0 ${
                    isDark
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      : "bg-[#eaf3ee] text-[#1b3f30] border-[#1b3f30]/30"
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live
                  </span>
                </div>

                {/* Answer box */}
                <div className={`ml-0 sm:ml-11 p-4 rounded-xl border ${
                  isDark
                    ? "bg-slate-800/60 border-white/10 text-slate-200"
                    : "bg-white border-[#eee8de] text-slate-800 shadow-sm"
                }`}>
                  <span className={`text-[11px] font-bold uppercase tracking-wider block mb-1 ${
                    isDark ? "text-purple-400" : "text-[#1b3f30]"
                  }`}>
                    Answer:
                  </span>
                  <p className={`text-sm leading-relaxed ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                    {faq.answer}
                  </p>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className={`flex flex-wrap items-center justify-between pt-3 border-t text-xs text-slate-400 gap-2 ${
                isDark ? "border-white/10" : "border-[#eee8de]"
              }`}>
                <span>
                  Answered by: {faq.answeredBy || "Admin"}
                  {faq.answeredAt && (
                    <>
                      {" "}•{" "}
                      {new Date(faq.answeredAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </>
                  )}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingFAQ(faq);
                      setEditForm({ question: faq.question, answer: faq.answer });
                    }}
                    disabled={actionLoading}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition flex items-center gap-1 cursor-pointer ${
                      isDark
                        ? "bg-purple-500/15 border-purple-500/30 text-purple-300 hover:bg-purple-500/25"
                        : "bg-[#eaf3ee] border-[#1b3f30]/30 text-[#1b3f30] hover:bg-[#d4e7dd] shadow-xs"
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <span>Edit Answer</span>
                  </button>

                  <button
                    onClick={() => handleUnpublish(faq)}
                    disabled={actionLoading}
                    className="px-3 py-1.5 text-xs font-semibold rounded-xl text-amber-500 hover:bg-amber-500/10 transition cursor-pointer"
                  >
                    Unpublish
                  </button>

                  <button
                    onClick={() => handleDelete(faq)}
                    disabled={actionLoading}
                    className="px-3 py-1.5 text-xs font-semibold rounded-xl text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit FAQ Modal */}
      {editingFAQ && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl p-6 border transition-all ${
            isDark
              ? "bg-slate-900/95 backdrop-blur-2xl border-white/15 text-white"
              : "bg-[#fbf9f3] border-[#eee8de] text-slate-800 shadow-2xl"
          }`}>
            <div className={`flex items-center justify-between pb-4 border-b ${
              isDark ? "border-white/10" : "border-[#eee8de]"
            }`}>
              <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                Edit Published FAQ
              </h3>
              <button
                onClick={() => setEditingFAQ(null)}
                className={`p-1 rounded-lg transition cursor-pointer ${
                  isDark ? "text-slate-400 hover:text-white hover:bg-white/5" : "text-slate-400 hover:text-slate-700 hover:bg-black/5"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${
                  isDark ? "text-slate-400" : "text-slate-600"
                }`}>
                  Question
                </label>
                <input
                  type="text"
                  required
                  value={editForm.question}
                  onChange={(e) => setEditForm((p) => ({ ...p, question: e.target.value }))}
                  className={`w-full p-3 rounded-xl border text-sm placeholder-slate-400 focus:outline-none focus:ring-2 ${
                    isDark
                      ? "bg-slate-800/80 border-white/15 text-white focus:ring-purple-500/50"
                      : "bg-white border-[#eee8de] text-slate-800 focus:ring-[#1b3f30]/40 focus:border-[#1b3f30] shadow-sm"
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${
                  isDark ? "text-slate-400" : "text-slate-600"
                }`}>
                  Answer
                </label>
                <textarea
                  required
                  rows={5}
                  value={editForm.answer}
                  onChange={(e) => setEditForm((p) => ({ ...p, answer: e.target.value }))}
                  className={`w-full p-3 rounded-xl border text-sm leading-relaxed placeholder-slate-400 focus:outline-none focus:ring-2 ${
                    isDark
                      ? "bg-slate-800/80 border-white/15 text-white focus:ring-purple-500/50"
                      : "bg-white border-[#eee8de] text-slate-800 focus:ring-[#1b3f30]/40 focus:border-[#1b3f30] shadow-sm"
                  }`}
                />
              </div>

              <div className={`pt-3 border-t flex items-center justify-end gap-3 ${
                isDark ? "border-white/10" : "border-[#eee8de]"
              }`}>
                <button
                  type="button"
                  onClick={() => setEditingFAQ(null)}
                  disabled={actionLoading}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    isDark ? "text-slate-300 hover:bg-white/5" : "bg-[#eaf3ee] text-[#1b3f30] border border-[#1b3f30]/30 hover:bg-[#d4e7dd]"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !editForm.answer.trim()}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition disabled:opacity-50 cursor-pointer ${
                    isDark
                      ? "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-md shadow-indigo-500/25"
                      : "bg-[#1b3f30] hover:bg-[#143024] shadow-md hover:scale-[1.02] active:scale-95"
                  }`}
                >
                  {actionLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New FAQ Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl p-6 border transition-all ${
            isDark
              ? "bg-slate-900/95 backdrop-blur-2xl border-white/15 text-white"
              : "bg-[#fbf9f3] border-[#eee8de] text-slate-800 shadow-2xl"
          }`}>
            <div className={`flex items-center justify-between pb-4 border-b ${
              isDark ? "border-white/10" : "border-[#eee8de]"
            }`}>
              <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                Add New Published FAQ
              </h3>
              <button
                onClick={() => setIsCreating(false)}
                className={`p-1 rounded-lg transition cursor-pointer ${
                  isDark ? "text-slate-400 hover:text-white hover:bg-white/5" : "text-slate-400 hover:text-slate-700 hover:bg-black/5"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateFAQ} className="mt-4 space-y-4">
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${
                  isDark ? "text-slate-400" : "text-slate-600"
                }`}>
                  FAQ Question
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. How does the focus streak work?"
                  value={newFAQForm.question}
                  onChange={(e) => setNewFAQForm((p) => ({ ...p, question: e.target.value }))}
                  className={`w-full p-3 rounded-xl border text-sm placeholder-slate-400 focus:outline-none focus:ring-2 ${
                    isDark
                      ? "bg-slate-800/80 border-white/15 text-white focus:ring-purple-500/50"
                      : "bg-white border-[#eee8de] text-slate-800 focus:ring-[#1b3f30]/40 focus:border-[#1b3f30] shadow-sm"
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${
                  isDark ? "text-slate-400" : "text-slate-600"
                }`}>
                  FAQ Answer
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Provide the comprehensive answer for students..."
                  value={newFAQForm.answer}
                  onChange={(e) => setNewFAQForm((p) => ({ ...p, answer: e.target.value }))}
                  className={`w-full p-3 rounded-xl border text-sm leading-relaxed placeholder-slate-400 focus:outline-none focus:ring-2 ${
                    isDark
                      ? "bg-slate-800/80 border-white/15 text-white focus:ring-purple-500/50"
                      : "bg-white border-[#eee8de] text-slate-800 focus:ring-[#1b3f30]/40 focus:border-[#1b3f30] shadow-sm"
                  }`}
                />
              </div>

              <div className={`pt-3 border-t flex items-center justify-end gap-3 ${
                isDark ? "border-white/10" : "border-[#eee8de]"
              }`}>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  disabled={actionLoading}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    isDark ? "text-slate-300 hover:bg-white/5" : "bg-[#eaf3ee] text-[#1b3f30] border border-[#1b3f30]/30 hover:bg-[#d4e7dd]"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !newFAQForm.question.trim() || !newFAQForm.answer.trim()}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition disabled:opacity-50 cursor-pointer ${
                    isDark
                      ? "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-md shadow-indigo-500/25"
                      : "bg-[#1b3f30] hover:bg-[#143024] shadow-md hover:scale-[1.02] active:scale-95"
                  }`}
                >
                  {actionLoading ? "Creating..." : "Create & Publish"}
                </button>
              </div>
            </form>
          </div>
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

export default AdminPublishedFAQs;

