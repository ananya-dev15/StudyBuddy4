import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import API_BASE from "../services/apiBase";
import ThemeToggle from "./ThemeToggle";
import Navbar from "./Navbar";
import PageIntroCard from "./PageIntroCard";

const RemindersPanel = () => {
  const {
    reminders, addReminder, removeReminder,
    highlightedReminders, clearToast,
    theme
  } = useAppContext();

  const isDark = theme === "dark";

  const [newReminderTitle, setNewReminderTitle] = useState("");
  const [reminderTime, setReminderTime] = useState("");

  const handleAdd = async () => {
    if (newReminderTitle.trim() && reminderTime) {
      const token = localStorage.getItem("token");
      const today = new Date();
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const todayStr = `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;
      try {
        const res = await fetch(`${API_BASE}/api/reminders/add`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
          body: JSON.stringify({
            title: newReminderTitle.trim(),
            time: reminderTime,
            date: todayStr,
            createdAt: new Date().toISOString(),
          }),
        });
        const data = await res.json();
        if (data.success) {
          addReminder(data.reminder);
          setNewReminderTitle("");
          setReminderTime("");
        }
      } catch (err) {
        console.error("Error adding reminder:", err);
      }
    }
  };

  const handleDelete = async (id) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/api/reminders/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        removeReminder(id);
      }
    } catch (err) {
      console.error("Error deleting reminder:", err);
    }
  };

  return (
    <div className={`min-h-screen relative z-10 font-sans transition-colors duration-500 ${isDark ? "text-white" : "text-slate-800"}`}>
      {/* Unified Navbar with ThemeToggle */}
      <Navbar />

      <div className="max-w-xl mx-auto p-6 md:p-10 pt-8">
        {/* Page Introduction Card */}
        <PageIntroCard className="mb-8" />

        {/* Input Section */}
        <div className={`p-6 rounded-3xl backdrop-blur-2xl border shadow-xl mb-8 transition-all duration-300 ${
          isDark
            ? "bg-slate-900/80 border-purple-500/20 text-white shadow-2xl"
            : "bg-[#fdfbf7] border-[#eee8de] shadow-[0_10px_35px_rgba(0,0,0,0.04)] text-slate-800"
        }`}>
          <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? "text-purple-300" : "text-slate-600"}`}>
            Reminder Title
          </label>
          <input
            type="text"
            placeholder="e.g. Revise Computer Networks..."
            value={newReminderTitle}
            onChange={(e) => setNewReminderTitle(e.target.value)}
            className={`w-full p-3.5 rounded-xl border text-sm font-medium mb-4 focus:ring-2 focus:ring-purple-500 outline-none transition-all ${
              isDark
                ? "bg-slate-800/80 border-purple-500/30 text-white placeholder-slate-400"
                : "bg-white/90 border-slate-300 text-slate-800 placeholder-slate-400"
            }`}
          />

          <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? "text-purple-300" : "text-slate-600"}`}>
            Time
          </label>
          <input
            type="time"
            value={reminderTime}
            onChange={(e) => setReminderTime(e.target.value)}
            className={`w-full p-3.5 rounded-xl border text-sm font-medium mb-6 focus:ring-2 focus:ring-purple-500 outline-none transition-all ${
              isDark
                ? "bg-slate-800/80 border-purple-500/30 text-white"
                : "bg-white/90 border-slate-300 text-slate-800"
            }`}
          />

          <button
            onClick={handleAdd}
            className="w-full py-3.5 px-6 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md hover:shadow-purple-500/25 transition-all duration-300 hover:scale-[1.01]"
          >
            ➕ Add Reminder
          </button>
        </div>

        {/* Reminders List */}
        <div className="space-y-4">
          {reminders.length === 0 ? (
            <div className={`p-8 text-center rounded-2xl backdrop-blur-xl border ${
              isDark ? "bg-slate-900/60 border-purple-500/10 text-slate-400" : "bg-white/60 border-white/60 text-slate-500"
            }`}>
              <span className="text-4xl mb-2 block">🔔</span>
              <p className="font-medium text-sm">No reminders active right now.</p>
            </div>
          ) : (
            reminders.map((reminder) => {
              const isHighlighted = highlightedReminders?.has(reminder._id);
              return (
                <div
                  key={reminder._id}
                  className={`flex justify-between items-center p-4 rounded-2xl backdrop-blur-2xl border transition-all duration-300 hover:scale-[1.01] ${
                    isHighlighted
                      ? "ring-2 ring-pink-500 shadow-lg shadow-pink-500/20"
                      : ""
                  } ${
                    isDark
                      ? "bg-slate-900/80 border-purple-500/20 text-white shadow-lg"
                      : "bg-[#fdfbf7] border-[#eee8de] shadow-[0_8px_25px_rgba(0,0,0,0.04)] text-slate-800"
                  }`}
                >
                  <div>
                    <p className={`text-base font-bold ${isDark ? "text-purple-200" : "text-slate-900"}`}>
                      {reminder.title}
                    </p>
                    <p className={`text-xs font-semibold mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      🕒 {reminder.time}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(reminder._id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      isDark
                        ? "bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white"
                        : "bg-rose-100 text-rose-700 hover:bg-rose-500 hover:text-white"
                    }`}
                  >
                    Dismiss
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default RemindersPanel;
