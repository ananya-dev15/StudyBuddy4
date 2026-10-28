import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import Navbar from "./Navbar";
import PageIntroCard from "./PageIntroCard";
import API_BASE from "../services/apiBase";

const AssignmentCard = () => {
  const {
    assignments = [],
    setAssignments,
    reminders = [],
    setReminders,
    addAssignment: contextAddAssignment,
    removeAssignment: contextRemoveAssignment,
    addReminder: contextAddReminder,
    removeReminder: contextRemoveReminder,
    theme,
  } = useAppContext();

  const isDark = theme === "dark";
  const navigate = useNavigate();

  // Local state for UI
  const [activeTab, setActiveTab] = useState("All"); // "All" | "Assignments" | "Reminders"
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Selection state
  const [selectedAssignments, setSelectedAssignments] = useState(new Set());
  const [selectedReminders, setSelectedReminders] = useState(new Set());

  // Active Dropdown state (for row action dots)
  const [openActionId, setOpenActionId] = useState(null);

  // Modals
  const [isAddAssignmentOpen, setIsAddAssignmentOpen] = useState(false);
  const [isEditAssignmentOpen, setIsEditAssignmentOpen] = useState(false);
  const [currentEditAssignment, setCurrentEditAssignment] = useState(null);

  const [isAddReminderOpen, setIsAddReminderOpen] = useState(false);
  const [isEditReminderOpen, setIsEditReminderOpen] = useState(false);
  const [currentEditReminder, setCurrentEditReminder] = useState(null);

  // Calendar State (Default to current date)
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(() => new Date().getDate());

  // Form states for Assignment
  const [assignmentForm, setAssignmentForm] = useState({
    title: "",
    subject: "",
    deadline: "",
    priority: "Medium",
    status: "Pending",
    description: "",
  });

  // Form states for Reminder
  const [reminderForm, setReminderForm] = useState({
    title: "",
    category: "Study",
    date: "",
    time: "",
    repeat: "One Time",
    status: "Pending",
  });

  // --- Fetch data from backend on mount so refresh never loses user data ---
  useEffect(() => {
    const fetchFreshData = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const [aRes, rRes] = await Promise.all([
          fetch(`${API_BASE}/api/assignments/list`, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: "include",
          }),
          fetch(`${API_BASE}/api/reminders/list`, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: "include",
          }),
        ]);

        const [aData, rData] = await Promise.all([aRes.json(), rRes.json()]);
        const userObj = JSON.parse(localStorage.getItem("user") || "{}");
        const uId = userObj?.id || userObj?._id;

        if (aData.success && Array.isArray(aData.assignments)) {
          setAssignments(aData.assignments);
          if (uId) {
            localStorage.setItem(`assignments_${uId}`, JSON.stringify(aData.assignments));
          }
        }

        if (rData.success && Array.isArray(rData.reminders)) {
          setReminders(rData.reminders);
          if (uId) {
            localStorage.setItem(`reminders_${uId}`, JSON.stringify(rData.reminders));
          }
        }
      } catch (err) {
        console.error("Error fetching tasks from backend:", err);
      }
    };

    fetchFreshData();
  }, [setAssignments, setReminders]);

  // Click outside to close actions dropdown
  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (!e.target.closest(".row-action-dropdown") && !e.target.closest(".row-action-btn")) {
        setOpenActionId(null);
      }
    };
    document.addEventListener("click", handleGlobalClick);
    return () => document.removeEventListener("click", handleGlobalClick);
  }, []);

  // Format date helper
  const formatDateDisplay = (dateVal) => {
    if (!dateVal) return { formatted: "No Date", relative: "", isOverdue: false };
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return { formatted: String(dateVal), relative: "", isOverdue: false };

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const formatted = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;

    const now = new Date();
    // Midnight to midnight comparison
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfTarget = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diffDays = Math.ceil((startOfTarget - startOfToday) / (1000 * 60 * 60 * 24));

    let relative = "";
    let isOverdue = false;

    if (diffDays < 0) {
      relative = "Overdue";
      isOverdue = true;
    } else if (diffDays === 0) {
      relative = "Due today";
    } else if (diffDays === 1) {
      relative = "1 day left";
    } else {
      relative = `${diffDays} days left`;
    }

    return { formatted, relative, isOverdue };
  };

  // --- Handlers for Assignments ---
  const handleOpenAddAssignment = () => {
    // Current date + 2 days as default
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 2);
    const dateStr = defaultDate.toISOString().slice(0, 16);

    setAssignmentForm({
      title: "",
      subject: "",
      deadline: dateStr,
      priority: "Medium",
      status: "Pending",
      description: "",
    });
    setIsAddAssignmentOpen(true);
  };

  const handleSaveAddAssignment = async (e) => {
    e.preventDefault();
    if (!assignmentForm.title.trim()) return;

    const token = localStorage.getItem("token");
    const newAss = {
      title: assignmentForm.title.trim(),
      subject: assignmentForm.subject.trim() || "General",
      deadline: assignmentForm.deadline ? new Date(assignmentForm.deadline).toISOString() : new Date().toISOString(),
      priority: assignmentForm.priority || "Medium",
      status: assignmentForm.status || "Pending",
      description: assignmentForm.description || "",
    };

    try {
      if (token) {
        const res = await fetch(`${API_BASE}/api/assignments/add`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
          body: JSON.stringify(newAss),
        });
        const data = await res.json();
        if (data.success && data.assignment) {
          if (contextAddAssignment) contextAddAssignment(data.assignment);
          else setAssignments((prev) => [data.assignment, ...(prev || [])]);
        } else {
          setAssignments((prev) => [{ ...newAss, _id: `local-${Date.now()}` }, ...(prev || [])]);
        }
      } else {
        setAssignments((prev) => [{ ...newAss, _id: `local-${Date.now()}` }, ...(prev || [])]);
      }
    } catch (err) {
      console.error("Error saving assignment to MongoDB:", err);
      setAssignments((prev) => [{ ...newAss, _id: `local-${Date.now()}` }, ...(prev || [])]);
    }

    setIsAddAssignmentOpen(false);
  };

  const handleOpenEditAssignment = (ass) => {
    setCurrentEditAssignment(ass);
    setAssignmentForm({
      title: ass.title || "",
      subject: ass.subject || "",
      deadline: ass.deadline ? new Date(ass.deadline).toISOString().slice(0, 16) : "",
      priority: ass.priority || "Medium",
      status: ass.status || "Pending",
      description: ass.description || "",
    });
    setIsEditAssignmentOpen(true);
    setOpenActionId(null);
  };

  const handleSaveEditAssignment = async (e) => {
    e.preventDefault();
    if (!currentEditAssignment) return;

    const token = localStorage.getItem("token");
    const updated = {
      ...currentEditAssignment,
      title: assignmentForm.title.trim(),
      subject: assignmentForm.subject.trim() || "General",
      deadline: assignmentForm.deadline ? new Date(assignmentForm.deadline).toISOString() : currentEditAssignment.deadline,
      priority: assignmentForm.priority,
      status: assignmentForm.status,
      description: assignmentForm.description,
    };

    try {
      if (token && currentEditAssignment._id && !currentEditAssignment._id.startsWith("local-")) {
        await fetch(`${API_BASE}/api/assignments/${currentEditAssignment._id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
          body: JSON.stringify(updated),
        });
      }
    } catch (err) {
      console.error("Error updating assignment in MongoDB:", err);
    }

    setAssignments((prev) => (prev || []).map((a) => (a._id === currentEditAssignment._id ? updated : a)));
    setIsEditAssignmentOpen(false);
    setCurrentEditAssignment(null);
  };

  const handleDeleteAssignment = async (id) => {
    if (!window.confirm("Are you sure you want to delete this assignment?")) return;
    const token = localStorage.getItem("token");

    if (contextRemoveAssignment) {
      contextRemoveAssignment(id);
    } else {
      setAssignments((prev) => (prev || []).filter((a) => (a._id || a.id) !== id));
    }
    setOpenActionId(null);

    try {
      if (token && id && !id.startsWith("local-")) {
        await fetch(`${API_BASE}/api/assignments/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });
      }
    } catch (err) {
      console.error("Error deleting assignment from MongoDB:", err);
    }
  };

  const handleToggleAssignmentStatus = async (ass) => {
    const nextStatus = ass.status === "Completed" ? "Pending" : "Completed";
    const token = localStorage.getItem("token");

    try {
      if (token && !ass._id.startsWith("local-")) {
        await fetch(`${API_BASE}/api/assignments/${ass._id}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
          body: JSON.stringify({ status: nextStatus }),
        });
      }
    } catch (err) {
      console.error("Error toggling assignment status in MongoDB:", err);
    }

    setAssignments((prev) => (prev || []).map((a) => (a._id === ass._id ? { ...a, status: nextStatus } : a)));
  };

  const handleSetAssignmentStatus = async (ass, newStatus) => {
    const token = localStorage.getItem("token");
    try {
      if (token && !ass._id.startsWith("local-")) {
        await fetch(`${API_BASE}/api/assignments/${ass._id}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
          body: JSON.stringify({ status: newStatus }),
        });
      }
    } catch (err) {
      console.error("Error updating status in MongoDB:", err);
    }

    setAssignments((prev) => (prev || []).map((a) => (a._id === ass._id ? { ...a, status: newStatus } : a)));
    setOpenActionId(null);
  };

  // --- Handlers for Reminders ---
  const handleOpenAddReminder = () => {
    const today = new Date();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const todayStr = `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;

    // Default target time: 30 minutes from now
    const futureDate = new Date(Date.now() + 30 * 60 * 1000);
    let hours = futureDate.getHours();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = String(futureDate.getMinutes()).padStart(2, "0");
    const defaultTime = `${hours}:${minutesStr} ${ampm}`;

    setReminderForm({
      title: "",
      category: "Study",
      date: todayStr,
      time: defaultTime,
      repeat: "One Time",
      status: "Pending",
    });
    setIsAddReminderOpen(true);
  };

  const handleSaveAddReminder = async (e) => {
    e.preventDefault();
    if (!reminderForm.title.trim()) return;

    const token = localStorage.getItem("token");
    const nowIso = new Date().toISOString();
    const newRem = {
      title: reminderForm.title.trim(),
      category: reminderForm.category || "Study",
      date: reminderForm.date || "",
      time: reminderForm.time || "",
      repeat: reminderForm.repeat || "One Time",
      status: reminderForm.status || "Pending",
      createdAt: nowIso,
    };

    try {
      if (token) {
        const res = await fetch(`${API_BASE}/api/reminders/add`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
          body: JSON.stringify(newRem),
        });
        const data = await res.json();
        if (data.success && data.reminder) {
          if (contextAddReminder) contextAddReminder(data.reminder);
          else setReminders((prev) => [data.reminder, ...(prev || [])]);
        } else {
          setReminders((prev) => [{ ...newRem, _id: `local-r-${Date.now()}` }, ...(prev || [])]);
        }
      } else {
        setReminders((prev) => [{ ...newRem, _id: `local-r-${Date.now()}` }, ...(prev || [])]);
      }
    } catch (err) {
      console.error("Error saving reminder to MongoDB:", err);
      setReminders((prev) => [{ ...newRem, _id: `local-r-${Date.now()}` }, ...(prev || [])]);
    }

    setIsAddReminderOpen(false);
  };

  const handleOpenEditReminder = (rem) => {
    setCurrentEditReminder(rem);
    setReminderForm({
      title: rem.title || "",
      category: rem.category || "Study",
      date: rem.date || "",
      time: rem.time || "",
      repeat: rem.repeat || "One Time",
      status: rem.status || "Pending",
    });
    setIsEditReminderOpen(true);
    setOpenActionId(null);
  };

  const handleSaveEditReminder = async (e) => {
    e.preventDefault();
    if (!currentEditReminder) return;

    const token = localStorage.getItem("token");
    const updated = {
      ...currentEditReminder,
      title: reminderForm.title.trim(),
      category: reminderForm.category,
      date: reminderForm.date,
      time: reminderForm.time,
      repeat: reminderForm.repeat,
      status: reminderForm.status,
    };

    try {
      if (token && currentEditReminder._id && !currentEditReminder._id.startsWith("local-")) {
        await fetch(`${API_BASE}/api/reminders/${currentEditReminder._id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
          body: JSON.stringify(updated),
        });
      }
    } catch (err) {
      console.error("Error editing reminder in MongoDB:", err);
    }

    setReminders((prev) => (prev || []).map((r) => (r._id === currentEditReminder._id ? updated : r)));
    setIsEditReminderOpen(false);
    setCurrentEditReminder(null);
  };

  const handleDeleteReminder = async (id) => {
    if (!window.confirm("Are you sure you want to delete this reminder?")) return;
    const token = localStorage.getItem("token");

    try {
      if (token && !id.startsWith("local-")) {
        await fetch(`${API_BASE}/api/reminders/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });
      }
    } catch (err) {
      console.error("Error deleting reminder from MongoDB:", err);
    }

    if (contextRemoveReminder) {
      contextRemoveReminder(id);
    } else {
      setReminders((prev) => (prev || []).filter((r) => r._id !== id));
    }
    setOpenActionId(null);
  };

  const handleToggleReminderStatus = async (rem) => {
    const nextStatus = rem.status === "Completed" ? "Pending" : "Completed";
    const token = localStorage.getItem("token");

    try {
      if (token && !rem._id.startsWith("local-")) {
        await fetch(`${API_BASE}/api/reminders/${rem._id}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
          body: JSON.stringify({ status: nextStatus }),
        });
      }
    } catch (err) {
      console.error("Error toggling reminder status in MongoDB:", err);
    }

    setReminders((prev) => (prev || []).map((r) => (r._id === rem._id ? { ...r, status: nextStatus } : r)));
  };

  // --- Filtering calculations ---
  const filteredAssignments = useMemo(() => {
    return (assignments || []).filter((item) => {
      if (categoryFilter === "Reminders") return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (item.title || "").toLowerCase().includes(q);
        const matchSubject = (item.subject || "").toLowerCase().includes(q);
        if (!matchTitle && !matchSubject) return false;
      }
      if (priorityFilter !== "All" && item.priority !== priorityFilter) return false;
      if (statusFilter !== "All" && item.status !== statusFilter) return false;

      return true;
    });
  }, [assignments, categoryFilter, searchQuery, priorityFilter, statusFilter]);

  const filteredReminders = useMemo(() => {
    return (reminders || []).filter((item) => {
      if (categoryFilter === "Assignments") return false;
      if (categoryFilter !== "All" && categoryFilter !== "Reminders") {
        if ((item.category || "").toLowerCase() !== categoryFilter.toLowerCase()) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (item.title || "").toLowerCase().includes(q);
        const matchCat = (item.category || "").toLowerCase().includes(q);
        if (!matchTitle && !matchCat) return false;
      }
      if (statusFilter !== "All" && item.status !== statusFilter) return false;

      return true;
    });
  }, [reminders, categoryFilter, searchQuery, statusFilter]);

  // Summary counts based on real user data
  const totalAssignmentsCount = (assignments || []).length;
  const pendingAssignmentsCount = (assignments || []).filter((a) => a.status === "Pending" || a.status === "In Progress").length;
  const completedAssignmentsCount = (assignments || []).filter((a) => a.status === "Completed").length;

  const totalRemindersCount = (reminders || []).length;
  const now = new Date();
  const todayStr = `${now.getDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][now.getMonth()]}`;
  const todayRemindersCount = (reminders || []).filter((r) => r.date && r.date.toLowerCase().includes(todayStr.toLowerCase())).length;
  const overdueRemindersCount = (reminders || []).filter((r) => r.status === "Overdue").length;

  // --- Dynamic Upcoming Deadlines (Generated solely from user's data) ---
  const upcomingDeadlines = useMemo(() => {
    const list = [];
    const currentTime = new Date();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // 1. User's Assignments
    (assignments || []).forEach((ass) => {
      if (!ass.deadline) return;
      const d = new Date(ass.deadline);
      if (isNaN(d.getTime())) return;

      const startOfToday = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate()).getTime();
      const startOfTarget = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const diffDays = Math.ceil((startOfTarget - startOfToday) / (1000 * 60 * 60 * 24));

      let badge = `${diffDays} days left`;
      let badgeType = "warning";
      let isOverdue = false;

      if (diffDays < 0 || ass.status === "Overdue") {
        badge = "Overdue";
        badgeType = "overdue";
        isOverdue = true;
      } else if (diffDays === 0) {
        badge = "Today";
        badgeType = "today";
      } else if (diffDays <= 2) {
        badge = `${diffDays} ${diffDays === 1 ? "day" : "days"} left`;
        badgeType = "urgent";
      }

      list.push({
        id: `ass-${ass._id}`,
        rawDate: d,
        day: String(d.getDate()),
        month: months[d.getMonth()],
        title: ass.title,
        type: ass.subject || "Assignment",
        categoryType: "assignment",
        badge,
        badgeType,
        isOverdue,
      });
    });

    // 2. User's Reminders
    (reminders || []).forEach((rem) => {
      if (!rem.date) return;
      const d = new Date(rem.date);
      if (isNaN(d.getTime())) return;

      const startOfToday = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate()).getTime();
      const startOfTarget = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const diffDays = Math.ceil((startOfTarget - startOfToday) / (1000 * 60 * 60 * 24));

      let badge = `${diffDays} days left`;
      let badgeType = "warning";
      let isOverdue = false;

      if (diffDays < 0 || rem.status === "Overdue") {
        badge = "Overdue";
        badgeType = "overdue";
        isOverdue = true;
      } else if (diffDays === 0) {
        badge = "Today";
        badgeType = "today";
      } else if (diffDays <= 2) {
        badge = `${diffDays} ${diffDays === 1 ? "day" : "days"} left`;
        badgeType = "urgent";
      }

      list.push({
        id: `rem-${rem._id}`,
        rawDate: d,
        day: String(d.getDate()),
        month: months[d.getMonth()],
        title: rem.title,
        type: rem.category || "Reminder",
        categoryType: "reminder",
        badge,
        badgeType,
        isOverdue,
      });
    });

    // Sort by earliest date first
    list.sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
    return list;
  }, [assignments, reminders]);

  // Calendar Helpers (Mapped dynamically to user's tasks)
  const currentMonthYearStr = useMemo(() => {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return `${monthNames[calendarDate.getMonth()]} ${calendarDate.getFullYear()}`;
  }, [calendarDate]);

  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ day: null });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dots = [];

      // Check if user has assignment on this date
      const hasAssignment = (assignments || []).some((a) => {
        if (!a.deadline) return false;
        const dt = new Date(a.deadline);
        return dt.getFullYear() === year && dt.getMonth() === month && dt.getDate() === d;
      });
      if (hasAssignment) dots.push("assignment");

      // Check if user has reminder on this date
      const hasReminder = (reminders || []).some((r) => {
        if (!r.date) return false;
        const dt = new Date(r.date);
        return !isNaN(dt.getTime()) && dt.getFullYear() === year && dt.getMonth() === month && dt.getDate() === d;
      });
      if (hasReminder) dots.push("reminder");

      days.push({
        day: d,
        dots,
        isCurrent: d === selectedCalendarDay,
      });
    }
    return days;
  }, [calendarDate, selectedCalendarDay, assignments, reminders]);

  const handlePrevMonth = () => {
    setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Toggle selection
  const handleSelectAllAssignments = (e) => {
    if (e.target.checked) {
      setSelectedAssignments(new Set(filteredAssignments.map((a) => a._id)));
    } else {
      setSelectedAssignments(new Set());
    }
  };

  const handleSelectAssignment = (id) => {
    const next = new Set(selectedAssignments);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedAssignments(next);
  };

  const handleSelectAllReminders = (e) => {
    if (e.target.checked) {
      setSelectedReminders(new Set(filteredReminders.map((r) => r._id)));
    } else {
      setSelectedReminders(new Set());
    }
  };

  const handleSelectReminder = (id) => {
    const next = new Set(selectedReminders);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedReminders(next);
  };

  return (
    <div className={`min-h-screen font-sans relative z-10 transition-colors duration-500 ${isDark ? "text-white" : "text-slate-800"}`}>
      {/* Top Navbar */}
      <Navbar />

      <main className="px-6 md:px-10 py-10 max-w-[1600px] mx-auto">
        {/* --- PAGE INTRO BANNER (Nature/Mountain theme from image) --- */}
        <PageIntroCard className="mb-6" />

        {/* ================= 4 KEY METRIC & ACTION CARDS (Row 1) ================= */}
        <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5 mb-6">
          {/* Card 1: Total Assignments */}
          <div
            className="rounded-3xl p-5 sm:p-6 flex flex-col justify-between transition-all duration-300 border shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-md hover:scale-[1.01] bg-[#fbf9f3] border-[#eee8de] text-gray-900"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs sm:text-sm font-bold tracking-tight uppercase text-slate-600">
                Total Assignments
              </span>
              <span className="text-2xl select-none">📚</span>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black tracking-tight text-purple-600">
                {totalAssignmentsCount}
              </div>
              <p className="text-[11px] sm:text-xs font-medium mt-1 m-0 text-slate-500">
                {pendingAssignmentsCount} pending • {completedAssignmentsCount} completed
              </p>
            </div>
          </div>

          {/* Card 2: Active Reminders */}
          <div
            className="rounded-3xl p-5 sm:p-6 flex flex-col justify-between transition-all duration-300 border shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-md hover:scale-[1.01] bg-[#fbf9f3] border-[#eee8de] text-gray-900"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs sm:text-sm font-bold tracking-tight uppercase text-slate-600">
                Active Reminders
              </span>
              <span className="text-2xl select-none">⏰</span>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-600">
                {totalRemindersCount}
              </div>
              <p className="text-[11px] sm:text-xs font-medium mt-1 m-0 text-slate-500">
                {todayRemindersCount} due today • {overdueRemindersCount} overdue
              </p>
            </div>
          </div>

          {/* Card 3: Add Assignment Quick Action */}
          <div
            onClick={handleOpenAddAssignment}
            className="group cursor-pointer rounded-3xl p-5 sm:p-6 flex flex-col justify-between transition-all duration-300 border shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-md hover:scale-[1.01] bg-[#fbf9f3] border-[#eee8de] hover:border-blue-400 text-gray-900"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs sm:text-sm font-bold tracking-tight uppercase text-slate-600">
                New Task
              </span>
              <span className="text-2xl select-none group-hover:scale-110 transition-transform">📝</span>
            </div>
            <div>
              <div className="text-base sm:text-lg font-bold tracking-tight text-blue-600 flex items-center justify-between">
                <span>+ Add Assignment</span>
                <span className="text-base group-hover:translate-x-1 transition-transform">→</span>
              </div>
              <p className="text-[11px] sm:text-xs font-medium mt-1 m-0 text-slate-500">
                Create task with deadline & priority
              </p>
            </div>
          </div>

          {/* Card 4: Add Reminder Quick Action */}
          <div
            onClick={handleOpenAddReminder}
            className="group cursor-pointer rounded-3xl p-5 sm:p-6 flex flex-col justify-between transition-all duration-300 border shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-md hover:scale-[1.01] bg-[#fbf9f3] border-[#eee8de] hover:border-rose-400 text-gray-900"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs sm:text-sm font-bold tracking-tight uppercase text-slate-600">
                Smart Alarm
              </span>
              <span className="text-2xl select-none group-hover:scale-110 transition-transform">🔔</span>
            </div>
            <div>
              <div className="text-base sm:text-lg font-bold tracking-tight text-rose-500 flex items-center justify-between">
                <span>+ Add Reminder</span>
                <span className="text-base group-hover:translate-x-1 transition-transform">→</span>
              </div>
              <p className="text-[11px] sm:text-xs font-medium mt-1 m-0 text-slate-500">
                Set alarm at 50%, 90% & 95%
              </p>
            </div>
          </div>
        </div>

        {/* --- SECTION: UPCOMING DEADLINES (LEFT) & CALENDAR WIDGET (RIGHT) --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch mb-8">
          {/* === LEFT: SCROLLABLE UPCOMING DEADLINES (calender ke left mein) === */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col">
            <div className="rounded-3xl p-6 sm:p-7 border h-full flex flex-col transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-md bg-[#fbf9f3] border-[#eee8de] text-gray-900">
              {/* Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#eee8de] shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-amber-100 text-amber-700">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm md:text-base text-slate-900">
                      Upcoming Deadlines
                    </h3>
                    <p className="text-[11px] font-medium text-slate-500">
                      {upcomingDeadlines.length} active deadlines tracked
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleOpenAddAssignment}
                  className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
                >
                  + Add New
                </button>
              </div>

              {/* Scrollable Deadlines List (User requested: isko scrolling bnado) */}
              <div className="max-h-[320px] overflow-y-auto pr-1.5 space-y-2.5 flex-1">
                {upcomingDeadlines.length === 0 ? (
                  <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <svg className="w-10 h-10 mb-2 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <p className="text-xs font-semibold text-slate-600">No upcoming deadlines.</p>
                    <p className="text-[11px] mt-0.5 text-slate-400">Add an assignment or reminder to track your upcoming deadlines here!</p>
                  </div>
                ) : (
                  upcomingDeadlines.map((dl) => (
                    <div
                      key={dl.id}
                      className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all bg-white border-[#eee8de] hover:border-[#ded5c5] shadow-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Date Block */}
                        <div className="text-center w-11 shrink-0 py-1.5 px-1.5 rounded-xl border bg-[#f4f0e6] border-[#eee8de]">
                          <div className={`text-base font-extrabold leading-none ${dl.isOverdue ? "text-rose-600" : "text-slate-900"}`}>
                            {dl.day}
                          </div>
                          <div className={`text-[9px] font-bold uppercase mt-0.5 ${dl.isOverdue ? "text-rose-600" : "text-slate-500"}`}>
                            {dl.month}
                          </div>
                        </div>

                        {/* Icon */}
                        <div className="shrink-0">
                          {dl.categoryType === "assignment" ? (
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-100 text-emerald-700">
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                              </svg>
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-rose-100 text-rose-600">
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Title & Type */}
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate text-slate-900">
                            {dl.title}
                          </div>
                          <div className="text-[10px] font-medium mt-0.5 text-slate-500">
                            {dl.type}
                          </div>
                        </div>
                      </div>

                      {/* Right Badge */}
                      <div className="shrink-0">
                        {dl.badgeType === "today" && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-800 border border-sky-200">
                            {dl.badge}
                          </span>
                        )}
                        {dl.badgeType === "urgent" && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                            {dl.badge}
                          </span>
                        )}
                        {dl.badgeType === "warning" && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                            {dl.badge}
                          </span>
                        )}
                        {dl.badgeType === "overdue" && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                            {dl.badge}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* === RIGHT: CALENDAR WIDGET (Hackathon & LeetCode removed) === */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col">
            <div className="rounded-3xl p-6 sm:p-7 border h-full flex flex-col justify-between transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-md bg-[#fbf9f3] border-[#eee8de] text-gray-900">
              {/* Calendar Month Navigation Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm md:text-base text-slate-900">
                  {currentMonthYearStr}
                </h3>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handlePrevMonth}
                    className="p-1.5 rounded-xl border border-[#eee8de] text-slate-700 bg-white hover:bg-[#f4f0e6] transition-all"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                  </button>
                  <button
                    onClick={handleNextMonth}
                    className="p-1.5 rounded-xl border border-[#eee8de] text-slate-700 bg-white hover:bg-[#f4f0e6] transition-all"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Day Headers: Sun, Mon, Tue, etc. */}
              <div className="grid grid-cols-7 text-center text-[11px] font-semibold mb-2 text-slate-500">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
              </div>

              {/* Calendar Days Grid */}
              <div className="grid grid-cols-7 gap-y-2 text-center text-xs">
                {calendarDays.map((item, idx) => {
                  if (!item.day) {
                    return <div key={`empty-${idx}`} className="h-8" />;
                  }

                  const isSelected = item.day === selectedCalendarDay;

                  return (
                    <div
                      key={`day-${item.day}`}
                      onClick={() => setSelectedCalendarDay(item.day)}
                      className="flex flex-col items-center justify-center cursor-pointer group"
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-medium transition-all ${
                          isSelected
                            ? "bg-[#1b4332] text-white font-bold scale-105 shadow-sm"
                            : "text-slate-700 group-hover:bg-[#f4f0e6]"
                        }`}
                      >
                        {item.day}
                      </div>

                      {/* Dots underneath for actual user tasks */}
                      <div className="flex items-center gap-0.5 mt-0.5 h-1.5">
                        {item.dots && item.dots.map((dot, dIdx) => {
                          const dotColor = dot === "assignment" ? "bg-emerald-500" : "bg-sky-500";
                          return (
                            <span
                              key={`dot-${dIdx}`}
                              className={`w-1.5 h-1.5 rounded-full ${dotColor}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Calendar Legend: Only Assignment & Reminder */}
              <div className="flex items-center justify-center gap-6 mt-5 pt-4 border-t border-[#eee8de] text-[11px] font-medium text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Assignment</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                  <span>Reminder</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- FILTER & SEARCH CONTROLS ROW --- */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-6">
          {/* Segmented Pill Tabs */}
          <div className="inline-flex p-1.5 rounded-2xl border bg-[#fbf9f3] border-[#eee8de] shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
            <button
              onClick={() => setActiveTab("All")}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "All"
                  ? "bg-[#1b4332] text-white shadow-sm font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Side by Side
            </button>
            <button
              onClick={() => setActiveTab("Assignments")}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "Assignments"
                  ? "bg-[#1b4332] text-white shadow-sm font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Assignments Only
            </button>
            <button
              onClick={() => setActiveTab("Reminders")}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "Reminders"
                  ? "bg-[#1b4332] text-white shadow-sm font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Reminders Only
            </button>
          </div>

          {/* Search & Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-2xl text-xs border outline-none transition-all bg-white border-[#eee8de] text-slate-800 placeholder-slate-400 focus:border-[#1b4332]"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3.5 py-2 rounded-2xl text-xs border outline-none cursor-pointer font-medium bg-white border-[#eee8de] text-slate-700"
            >
              <option value="All">All Categories</option>
              <option value="Assignments">Assignments</option>
              <option value="Reminders">Reminders</option>
              <option value="Study">Study</option>
              <option value="Project">Project</option>
              <option value="Other">Other</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3.5 py-2 rounded-2xl text-xs border outline-none cursor-pointer font-medium bg-white border-[#eee8de] text-slate-700"
            >
              <option value="All">Priority: All</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-2 rounded-2xl text-xs border outline-none cursor-pointer font-medium bg-white border-[#eee8de] text-slate-700"
            >
              <option value="All">Status: All</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Overdue">Overdue</option>
            </select>

            {(searchQuery || categoryFilter !== "All" || priorityFilter !== "All" || statusFilter !== "All") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setCategoryFilter("All");
                  setPriorityFilter("All");
                  setStatusFilter("All");
                }}
                title="Reset filters"
                className="p-2 rounded-2xl border text-xs flex items-center justify-center transition-all bg-white border-[#eee8de] text-slate-600 hover:text-slate-900"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* --- ASSIGNMENTS & REMINDERS SECTIONS (SIDE-BY-SIDE AS REQUESTED) --- */}
        <div className={`grid gap-6 items-start ${activeTab === "All" ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
          {/* === ASSIGNMENTS SECTION === */}
          {(activeTab === "All" || activeTab === "Assignments") && (
            <div className="rounded-3xl border overflow-hidden transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-md bg-[#fbf9f3] border-[#eee8de] text-gray-900">
              {/* Header */}
              <div className="px-6 py-5 flex items-center justify-between border-b border-[#eee8de]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-100 text-emerald-700">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                    </svg>
                  </div>
                  <h2 className="font-bold text-base md:text-lg text-slate-900">
                    Assignments
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {filteredAssignments.length}
                  </span>
                </div>
                <button
                  onClick={handleOpenAddAssignment}
                  className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
                >
                  + Add Assignment
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#eee8de] text-slate-700 bg-[#f4f0e6]">
                      <th className="py-3 px-3 w-8 text-center">
                        <input
                          type="checkbox"
                          checked={filteredAssignments.length > 0 && selectedAssignments.size === filteredAssignments.length}
                          onChange={handleSelectAllAssignments}
                          className="w-3.5 h-3.5 rounded accent-emerald-600 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-3 font-semibold">Title</th>
                      <th className="py-3 px-2 font-semibold">Subject</th>
                      <th className="py-3 px-2 font-semibold">Due Date</th>
                      <th className="py-3 px-2 font-semibold">Priority</th>
                      <th className="py-3 px-2 font-semibold">Status</th>
                      <th className="py-3 px-2 font-semibold text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eee8de]">
                    {filteredAssignments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <p className="text-xs font-semibold text-slate-600">No assignments found.</p>
                          <p className="text-[11px] mt-1 text-slate-400">Click "+ Add Assignment" to create your first assignment!</p>
                        </td>
                      </tr>
                    ) : (
                      filteredAssignments.map((ass) => {
                        const dateInfo = formatDateDisplay(ass.deadline);
                        const isDone = ass.status === "Completed";
                        const isOverdue = ass.status === "Overdue" || dateInfo.isOverdue;

                        return (
                          <tr
                            key={ass._id}
                            className="transition-colors hover:bg-[#f4f0e6]/70"
                          >
                            <td className="py-3.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={selectedAssignments.has(ass._id) || isDone}
                                onChange={() => {
                                  handleSelectAssignment(ass._id);
                                  handleToggleAssignmentStatus(ass);
                                }}
                                className="w-3.5 h-3.5 rounded accent-emerald-600 cursor-pointer"
                              />
                            </td>

                            <td className="py-3.5 px-3">
                              <div className="flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5 text-sky-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                  <polyline points="14 2 14 8 20 8" />
                                  <line x1="16" y1="13" x2="8" y2="13" />
                                  <line x1="16" y1="17" x2="8" y2="17" />
                                </svg>
                                <span className={`font-semibold truncate max-w-[140px] ${isDone ? "line-through text-slate-400" : "text-slate-900"}`}>
                                  {ass.title}
                                </span>
                              </div>
                            </td>

                            <td className="py-3.5 px-2 font-medium truncate max-w-[110px] text-slate-700">
                              {ass.subject || "General"}
                            </td>

                            <td className="py-3.5 px-2 whitespace-nowrap">
                              <div className="font-semibold text-slate-900">
                                {dateInfo.formatted}
                              </div>
                              <div className={`text-[10px] font-medium ${isOverdue ? "text-rose-600 font-semibold" : "text-slate-500"}`}>
                                {isOverdue ? "Overdue" : dateInfo.relative}
                              </div>
                            </td>

                            <td className="py-3.5 px-2 whitespace-nowrap">
                              {ass.priority === "High" && (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                  High
                                </span>
                              )}
                              {ass.priority === "Medium" && (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                                  Med
                                </span>
                              )}
                              {ass.priority === "Low" && (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Low
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-2 whitespace-nowrap">
                              {ass.status === "Pending" && (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                  Pending
                                </span>
                              )}
                              {ass.status === "In Progress" && (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                  In Progress
                                </span>
                              )}
                              {ass.status === "Completed" && (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Done
                                </span>
                              )}
                              {ass.status === "Overdue" && (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                  Overdue
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-2 text-center whitespace-nowrap">
                              <div className="inline-flex items-center gap-1 relative">
                                <button
                                  onClick={() => handleOpenEditAssignment(ass)}
                                  title="Edit"
                                  className="p-1 rounded text-slate-500 hover:text-slate-800"
                                >
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteAssignment(ass._id)}
                                  title="Delete"
                                  className="p-1 rounded text-rose-600 hover:text-rose-800"
                                >
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3 6h18" />
                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenActionId(openActionId === ass._id ? null : ass._id);
                                  }}
                                  className="row-action-btn p-1 rounded text-slate-400 hover:text-slate-700"
                                >
                                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                    <circle cx="12" cy="5" r="1.5" />
                                    <circle cx="12" cy="12" r="1.5" />
                                    <circle cx="12" cy="19" r="1.5" />
                                  </svg>
                                </button>

                                {openActionId === ass._id && (
                                  <div className="row-action-dropdown absolute right-0 top-full mt-1 w-32 rounded-2xl border shadow-xl z-20 py-1 text-left bg-white border-[#eee8de] text-slate-800">
                                    <button
                                      onClick={() => handleSetAssignmentStatus(ass, "Pending")}
                                      className="w-full px-2.5 py-1 text-[11px] text-left hover:bg-[#f4f0e6] flex items-center gap-1.5"
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                      Mark Pending
                                    </button>
                                    <button
                                      onClick={() => handleSetAssignmentStatus(ass, "In Progress")}
                                      className="w-full px-2.5 py-1 text-[11px] text-left hover:bg-[#f4f0e6] flex items-center gap-1.5"
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                      In Progress
                                    </button>
                                    <button
                                      onClick={() => handleSetAssignmentStatus(ass, "Completed")}
                                      className="w-full px-2.5 py-1 text-[11px] text-left hover:bg-[#f4f0e6] flex items-center gap-1.5"
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                      Mark Done
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* === REMINDERS SECTION === */}
          {(activeTab === "All" || activeTab === "Reminders") && (
            <div className="rounded-3xl border overflow-hidden transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-md bg-[#fbf9f3] border-[#eee8de] text-gray-900">
              {/* Header */}
              <div className="px-6 py-5 flex items-center justify-between border-b border-[#eee8de]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-rose-100 text-rose-600">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  </div>
                  <h2 className="font-bold text-base md:text-lg text-slate-900">
                    Reminders
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-700 border border-rose-200">
                    {filteredReminders.length}
                  </span>
                </div>
                <button
                  onClick={handleOpenAddReminder}
                  className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
                >
                  + Add Reminder
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#eee8de] text-slate-700 bg-[#f4f0e6]">
                      <th className="py-3 px-3 w-8 text-center">
                        <input
                          type="checkbox"
                          checked={filteredReminders.length > 0 && selectedReminders.size === filteredReminders.length}
                          onChange={handleSelectAllReminders}
                          className="w-3.5 h-3.5 rounded accent-emerald-600 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-3 font-semibold">Title</th>
                      <th className="py-3 px-2 font-semibold">Category</th>
                      <th className="py-3 px-2 font-semibold">Date</th>
                      <th className="py-3 px-2 font-semibold">Time</th>
                      <th className="py-3 px-2 font-semibold">Repeat</th>
                      <th className="py-3 px-2 font-semibold">Status</th>
                      <th className="py-3 px-2 font-semibold text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eee8de]">
                    {filteredReminders.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          <p className="text-xs font-semibold text-slate-600">No reminders found.</p>
                          <p className="text-[11px] mt-1 text-slate-400">Click "+ Add Reminder" to create your first reminder!</p>
                        </td>
                      </tr>
                    ) : (
                      filteredReminders.map((rem) => {
                        const isDone = rem.status === "Completed";
                        return (
                          <tr
                            key={rem._id}
                            className="transition-colors hover:bg-[#f4f0e6]/70"
                          >
                            <td className="py-3.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={selectedReminders.has(rem._id) || isDone}
                                onChange={() => {
                                  handleSelectReminder(rem._id);
                                  handleToggleReminderStatus(rem);
                                }}
                                className="w-3.5 h-3.5 rounded accent-emerald-600 cursor-pointer"
                              />
                            </td>

                            <td className="py-3.5 px-3">
                              <span className={`font-semibold truncate max-w-[130px] inline-block ${isDone ? "line-through text-slate-400" : "text-slate-900"}`}>
                                {rem.title}
                              </span>
                            </td>

                            <td className="py-3.5 px-2 whitespace-nowrap">
                              {rem.category === "Study" && (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-800 border border-sky-200">
                                  Study
                                </span>
                              )}
                              {rem.category === "Project" && (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                                  Project
                                </span>
                              )}
                              {rem.category !== "Study" && rem.category !== "Project" && (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                                  {rem.category || "Other"}
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-2 font-medium whitespace-nowrap text-slate-700">
                              {rem.date || "—"}
                            </td>

                            <td className="py-3.5 px-2 font-medium whitespace-nowrap text-slate-700">
                              {rem.time || "—"}
                            </td>

                            <td className="py-3.5 px-2 font-medium whitespace-nowrap text-slate-700">
                              {rem.repeat || "One Time"}
                            </td>

                            <td className="py-3.5 px-2 whitespace-nowrap">
                              {rem.status === "Completed" ? (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Done
                                </span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                  Pending
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-2 text-center whitespace-nowrap">
                              <div className="inline-flex items-center gap-1 relative">
                                <button
                                  onClick={() => handleOpenEditReminder(rem)}
                                  title="Edit"
                                  className="p-1 rounded text-slate-500 hover:text-slate-800"
                                >
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteReminder(rem._id)}
                                  title="Delete"
                                  className="p-1 rounded text-rose-600 hover:text-rose-800"
                                >
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3 6h18" />
                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenActionId(openActionId === rem._id ? null : rem._id);
                                  }}
                                  className="row-action-btn p-1 rounded text-slate-400 hover:text-slate-700"
                                >
                                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                    <circle cx="12" cy="5" r="1.5" />
                                    <circle cx="12" cy="12" r="1.5" />
                                    <circle cx="12" cy="19" r="1.5" />
                                  </svg>
                                </button>

                                {openActionId === rem._id && (
                                  <div className="row-action-dropdown absolute right-0 top-full mt-1 w-32 rounded-2xl border shadow-xl z-20 py-1 text-left bg-white border-[#eee8de] text-slate-800">
                                    <button
                                      onClick={() => {
                                        handleToggleReminderStatus(rem);
                                        setOpenActionId(null);
                                      }}
                                      className="w-full px-2.5 py-1 text-[11px] text-left hover:bg-[#f4f0e6] flex items-center gap-1.5"
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                      {rem.status === "Completed" ? "Mark Pending" : "Mark Done"}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ========================================================================= */}
      {/* --- ADD ASSIGNMENT MODAL --- */}
      {/* ========================================================================= */}
      {isAddAssignmentOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl border border-[#eee8de] bg-[#fbf9f3] text-slate-900 shadow-2xl p-6 sm:p-7 transition-all">
            <div className="flex items-center justify-between pb-3 border-b border-[#eee8de] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-100 text-emerald-700">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                </div>
                <h3 className="font-bold text-base text-slate-900">Add New Assignment</h3>
              </div>
              <button
                onClick={() => setIsAddAssignmentOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveAddAssignment} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-800">Assignment Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DBMS Assignment 2"
                  value={assignmentForm.title}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-[#eee8de] bg-white text-slate-900 outline-none text-xs transition-all focus:border-[#1b4332]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-800">Subject</label>
                <input
                  type="text"
                  placeholder="e.g. Database Management System"
                  value={assignmentForm.subject}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, subject: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-[#eee8de] bg-white text-slate-900 outline-none text-xs transition-all focus:border-[#1b4332]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-800">Due Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={assignmentForm.deadline}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, deadline: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-[#eee8de] bg-white text-slate-900 outline-none text-xs transition-all focus:border-[#1b4332]"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-800">Priority</label>
                  <select
                    value={assignmentForm.priority}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, priority: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-[#eee8de] bg-white text-slate-900 outline-none text-xs transition-all focus:border-[#1b4332]"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-800">Status</label>
                <select
                  value={assignmentForm.status}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-[#eee8de] bg-white text-slate-900 outline-none text-xs transition-all focus:border-[#1b4332]"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#eee8de]">
                <button
                  type="button"
                  onClick={() => setIsAddAssignmentOpen(false)}
                  className="px-4 py-2 rounded-xl font-semibold border border-[#eee8de] text-slate-700 hover:bg-[#f4f0e6]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all"
                >
                  Save to Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- EDIT ASSIGNMENT MODAL --- */}
      {/* ========================================================================= */}
      {isEditAssignmentOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl border border-[#eee8de] bg-[#fbf9f3] text-slate-900 shadow-2xl p-6 sm:p-7 transition-all">
            <div className="flex items-center justify-between pb-3 border-b border-[#eee8de] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-sky-100 text-sky-600">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  </svg>
                </div>
                <h3 className="font-bold text-base text-slate-900">Edit Assignment</h3>
              </div>
              <button
                onClick={() => setIsEditAssignmentOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveEditAssignment} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-800">Assignment Title *</label>
                <input
                  type="text"
                  required
                  value={assignmentForm.title}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-[#eee8de] bg-white text-slate-900 outline-none text-xs transition-all focus:border-[#1b4332]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-800">Subject</label>
                <input
                  type="text"
                  value={assignmentForm.subject}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, subject: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-[#eee8de] bg-white text-slate-900 outline-none text-xs transition-all focus:border-[#1b4332]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-800">Due Date & Time</label>
                  <input
                    type="datetime-local"
                    value={assignmentForm.deadline}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, deadline: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-[#eee8de] bg-white text-slate-900 outline-none text-xs transition-all focus:border-[#1b4332]"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-800">Priority</label>
                  <select
                    value={assignmentForm.priority}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, priority: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-[#eee8de] bg-white text-slate-900 outline-none text-xs transition-all focus:border-[#1b4332]"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-800">Status</label>
                <select
                  value={assignmentForm.status}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-[#eee8de] bg-white text-slate-900 outline-none text-xs transition-all focus:border-[#1b4332]"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#eee8de]">
                <button
                  type="button"
                  onClick={() => setIsEditAssignmentOpen(false)}
                  className="px-4 py-2 rounded-xl font-semibold border border-[#eee8de] text-slate-700 hover:bg-[#f4f0e6]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all"
                >
                  Update in Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- ADD REMINDER MODAL --- */}
      {/* ========================================================================= */}
      {isAddReminderOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl border border-[#eee8de] bg-[#fbf9f3] text-slate-900 shadow-2xl p-6 sm:p-7 transition-all">
            <div className="flex items-center justify-between pb-3 border-b border-[#eee8de] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-rose-100 text-rose-600">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                <h3 className="font-bold text-base text-slate-900">Add New Reminder</h3>
              </div>
              <button
                onClick={() => setIsAddReminderOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveAddReminder} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-800">Reminder Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Read DBMS Chapter 4"
                  value={reminderForm.title}
                  onChange={(e) => setReminderForm({ ...reminderForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-[#eee8de] bg-white text-slate-900 outline-none text-xs transition-all focus:border-[#1b4332]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-800">Category</label>
                <select
                  value={reminderForm.category}
                  onChange={(e) => setReminderForm({ ...reminderForm, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-[#eee8de] bg-white text-slate-900 outline-none text-xs transition-all focus:border-[#1b4332]"
                >
                  <option value="Study">Study</option>
                  <option value="Project">Project</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-800">Date</label>
                  <input
                    type="text"
                    placeholder="e.g. 28 Oct 2026"
                    value={reminderForm.date}
                    onChange={(e) => setReminderForm({ ...reminderForm, date: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-[#eee8de] bg-white text-slate-900 outline-none text-xs transition-all focus:border-[#1b4332]"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-800">Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 8:00 PM"
                    value={reminderForm.time}
                    onChange={(e) => setReminderForm({ ...reminderForm, time: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-[#eee8de] bg-white text-slate-900 outline-none text-xs transition-all focus:border-[#1b4332]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-800">Repeat</label>
                <select
                  value={reminderForm.repeat}
                  onChange={(e) => setReminderForm({ ...reminderForm, repeat: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-[#eee8de] bg-white text-slate-900 outline-none text-xs transition-all focus:border-[#1b4332]"
                >
                  <option value="One Time">One Time</option>
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#eee8de]">
                <button
                  type="button"
                  onClick={() => setIsAddReminderOpen(false)}
                  className="px-4 py-2 rounded-xl font-semibold border border-[#eee8de] text-slate-700 hover:bg-[#f4f0e6]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-semibold bg-rose-500 hover:bg-rose-600 text-white shadow-md transition-all"
                >
                  Save to Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- EDIT REMINDER MODAL --- */}
      {/* ========================================================================= */}
      {isEditReminderOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl border border-[#eee8de] bg-[#fbf9f3] text-slate-900 shadow-2xl p-6 sm:p-7 transition-all">
            <div className="flex items-center justify-between pb-3 border-b border-[#eee8de] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-sky-100 text-sky-600">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  </svg>
                </div>
                <h3 className="font-bold text-base text-slate-900">Edit Reminder</h3>
              </div>
              <button
                onClick={() => setIsEditReminderOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveEditReminder} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-800">Reminder Title *</label>
                <input
                  type="text"
                  required
                  value={reminderForm.title}
                  onChange={(e) => setReminderForm({ ...reminderForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-[#eee8de] bg-white text-slate-900 outline-none text-xs transition-all focus:border-[#1b4332]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-800">Category</label>
                <select
                  value={reminderForm.category}
                  onChange={(e) => setReminderForm({ ...reminderForm, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-[#eee8de] bg-white text-slate-900 outline-none text-xs transition-all focus:border-[#1b4332]"
                >
                  <option value="Study">Study</option>
                  <option value="Project">Project</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-800">Date</label>
                  <input
                    type="text"
                    value={reminderForm.date}
                    onChange={(e) => setReminderForm({ ...reminderForm, date: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-[#eee8de] bg-white text-slate-900 outline-none text-xs transition-all focus:border-[#1b4332]"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-800">Time</label>
                  <input
                    type="text"
                    value={reminderForm.time}
                    onChange={(e) => setReminderForm({ ...reminderForm, time: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-[#eee8de] bg-white text-slate-900 outline-none text-xs transition-all focus:border-[#1b4332]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-800">Repeat</label>
                <select
                  value={reminderForm.repeat}
                  onChange={(e) => setReminderForm({ ...reminderForm, repeat: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-[#eee8de] bg-white text-slate-900 outline-none text-xs transition-all focus:border-[#1b4332]"
                >
                  <option value="One Time">One Time</option>
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#eee8de]">
                <button
                  type="button"
                  onClick={() => setIsEditReminderOpen(false)}
                  className="px-4 py-2 rounded-xl font-semibold border border-[#eee8de] text-slate-700 hover:bg-[#f4f0e6]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-semibold bg-rose-500 hover:bg-rose-600 text-white shadow-md transition-all"
                >
                  Update in Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentCard;
