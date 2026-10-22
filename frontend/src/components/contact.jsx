import React from "react";
import { Link } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import ThemeToggle from "./ThemeToggle";
import Navbar from "./Navbar";

const TEAM_MEMBERS = [
  {
    name: "Ankit Kumar",
    phone: "+91 9142185818",
    linkedin: "https://www.linkedin.com/in/ankit-kumar-22b9772ab",
    linkedinText: "linkedin.com/in/ankit",
    email: "ankit.2327cse1116@kiet.edu",
    role: "Fullstack & AI Integration"
  },
  {
    name: "Ananya Srivastava",
    phone: "+91 8090812983",
    linkedin: "https://linkedin.com/in/ananya",
    linkedinText: "linkedin.com/in/ananya",
    email: "ananya.2327cs1021@kiet.edu",
    role: "Frontend & UI/UX Design"
  },
  {
    name: "Setu Arya",
    phone: "+91 6205635575",
    linkedin: "https://www.linkedin.com/in/setu-arya",
    linkedinText: "linkedin.com/in/setu",
    email: "setu.2327cse1120@kiet.edu",
    role: "Backend & Systems"
  },
  {
    name: "Anshika Jain",
    phone: "+91 9058202869",
    linkedin: "https://www.linkedin.com/in/anshika-jain-bb93972a6",
    linkedinText: "linkedin.com/in/anshika",
    email: "anshikahjain2205@gmail.com",
    role: "Design & Product QA"
  },
  {
    name: "Yash Jain",
    phone: "+91 9058202869",
    linkedin: "https://www.linkedin.com/in/yash-jain-690a57292/",
    linkedinText: "linkedin.com/in/yash",
    email: "yashjain200524@gmail.com",
    role: "Feature Implementation"
  }
];

export default function Contact() {
  const { theme } = useAppContext();
  const isDark = theme === "dark";

  return (
    <div className={`min-h-screen relative z-10 font-sans transition-colors duration-500 ${isDark ? "text-white" : "text-slate-800"}`}>
      {/* Unified Navbar with ThemeToggle */}
      <Navbar />

      <div className="max-w-6xl mx-auto p-6 md:p-10 pt-8">
        <h1 className="text-4xl md:text-5xl font-black text-center mb-3 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 bg-clip-text text-transparent">
          Meet Our Team — Innovatrix
        </h1>
        <p className={`text-center text-sm md:text-base font-medium mb-12 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
          The minds and creators crafting StudyBuddy into your ultimate learning sanctuary.
        </p>

        {/* Team Member Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {TEAM_MEMBERS.map((member, idx) => (
            <div
              key={idx}
              className={`p-6 rounded-3xl backdrop-blur-2xl border transition-all duration-300 hover:scale-[1.03] shadow-xl ${
                isDark
                  ? "bg-slate-900/80 border-purple-500/20 text-white shadow-2xl hover:border-purple-500/40"
                  : "bg-[#fdfbf7] border-[#eee8de] shadow-[0_10px_35px_rgba(0,0,0,0.04)] hover:border-[#dfd7ca] text-slate-800"
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg bg-gradient-to-tr from-purple-600 to-pink-500 text-white shadow-md">
                  {member.name.charAt(0)}
                </div>
                <div>
                  <h2 className={`text-xl font-bold ${isDark ? "text-purple-200" : "text-slate-900"}`}>{member.name}</h2>
                  <span className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-purple-600"}`}>{member.role}</span>
                </div>
              </div>

              <div className="space-y-2.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="opacity-70">📞</span>
                  <span className="font-medium">{member.phone}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="opacity-70">🔗</span>
                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-500 hover:text-purple-400 font-medium underline truncate"
                  >
                    {member.linkedinText}
                  </a>
                </div>

                <div className="flex items-center gap-2">
                  <span className="opacity-70">✉️</span>
                  <a
                    href={`mailto:${member.email}`}
                    className="font-medium opacity-90 hover:opacity-100 hover:underline truncate"
                  >
                    {member.email}
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <footer className={`mt-16 text-center text-sm font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
        © {new Date().getFullYear()} StudyBuddy • Innovatrix Team
      </footer>
    </div>
  );
}
