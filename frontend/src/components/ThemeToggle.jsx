import React from "react";
import { useAppContext } from "../context/AppContext";

export default function ThemeToggle({ floating = false, className = "" }) {
  const { theme, toggleTheme } = useAppContext();
  const isDark = theme === "dark";

  const buttonContent = (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      onClick={toggleTheme}
      className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 cursor-pointer p-0.5 select-none focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
        isDark
          ? "bg-slate-900 border border-indigo-500/30 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]"
          : "bg-slate-200 border border-slate-300/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.08)]"
      } ${className}`}
      title={`Switch to ${isDark ? "Light" : "Dark"} mode`}
      aria-label="Toggle theme"
    >
      {/* Background track icons */}
      <span className="absolute left-1.5 text-[11px] leading-none select-none opacity-40">
        ☀️
      </span>
      <span className="absolute right-1.5 text-[11px] leading-none select-none opacity-40">
        🌙
      </span>

      {/* Sliding Knob */}
      <span
        className={`relative z-10 flex h-6 w-6 transform items-center justify-center rounded-full transition-all duration-300 ease-out shadow-md ${
          isDark
            ? "translate-x-7 bg-slate-950 text-indigo-300 border border-indigo-400/50 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
            : "translate-x-0 bg-white text-amber-500 shadow-[0_2px_5px_rgba(0,0,0,0.18),0_0_8px_rgba(245,158,11,0.35)]"
        }`}
      >
        <span className="text-xs leading-none transition-transform duration-200 active:scale-90 select-none">
          {isDark ? "🌙" : "☀️"}
        </span>
      </span>
    </button>
  );

  if (floating) {
    return (
      <div className="fixed top-5 right-5 z-50 animate-in fade-in duration-200">
        {buttonContent}
      </div>
    );
  }

  return buttonContent;
}
