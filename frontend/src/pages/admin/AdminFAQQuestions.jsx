import React, { useState, useEffect } from "react";
import { useAdmin } from "../../context/AdminContext";
import { useAppContext } from "../../context/AppContext";
import API_BASE from "../../services/apiBase";
import ConfirmationModal from "../../components/admin/ConfirmationModal";

const AdminFAQQuestions = () => {
  const { token, fetchStats } = useAdmin();
  const { theme } = useAppContext();
  const isDark = theme === "dark";
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Modal confirmation
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    actionType: "delete",
    confirmText: "",
    onConfirm: () => {},
  });

  // Answer Modal
  const [answeringFAQ, setAnsweringFAQ] = useState(null);
  const [answerText, setAnswerText] = useState("");

  const fetchQuestions = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/faqs?status=pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setFaqs(data.faqs || []);
        }
      }
    } catch (err) {
      console.error("Error fetching FAQ questions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [token]);

  // Answer and Publish FAQ
  const handlePublishAnswer = async (e) => {
    e.preventDefault();
    if (!answeringFAQ || !answerText.trim()) return;

    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/faqs/${answeringFAQ._id}/answer`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ answer: answerText.trim() }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        setAnsweringFAQ(null);
        setAnswerText("");
        await fetchQuestions();
        await fetchStats();
      } else {
        alert(data?.message || "Failed to publish answer. Status: " + res.status);
      }
    } catch (err) {
      console.error("Publish FAQ error:", err);
      alert("Error publishing answer: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Reject FAQ
  const handleReject = (faq) => {
    setConfirmModal({
      isOpen: true,
      title: "Reject FAQ Question",
      message: `Decline and reject this question: "${faq.question}"? It will not be answered or published on the public FAQ section.`,
      actionType: "reject",
      confirmText: "Reject Question",
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const res = await fetch(`${API_BASE}/api/admin/faqs/${faq._id}/reject`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            await fetchQuestions();
            await fetchStats();
          }
        } catch (err) {
          console.error("Reject FAQ error:", err);
        } finally {
          setActionLoading(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Delete FAQ
  const handleDelete = (faq) => {
    setConfirmModal({
      isOpen: true,
      title: "Permanently Delete Question",
      message: `Permanently delete this question from MongoDB? This operation cannot be undone.`,
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
            await fetchQuestions();
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
      (faq.userName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (faq.userEmail || "").toLowerCase().includes(searchQuery.toLowerCase())
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
            <span>User FAQ Questions</span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
              isDark
                ? "bg-purple-500/15 text-purple-400 border-purple-500/30"
                : "bg-[#eaf3ee] text-[#1b3f30] border-[#1b3f30]/30"
            }`}>
              {faqs.length} Pending Answer
            </span>
          </h2>
          <p className={`text-xs sm:text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            Questions submitted by users via the "Ask a Question" feature on the public website. Answer them to publish to the FAQ section.
          </p>
        </div>

        <button
          onClick={fetchQuestions}
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
          placeholder="Search submitted questions by content or student name..."
          className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm placeholder-slate-400 focus:outline-none focus:ring-2 ${
            isDark
              ? "bg-slate-800/80 border-white/15 text-white focus:ring-purple-500/50"
              : "bg-white border-[#eee8de] text-slate-800 shadow-sm focus:ring-[#1b3f30]/40"
          }`}
        />
      </div>

      {/* Questions List */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          <div className={`w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3 ${
            isDark ? "border-indigo-500" : "border-[#1b3f30]"
          }`} />
          Loading user questions...
        </div>
      ) : filteredFaqs.length === 0 ? (
        <div className={`py-16 text-center rounded-2xl border p-8 ${
          isDark
            ? "bg-slate-900/80 backdrop-blur-2xl border-white/10 text-white shadow-xl"
            : "bg-[#fbf9f3] border-[#eee8de] text-slate-800 shadow-[0_10px_35px_rgba(0,0,0,0.04)]"
        }`}>
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
            No Pending Questions
          </h3>
          <p className={`text-sm max-w-sm mx-auto mt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            {searchQuery
              ? "No submitted questions match your search query."
              : "All student questions have been answered or processed! When visitors use 'Ask a Question' on the homepage, they will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFaqs.map((faq) => (
            <div
              key={faq._id}
              className={`p-5 sm:p-6 rounded-2xl border transition flex flex-col md:flex-row md:items-center justify-between gap-6 ${
                isDark
                  ? "bg-slate-900/80 backdrop-blur-2xl border-white/10 text-white shadow-xl hover:border-purple-500/40"
                  : "bg-[#fbf9f3] border-[#eee8de] text-slate-800 shadow-[0_10px_35px_rgba(0,0,0,0.04)] hover:border-[#1b3f30]/40 hover:shadow-md"
              }`}
            >
              {/* Question text and metadata */}
              <div className="space-y-3 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    isDark
                      ? "bg-purple-500/15 text-purple-400 border-purple-500/30"
                      : "bg-[#eaf3ee] text-[#1b3f30] border-[#1b3f30]/30"
                  }`}>
                    Question
                  </span>
                  {faq.userName && (
                    <span className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      from <strong className={isDark ? "text-slate-200" : "text-slate-800"}>{faq.userName}</strong>
                    </span>
                  )}
                  {faq.userEmail && (
                    <span className="text-xs text-slate-400">
                      ({faq.userEmail})
                    </span>
                  )}
                  {faq.createdAt && (
                    <span className="text-xs text-slate-400 ml-auto sm:ml-0">
                      • {new Date(faq.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>

                <h4 className={`text-base sm:text-lg font-bold leading-snug ${isDark ? "text-white" : "text-slate-800"}`}>
                  {faq.question}
                </h4>
              </div>

              {/* Action buttons */}
              <div className="flex items-center md:flex-col gap-2 flex-shrink-0 self-end md:self-center">
                <button
                  onClick={() => {
                    setAnsweringFAQ(faq);
                    setAnswerText("");
                  }}
                  disabled={actionLoading}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition flex items-center justify-center gap-1.5 w-full cursor-pointer ${
                    isDark
                      ? "bg-indigo-600 hover:bg-indigo-700 shadow-sm"
                      : "bg-[#1b3f30] hover:bg-[#143024] shadow-md hover:scale-[1.02] active:scale-95"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <span>Answer & Publish</span>
                </button>

                <button
                  onClick={() => handleReject(faq)}
                  disabled={actionLoading}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 w-full cursor-pointer ${
                    isDark
                      ? "bg-slate-800/80 border-white/10 text-slate-300 hover:bg-slate-700"
                      : "bg-[#eaf3ee] border border-[#1b3f30]/30 text-[#1b3f30] hover:bg-[#d4e7dd] shadow-xs"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Reject</span>
                </button>

                <button
                  onClick={() => handleDelete(faq)}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition flex items-center justify-center gap-1.5 w-full cursor-pointer"
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

      {/* Answer Modal */}
      {answeringFAQ && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl p-6 overflow-hidden border transition-all ${
            isDark
              ? "bg-slate-900/95 backdrop-blur-2xl border-white/15 text-white"
              : "bg-[#fbf9f3] border-[#eee8de] text-slate-800 shadow-2xl"
          }`}>
            <div className={`flex items-center justify-between pb-4 border-b ${
              isDark ? "border-white/10" : "border-[#eee8de]"
            }`}>
              <h3 className={`text-lg font-bold flex items-center gap-2 ${isDark ? "text-white" : "text-slate-800"}`}>
                <span>Write Answer & Publish FAQ</span>
              </h3>
              <button
                onClick={() => setAnsweringFAQ(null)}
                className={`p-1 rounded-lg transition cursor-pointer ${
                  isDark ? "text-slate-400 hover:text-white hover:bg-white/5" : "text-slate-400 hover:text-slate-700 hover:bg-black/5"
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
                  isDark ? "text-slate-400" : "text-slate-600"
                }`}>
                  Student Question
                </label>
                <div className={`p-3.5 rounded-xl border text-sm font-bold ${
                  isDark
                    ? "bg-slate-800/80 border-white/10 text-white"
                    : "bg-white border-[#eee8de] text-slate-800 shadow-sm"
                }`}>
                  "{answeringFAQ.question}"
                </div>
                {answeringFAQ.userName && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Submitted by: {answeringFAQ.userName} {answeringFAQ.userEmail ? `(${answeringFAQ.userEmail})` : ""}
                  </p>
                )}
              </div>

              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${
                  isDark ? "text-slate-400" : "text-slate-600"
                }`}>
                  Official Answer (Will be publicly displayed on website FAQ)
                </label>
                <textarea
                  required
                  rows={5}
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Type the official answer clearly for students..."
                  className={`w-full p-3.5 rounded-xl border text-sm leading-relaxed placeholder-slate-400 focus:outline-none focus:ring-2 ${
                    isDark
                      ? "bg-slate-800/80 border-white/15 text-white focus:ring-purple-500/50 focus:border-purple-500"
                      : "bg-white border-[#eee8de] text-slate-800 focus:ring-[#1b3f30]/40 focus:border-[#1b3f30] shadow-sm"
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
                    isDark ? "text-slate-300 hover:bg-white/5" : "bg-[#eaf3ee] text-[#1b3f30] border border-[#1b3f30]/30 hover:bg-[#d4e7dd]"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !answerText.trim()}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition disabled:opacity-50 cursor-pointer ${
                    isDark
                      ? "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-md shadow-indigo-500/25"
                      : "bg-[#1b3f30] hover:bg-[#143024] shadow-md hover:scale-[1.02] active:scale-95"
                  }`}
                >
                  {actionLoading ? "Publishing..." : "Publish to Website"}
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

export default AdminFAQQuestions;

