import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { alarmSound } from "../utils/alarmSound";

const GlobalReminderAlarmModal = () => {
  const {
    activeReminderAlert,
    dismissReminderAlert,
    snoozeReminderAlert,
    theme,
  } = useAppContext();

  const isDark = theme === "dark";
  const navigate = useNavigate();
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  useEffect(() => {
    setIsAudioMuted(false);
  }, [activeReminderAlert]);

  if (!activeReminderAlert) return null;

  const {
    stage = "100%",
    percentage = 100,
    title = "Reminder Alert",
    category = "Study",
    time = "",
    date = "",
    isMissed = false,
  } = activeReminderAlert;

  const handleToggleMute = () => {
    if (isAudioMuted) {
      alarmSound.start();
      setIsAudioMuted(false);
    } else {
      alarmSound.stop();
      setIsAudioMuted(true);
    }
  };

  const handleDismiss = () => {
    alarmSound.stop();
    dismissReminderAlert();
  };

  const handleSnooze = () => {
    alarmSound.stop();
    snoozeReminderAlert(5);
  };

  const handleGoToAssignments = () => {
    alarmSound.stop();
    dismissReminderAlert();
    navigate("/assignments");
  };

  // Stage configuration
  let stageConfig = {
    badge: "50% Time Completed",
    badgeColor: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    gradient: "from-amber-500 to-orange-500",
    glow: "shadow-amber-500/30",
    barColor: "bg-amber-500",
    subtitle: "You have reached halfway through this reminder window.",
    icon: (
      <svg className="w-8 h-8 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M5 22h14" />
        <path d="M5 2h14" />
        <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
        <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
      </svg>
    ),
  };

  if (stage === "90%") {
    stageConfig = {
      badge: "90% Time Completed",
      badgeColor: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      gradient: "from-orange-500 to-rose-500",
      glow: "shadow-orange-500/30",
      barColor: "bg-orange-500",
      subtitle: "Almost there! Only 10% time remains before the deadline.",
      icon: (
        <svg className="w-8 h-8 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    };
  } else if (stage === "95%") {
    stageConfig = {
      badge: "95% Time Completed - Urgent!",
      badgeColor: "bg-rose-500/10 text-rose-500 border-rose-500/30",
      gradient: "from-rose-500 to-red-600",
      glow: "shadow-rose-500/40",
      barColor: "bg-rose-600",
      subtitle: "Urgent! Only 5% time remaining for this reminder.",
      icon: (
        <svg className="w-8 h-8 text-rose-500 animate-bounce" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ),
    };
  } else if (stage === "100%") {
    stageConfig = {
      badge: "Time's Up! Deadline Arrived",
      badgeColor: "bg-red-500/15 text-red-500 border-red-500/30",
      gradient: "from-red-600 to-rose-600",
      glow: "shadow-red-500/50",
      barColor: "bg-red-600",
      subtitle: "Your reminder time has arrived! Take action now.",
      icon: (
        <svg className="w-8 h-8 text-red-500 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="13" r="8" />
          <path d="M12 9v4l2 2" />
          <path d="M5 3 2 6" />
          <path d="m22 6-3-3" />
          <path d="M6.38 18.7 4 21" />
          <path d="M17.64 18.67 20 21" />
        </svg>
      ),
    };
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      {/* Modal Container */}
      <div
        className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden transition-all duration-300 transform scale-100 ${
          isDark
            ? "bg-slate-900/95 border-slate-700/80 text-white"
            : "bg-white border-slate-200 text-slate-800"
        } ${stageConfig.glow}`}
      >
        {/* Top Header Accent Line */}
        <div className={`h-2.5 w-full bg-gradient-to-r ${stageConfig.gradient}`} />

        <div className="p-6 md:p-7">
          {/* Header Row: Icon + Badge + Audio Indicator */}
          <div className="flex items-start justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner ${
                  isDark ? "bg-slate-800/80 border-slate-700" : "bg-slate-100 border-slate-200"
                }`}
              >
                {stageConfig.icon}
              </div>

              <div>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-bold border tracking-wide uppercase ${stageConfig.badgeColor}`}
                >
                  {stageConfig.badge}
                </span>
                <h3 className="font-extrabold text-lg md:text-xl mt-1 tracking-tight">
                  {stage === "100%" ? "Reminder Alert!" : `${stage} Progress Reached`}
                </h3>
              </div>
            </div>

            {/* Sound Mute / Unmute Button */}
            <button
              onClick={handleToggleMute}
              title={isAudioMuted ? "Unmute Alarm" : "Mute Alarm Audio"}
              className={`p-2.5 rounded-xl border transition-all ${
                isAudioMuted
                  ? "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
                  : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20 animate-pulse"
              }`}
            >
              {isAudioMuted ? (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 5 6 9H2v6h4l5 4V5Z" />
                  <line x1="22" y1="9" x2="16" y2="15" />
                  <line x1="16" y1="9" x2="22" y2="15" />
                </svg>
              ) : (
                <div className="flex items-center gap-1">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 5 6 9H2v6h4l5 4V5Z" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  </svg>
                </div>
              )}
            </button>
          </div>

          {/* Subtitle notice */}
          <p className="text-xs text-slate-400 dark:text-slate-400 mb-4 font-medium">
            {stageConfig.subtitle}
          </p>

          {/* Missed alert notification badge */}
          {isMissed && (
            <div className="mb-4 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>This milestone occurred while you were away from the website.</span>
            </div>
          )}

          {/* Reminder Card Details */}
          <div
            className={`p-4 rounded-2xl border mb-5 ${
              isDark ? "bg-slate-800/60 border-slate-700/60" : "bg-slate-50 border-slate-200/80"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Reminder
              </span>
              {category && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-500 border border-purple-500/20">
                  {category}
                </span>
              )}
            </div>

            <h4 className="text-base md:text-lg font-bold text-slate-900 dark:text-white break-words">
              {title}
            </h4>

            {(time || date) && (
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
                {date && (
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    {date}
                  </span>
                )}
                {time && (
                  <span className="flex items-center gap-1 font-semibold text-rose-500 dark:text-rose-400">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    {time}
                  </span>
                )}
              </div>
            )}

            {/* Progress Bar */}
            <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                <span className="text-slate-400">Elapsed Progress</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{percentage}%</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${stageConfig.barColor}`}
                  style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5">
            {/* Primary: Stop Alarm & Dismiss */}
            <button
              onClick={handleDismiss}
              className={`w-full py-3 px-4 rounded-2xl font-bold text-sm text-white shadow-lg transition-all flex items-center justify-center gap-2 bg-gradient-to-r ${stageConfig.gradient} hover:opacity-95 active:scale-95`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect width="18" height="18" x="3" y="3" rx="2" />
              </svg>
              Stop Alarm & Dismiss
            </button>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Snooze 5 Min */}
              <button
                onClick={handleSnooze}
                className={`py-2.5 px-3 rounded-xl font-semibold text-xs border transition-all flex items-center justify-center gap-1.5 ${
                  isDark
                    ? "bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700"
                    : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 4v6h6" />
                  <path d="M22 20v-6h-6" />
                  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L2 10m20 4-3.64 4.36A9 9 0 0 1 3.51 15" />
                </svg>
                Snooze (5 min)
              </button>

              {/* View in Assignments */}
              <button
                onClick={handleGoToAssignments}
                className={`py-2.5 px-3 rounded-xl font-semibold text-xs border transition-all flex items-center justify-center gap-1.5 ${
                  isDark
                    ? "bg-purple-950/30 border-purple-800/40 text-purple-300 hover:bg-purple-900/40"
                    : "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                }`}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                View Reminders
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalReminderAlarmModal;
