import React from "react";
import { createPortal } from "react-dom";
import { useAppContext } from "../../context/AppContext";

const ConfirmationModal = ({
  isOpen,
  title = "Are you sure?",
  message = "This action will permanently update the database.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "danger", // "danger" | "warning" | "success" | "primary"
  onConfirm,
  onCancel,
  loading = false,
  theme: propTheme,
}) => {
  const { theme: contextTheme } = useAppContext();
  const theme = propTheme || contextTheme || "dark";
  const isDark = theme === "dark";

  if (!isOpen) return null;

  const typeConfig = {
    danger: {
      badgeBg: "bg-rose-500/10 text-rose-400 border-rose-500/20",
      btnBg: "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30",
      icon: (
        <svg className="w-6 h-6 text-rose-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
    },
    warning: {
      badgeBg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      btnBg: "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/30",
      icon: (
        <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    success: {
      badgeBg: isDark
        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
        : "bg-[#eaf3ee] text-[#1b3f30] border-[#1b3f30]/30",
      btnBg: isDark
        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30"
        : "bg-[#1b3f30] hover:bg-[#143024] text-white shadow-md font-bold",
      icon: (
        <svg className={`w-6 h-6 ${isDark ? "text-emerald-500" : "text-[#1b3f30]"}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    primary: {
      badgeBg: isDark
        ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
        : "bg-[#eaf3ee] text-[#1b3f30] border-[#1b3f30]/30",
      btnBg: isDark
        ? "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/30"
        : "bg-[#1b3f30] hover:bg-[#143024] text-white shadow-md font-bold",
      icon: (
        <svg className={`w-6 h-6 ${isDark ? "text-purple-500" : "text-[#1b3f30]"}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  };

  const currentType = typeConfig[type] || typeConfig.danger;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div
        className={`relative w-full max-w-md rounded-2xl p-6 shadow-2xl border transition-all duration-300 transform scale-100 ${
          isDark
            ? "bg-slate-900 border-white/15 text-white shadow-2xl"
            : "bg-[#fbf9f3] border-[#eee8de] text-slate-800 shadow-2xl"
        }`}
      >
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl border shrink-0 ${currentType.badgeBg}`}>
            {currentType.icon}
          </div>
          <div className="flex-1">
            <h3 className={`text-lg font-bold tracking-tight ${isDark ? "text-white" : "text-slate-800"}`}>{title}</h3>
            <p className={`mt-2 text-sm leading-relaxed ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl border transition-all cursor-pointer ${
              isDark
                ? "border-white/10 text-slate-300 hover:bg-white/5 active:bg-white/10"
                : "bg-[#eaf3ee] border border-[#1b3f30]/30 text-[#1b3f30] hover:bg-[#d4e7dd]"
            }`}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-5 py-2 text-xs sm:text-sm font-bold rounded-xl shadow-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center gap-2 ${currentType.btnBg}`}
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{confirmText}</span>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmationModal;

