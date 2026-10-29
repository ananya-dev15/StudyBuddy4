import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import API_BASE from "../services/apiBase";
import { useAppContext } from "../context/AppContext";
import avatar1 from "../assets/avatars/avatar1.jpg";
import avatar2 from "../assets/avatars/avatar2.jpg";
import avatar3 from "../assets/avatars/avatar3.jpg";
import avatar4 from "../assets/avatars/avatar4.jpg";
import avatar5 from "../assets/avatars/avatar5.jpg";
import avatar6 from "../assets/avatars/avatar6.jpg";
import avatar7 from "../assets/avatars/avatar7.jpg";
import avatar8 from "../assets/avatars/avatar8.jpg";

export const DEFAULT_FEEDBACKS = [
  {
    id: 1,
    name: "Ananya",
    role: "Computer Science",
    milestone: "Journey Kickoff",
    review: "Reminders keep me punctual and streaks keep me motivated. It’s addictive in a good way!",
    stars: 5,
    avatar: avatar1,
    color: "#6366f1", // Indigo
    badge: "01",
    tag: "Milestone 1",
  },
  {
    id: 2,
    name: "Raj",
    role: "Engineering Student",
    milestone: "Habit Building",
    review: "The AI Chatbot is my study buddy at 2 AM. Never thought an app could help this much.",
    stars: 5,
    avatar: avatar2,
    color: "#0ea5e9", // Sky
    badge: "02",
    tag: "Milestone 2",
  },
  {
    id: 3,
    name: "Priya",
    role: "MBA Student",
    milestone: "Consistency Peak",
    review: "Analytics make me realize how consistent I’ve been. It’s like fitness tracking, but for studying.",
    stars: 5,
    avatar: avatar3,
    color: "#8b5cf6", // Purple
    badge: "03",
    tag: "Milestone 3",
  },
  {
    id: 4,
    name: "Setu",
    role: "Data Science",
    milestone: "Deep Focus",
    review: "Video tracker is pure magic. Keeps my eyes on lecture material and stops tab switching.",
    stars: 5,
    avatar: avatar4,
    color: "#10b981", // Emerald
    badge: "04",
    tag: "Milestone 4",
  },
  {
    id: 5,
    name: "Ankit",
    role: "Electronics Student",
    milestone: "Milestone Streak",
    review: "Study streaks pushed me through semester exams. The leaderboard made prep fun and competitive.",
    stars: 5,
    avatar: avatar5,
    color: "#f59e0b", // Amber
    badge: "05",
    tag: "Milestone 5",
  },
  {
    id: 6,
    name: "Yash",
    role: "Software Engineering",
    milestone: "Project Delivery",
    review: "Clean UI, smart assignments deadlines, and automated reminders saved my final projects.",
    stars: 5,
    avatar: avatar6,
    color: "#f43f5e", // Rose
    badge: "06",
    tag: "Milestone 6",
  },
  {
    id: 7,
    name: "Anshika",
    role: "AI & ML Researcher",
    milestone: "Productivity Boost",
    review: "Focus reports in PDF helped me track my peak productive hours throughout the week.",
    stars: 5,
    avatar: avatar7,
    color: "#06b6d4", // Cyan
    badge: "07",
    tag: "Milestone 7",
  },
  {
    id: 8,
    name: "Dev",
    role: "Biotech Scholar",
    milestone: "Exam Mastery",
    review: "The best study platform I've used. Replaced four different productivity apps for me.",
    stars: 5,
    avatar: avatar8,
    color: "#ea580c", // Orange
    badge: "08",
    tag: "Milestone 8",
  },
];

const COLOR_PALETTE = [
  { label: "Purple", hex: "#8b5cf6" },
  { label: "Indigo", hex: "#6366f1" },
  { label: "Sky", hex: "#0ea5e9" },
  { label: "Emerald", hex: "#10b981" },
  { label: "Amber", hex: "#f59e0b" },
  { label: "Rose", hex: "#f43f5e" },
  { label: "Cyan", hex: "#06b6d4" },
  { label: "Orange", hex: "#ea580c" },
];

const FeedbackRoadJourney = ({ theme = "dark", feedbacks: propFeedbacks, onOpenAuth }) => {
  const { appState } = useAppContext();
  const user = appState?.user || (typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "null") : null);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const isLoggedIn = Boolean(user && token);

  const viewportRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Feedbacks State: Default 8 + DB items
  const [feedbacksList, setFeedbacksList] = useState(propFeedbacks || DEFAULT_FEEDBACKS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAuthNotice, setShowAuthNotice] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Modal Form State
  const [milestone, setMilestone] = useState("");
  const [review, setReview] = useState("");
  const [role, setRole] = useState(user?.course || user?.domain || user?.className || "Student");
  const [stars, setStars] = useState(5);
  const [hoverStars, setHoverStars] = useState(0);
  const [selectedColor, setSelectedColor] = useState("#8b5cf6");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Sync role when user changes
  useEffect(() => {
    if (user?.course || user?.domain || user?.className) {
      setRole(user.course || user.domain || user.className || "Student");
    }
  }, [user]);

  // Fetch feedbacks saved in MongoDB on mount
  useEffect(() => {
    let isMounted = true;
    const fetchDbFeedbacks = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/feedbacks`);
        const data = await res.json();
        if (data?.success && Array.isArray(data.feedbacks) && data.feedbacks.length > 0) {
          const dbItems = data.feedbacks.map((fb, idx) => {
            const milestoneNum = 9 + idx;
            return {
              id: fb._id || `db-${idx}`,
              name: fb.name || "Student",
              role: fb.role || "Student",
              milestone: fb.milestone || "Milestone",
              review: fb.review || "",
              stars: fb.stars || 5,
              avatar: fb.avatar || null,
              color: fb.color || "#8b5cf6",
              badge: fb.badge || String(milestoneNum).padStart(2, "0"),
              tag: fb.tag || `Milestone ${milestoneNum}`,
            };
          });
          if (isMounted) {
            setFeedbacksList([...DEFAULT_FEEDBACKS, ...dbItems]);
          }
        }
      } catch (err) {
        console.error("Failed to load feedbacks from database:", err);
      }
    };
    fetchDbFeedbacks();
    return () => {
      isMounted = false;
    };
  }, []);

  // Geometry Constants for Curved Winding Highway
  const Y_TOP = 205;
  const Y_BOTTOM = 385;
  const R = 50; // Smooth 90-degree corner radius
  const ROAD_CANVAS_HEIGHT = 600;
  const CARD_WIDTH = 210;
  const CARD_HEIGHT = 165;
  const CARD_GAP = 190; // Distance between card centers on the same horizontal segment

  // Auto-scroll & interaction state
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  isPausedRef.current = isPaused;

  const isUserInteractingRef = useRef(false);
  const resumeTimeoutRef = useRef(null);
  const scrollSubpixelRef = useRef(0);

  // Compute curved road path & milestone positions (alternating above and below, duplicated for seamless loop)
  const {
    displayPositions,
    cycleWidth,
    totalTrackWidth,
    pathD,
    startBadges,
    loopBadges,
  } = useMemo(() => {
    // Generate curved roadmap for 2 complete cycles of feedbacksList
    const doubled = [...feedbacksList, ...feedbacksList];
    const positions = [];
    const path = [];
    const starts = [];
    const loops = [];

    let currentX = 0;
    let currentY = Y_TOP;
    let isTopLevel = true;
    let itemIdx = 0;
    let globalCardIdx = 0;
    let cycle1Width = 0;

    path.push(`M 0 ${Y_TOP}`);
    currentX = 30;
    path.push(`L ${currentX} ${Y_TOP}`);

    // Place items along curved road
    while (itemIdx < doubled.length) {
      const segStartX = currentX;
      const segLevelY = currentY;

      // START badge at beginning of cycle 1 and cycle 2
      if (itemIdx === 0) {
        starts.push({ x: segStartX + 10, y: segLevelY });
      } else if (itemIdx === feedbacksList.length) {
        starts.push({ x: segStartX + 10, y: segLevelY });
      }

      // We place up to 3 cards per segment
      const cardsInSeg = Math.min(3, doubled.length - itemIdx);
      const segPositions = [];

      for (let c = 0; c < cardsInSeg; c++) {
        const item = doubled[itemIdx];
        const isTop = globalCardIdx % 2 === 1; // Strict alternation 0=Bottom, 1=Top, 2=Bottom, 3=Top...
        const roadX = segStartX + 130 + c * CARD_GAP;
        const cardX = roadX - CARD_WIDTH / 2;
        // If top: sits above road level; if bottom: sits below road level
        const cardY = isTop ? segLevelY - 21 - 14 - CARD_HEIGHT : segLevelY + 21 + 14;

        segPositions.push({
          item,
          originalIdx: itemIdx % feedbacksList.length,
          displayId: `${item.id}-dup-${itemIdx}`,
          isTop,
          roadX,
          roadY: segLevelY,
          cardX,
          cardY,
          pinX: roadX,
          pinY: segLevelY,
        });

        itemIdx++;
        globalCardIdx++;
      }

      positions.push(...segPositions);

      // Horizontal segment road length
      const segContentWidth = 130 + (cardsInSeg - 1) * CARD_GAP + 130;
      const segEndX = segStartX + segContentWidth;
      path.push(`L ${segEndX} ${segLevelY}`);

      if (itemIdx === feedbacksList.length) {
        cycle1Width = segEndX + 2 * R;
        loops.push({ x: segEndX - 35, y: segLevelY });
      } else if (itemIdx >= doubled.length) {
        loops.push({ x: segEndX - 35, y: segLevelY });
      }

      // If more items remain, curve to the other level
      if (itemIdx < doubled.length) {
        if (isTopLevel) {
          // Curve DOWN from Y_TOP to Y_BOTTOM
          path.push(`A ${R} ${R} 0 0 1 ${segEndX + R} ${Y_TOP + R}`);
          path.push(`L ${segEndX + R} ${Y_BOTTOM - R}`);
          path.push(`A ${R} ${R} 0 0 0 ${segEndX + 2 * R} ${Y_BOTTOM}`);
          currentX = segEndX + 2 * R;
          currentY = Y_BOTTOM;
          isTopLevel = false;
        } else {
          // Curve UP from Y_BOTTOM to Y_TOP
          path.push(`A ${R} ${R} 0 0 0 ${segEndX + R} ${Y_BOTTOM - R}`);
          path.push(`L ${segEndX + R} ${Y_TOP + R}`);
          path.push(`A ${R} ${R} 0 0 1 ${segEndX + 2 * R} ${Y_TOP}`);
          currentX = segEndX + 2 * R;
          currentY = Y_TOP;
          isTopLevel = true;
        }
      } else {
        currentX = segEndX + 160;
        path.push(`L ${currentX} ${segLevelY}`);
      }
    }

    const calculatedCycleWidth = cycle1Width || currentX / 2;

    return {
      displayPositions: positions,
      cycleWidth: calculatedCycleWidth,
      totalTrackWidth: currentX + 80,
      pathD: path.join(" "),
      startBadges: starts,
      loopBadges: loops,
    };
  }, [feedbacksList]);

  // Continuous loop auto-scroll (slow, smooth, seamless wrap-around)
  useEffect(() => {
    let animId;
    const speed = 0.65; // ~39px per second at 60fps - gentle reading speed

    const step = () => {
      const el = viewportRef.current;
      if (el && !isPausedRef.current && !isUserInteractingRef.current) {
        scrollSubpixelRef.current += speed;
        if (scrollSubpixelRef.current >= 1) {
          const moveBy = Math.floor(scrollSubpixelRef.current);
          scrollSubpixelRef.current -= moveBy;

          el.scrollLeft += moveBy;
          // Seamless infinite wrap-around
          if (el.scrollLeft >= cycleWidth && cycleWidth > 0) {
            el.scrollLeft -= cycleWidth;
          }
        }
      }
      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [cycleWidth]);

  // Toggle pause on tap/click
  const handleTogglePause = () => {
    setIsPaused((prev) => !prev);
  };

  // Sync scroll state on viewport scroll
  const handleScrollUpdate = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;

    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(true);
    setCanScrollRight(true);

    if (maxScroll > 0) {
      setScrollProgress(el.scrollLeft / maxScroll);
    }
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    el.addEventListener("scroll", handleScrollUpdate, { passive: true });
    handleScrollUpdate();

    return () => el.removeEventListener("scroll", handleScrollUpdate);
  }, [handleScrollUpdate, feedbacksList.length]);

  // Mouse wheel handler for smooth horizontal scroll
  const handleWheel = (e) => {
    const el = viewportRef.current;
    if (!el) return;

    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      isUserInteractingRef.current = true;
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = setTimeout(() => {
        isUserInteractingRef.current = false;
      }, 1800);

      el.scrollLeft += e.deltaY * 1.5;
      if (el.scrollLeft >= cycleWidth && cycleWidth > 0) {
        el.scrollLeft -= cycleWidth;
      } else if (el.scrollLeft <= 0 && cycleWidth > 0) {
        el.scrollLeft += cycleWidth;
      }
    }
  };

  // Drag-to-scroll implementation
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);

  const handleMouseDown = (e) => {
    const el = viewportRef.current;
    if (!el) return;
    isDraggingRef.current = true;
    isUserInteractingRef.current = true;
    startXRef.current = e.pageX - el.offsetLeft;
    startScrollLeftRef.current = el.scrollLeft;
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    const el = viewportRef.current;
    if (!el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startXRef.current) * 1.6;
    el.scrollLeft = startScrollLeftRef.current - walk;

    if (el.scrollLeft >= cycleWidth && cycleWidth > 0) {
      el.scrollLeft -= cycleWidth;
      startXRef.current = x;
      startScrollLeftRef.current = el.scrollLeft;
    } else if (el.scrollLeft <= 0 && cycleWidth > 0) {
      el.scrollLeft += cycleWidth;
      startXRef.current = x;
      startScrollLeftRef.current = el.scrollLeft;
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    resumeTimeoutRef.current = setTimeout(() => {
      isUserInteractingRef.current = false;
    }, 1800);
  };

  // Button navigation helper (Left/Right)
  const scrollByDirection = (dir) => {
    const el = viewportRef.current;
    if (!el) return;

    isUserInteractingRef.current = true;
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    resumeTimeoutRef.current = setTimeout(() => {
      isUserInteractingRef.current = false;
    }, 2000);

    const step = 360;
    const newLeft = dir === "next" ? el.scrollLeft + step : el.scrollLeft - step;
    el.scrollTo({
      left: newLeft,
      behavior: "smooth",
    });

    setTimeout(() => {
      if (el.scrollLeft >= cycleWidth && cycleWidth > 0) {
        el.scrollLeft -= cycleWidth;
      } else if (el.scrollLeft <= 0 && cycleWidth > 0) {
        el.scrollLeft += cycleWidth;
      }
    }, 400);
  };

  // Jump directly to milestone
  const scrollToMilestone = (milestoneIdx) => {
    const el = viewportRef.current;
    if (!el) return;

    setIsPaused(true);
    const targetPos = displayPositions.find((p) => p.originalIdx === milestoneIdx);
    if (!targetPos) return;

    const targetX = Math.max(0, targetPos.roadX - el.clientWidth / 2);
    el.scrollTo({
      left: targetX,
      behavior: "smooth",
    });
  };

  // Open Add Feedback Modal or trigger Auth Modal
  const handleOpenAddFeedback = () => {
    if (!isLoggedIn) {
      if (typeof onOpenAuth === "function") {
        onOpenAuth();
      } else {
        setShowAuthNotice(true);
      }
      return;
    }
    setFormError("");
    setIsModalOpen(true);
  };

  // Submit Feedback Form Handler
  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!milestone.trim()) {
      setFormError("Please provide a milestone title.");
      return;
    }
    if (!review.trim()) {
      setFormError("Please write your experience or feedback.");
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      const activeToken = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/feedbacks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify({
          milestone: milestone.trim(),
          review: review.trim(),
          role: role.trim() || user?.course || "Student",
          stars,
          color: selectedColor,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to submit feedback.");
      }

      const fb = data.feedback;
      const nextIndex = feedbacksList.length;
      const milestoneNum = nextIndex + 1;
      const newMilestone = {
        id: fb._id || `db-${Date.now()}`,
        name: fb.name || user?.name || "Student",
        role: fb.role || role || "Student",
        milestone: fb.milestone || milestone.trim(),
        review: fb.review || review.trim(),
        stars: fb.stars || stars,
        avatar: fb.avatar || user?.profileImage || null,
        color: fb.color || selectedColor,
        badge: fb.badge || String(milestoneNum).padStart(2, "0"),
        tag: fb.tag || `Milestone ${milestoneNum}`,
      };

      setFeedbacksList((prev) => [...prev, newMilestone]);
      setSubmitting(false);
      setIsModalOpen(false);
      setMilestone("");
      setReview("");
      setStars(5);

      setToastMessage("🎉 Milestone added to your Study Journey Roadmap!");
      setTimeout(() => setToastMessage(""), 5000);

      // Smooth scroll to the end of the roadmap to reveal the newly created milestone!
      setTimeout(() => {
        const el = viewportRef.current;
        if (el) {
          el.scrollTo({
            left: el.scrollWidth,
            behavior: "smooth",
          });
        }
      }, 400);
    } catch (err) {
      console.error("Error creating feedback:", err);
      setFormError(err.message || "Failed to post feedback.");
      setSubmitting(false);
    }
  };

  // Render a teardrop map pin seated on the road
  const renderPin = (pos) => {
    const { item, pinX, pinY, isTop, displayId, originalIdx } = pos;
    const color = item.color || "#6366f1";
    // For top card, pin points UP towards the card (rotate 180)
    // For bottom card, pin points DOWN towards the card (rotate 0)
    const rotation = isTop ? 180 : 0;

    return (
      <g
        key={`pin-${displayId}`}
        transform={`translate(${pinX}, ${pinY})`}
        className="cursor-pointer pointer-events-auto transition-opacity hover:opacity-90"
        onClick={(e) => {
          e.stopPropagation();
          scrollToMilestone(originalIdx);
        }}
      >
        {/* Pulsing subtle radar ring */}
        <circle r="14" fill={color} opacity="0.22" className="animate-ping pointer-events-none" />

        {/* Pin Body pointing towards card */}
        <g transform={`rotate(${rotation}) translate(0, -22)`}>
          {/* Teardrop Pin Shape */}
          <path
            d="M 0 22 C -2 19 -16 4 -16 -8 A 16 16 0 1 1 16 -8 C 16 4 2 19 0 22 Z"
            fill={color}
            filter="drop-shadow(0px 4px 8px rgba(0,0,0,0.35))"
          />

          {/* White Inner Circle */}
          <circle cx="0" cy="-8" r="11" fill="#ffffff" />

          {/* Avatar Clip or Initial/Badge text (kept upright) */}
          {item.avatar ? (
            <>
              <clipPath id={`clip-scaled-${displayId}`}>
                <circle cx="0" cy="-8" r="10" />
              </clipPath>
              <image
                href={item.avatar}
                x="-10"
                y="-18"
                width="20"
                height="20"
                clipPath={`url(#clip-scaled-${displayId})`}
                preserveAspectRatio="xMidYMid slice"
                transform={isTop ? "rotate(180 0 -8)" : undefined}
              />
            </>
          ) : (
            <text
              x="0"
              y="-4"
              textAnchor="middle"
              fill={color}
              fontSize="8"
              fontWeight="bold"
              transform={isTop ? "rotate(180 0 -7)" : undefined}
            >
              {item.badge || item.name?.charAt(0) || "★"}
            </text>
          )}
        </g>
      </g>
    );
  };

  return (
    <div className="relative w-full bg-transparent select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-900/90 text-white border border-emerald-500/50 shadow-2xl backdrop-blur-xl animate-bounce">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <p className="text-xs sm:text-sm font-semibold">{toastMessage}</p>
        </div>
      )}

      {/* Section Header */}
      <div className="text-center mb-4 w-full max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-center gap-2.5 mb-2 flex-wrap">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400">
              Student Milestones ({feedbacksList.length})
            </span>
          </div>

          {/* Auto-scroll toggle pill */}
          <button
            type="button"
            onClick={handleTogglePause}
            className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md border transition-all duration-300 shadow-sm cursor-pointer ${
              isPaused
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30 shadow-amber-500/10"
                : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30 shadow-emerald-500/10"
            }`}
            title={isPaused ? "Tap to play auto-scroll" : "Tap to pause auto-scroll"}
          >
            <span className={`w-2 h-2 rounded-full ${isPaused ? "bg-amber-400" : "bg-emerald-400 animate-ping"}`} />
            <span>{isPaused ? "⏸ Paused (Tap to play)" : "▶ Auto-scrolling (Tap to pause)"}</span>
          </button>
        </div>
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
          Student's Feedback
        </h2>
        <p className="mt-2 text-sm text-white/80 max-w-xl mx-auto drop-shadow-sm font-medium">
          Follow how students level up their focus, maintain study streaks, and conquer exams with StudyBuddy.
        </p>
      </div>

      {/* Roadmap Container */}
      <div className="relative max-w-7xl mx-auto px-2 sm:px-4">
        {/* Left-Side Fixed PREV Button */}
        <button
          type="button"
          onClick={() => scrollByDirection("prev")}
          aria-label="Previous Milestones"
          title="Previous (←)"
          className={`absolute left-0 sm:left-2 top-1/2 -translate-y-1/2 z-30 w-10 h-10 md:w-11 md:h-11 rounded-2xl border backdrop-blur-xl flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer hover:scale-110 active:scale-95 hover:border-purple-400/60 ${
            theme === "dark"
              ? "bg-slate-900/80 border-white/20 text-white shadow-purple-500/10"
              : "bg-white/85 border-white text-slate-900 shadow-indigo-500/15"
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Right-Side Fixed NEXT Button */}
        <button
          type="button"
          onClick={() => scrollByDirection("next")}
          aria-label="Next Milestones"
          title="Next (→)"
          className={`absolute right-0 sm:right-2 top-1/2 -translate-y-1/2 z-30 w-10 h-10 md:w-11 md:h-11 rounded-2xl border backdrop-blur-xl flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer hover:scale-110 active:scale-95 hover:border-purple-400/60 ${
            theme === "dark"
              ? "bg-slate-900/80 border-white/20 text-white shadow-purple-500/10"
              : "bg-white/85 border-white text-slate-900 shadow-indigo-500/15"
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Scrollable Viewport (Smooth continuous loop scroll, hidden scrollbar) */}
        <div
          ref={viewportRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleTogglePause}
          className="w-full overflow-x-auto overflow-y-hidden cursor-grab active:cursor-grabbing bg-transparent"
          style={{
            height: `${ROAD_CANVAS_HEIGHT}px`,
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {/* Journey Track (Road + Pins + Cards moving together) */}
          <div
            className="relative will-change-transform bg-transparent"
            style={{
              width: `${totalTrackWidth}px`,
              height: `${ROAD_CANVAS_HEIGHT}px`,
            }}
          >
            {/* Continuous SVG Road */}
            <svg
              className="absolute inset-0 pointer-events-auto bg-transparent"
              width={totalTrackWidth}
              height={ROAD_CANVAS_HEIGHT}
              viewBox={`0 0 ${totalTrackWidth} ${ROAD_CANVAS_HEIGHT}`}
            >
              <defs>
                <filter id="road-subtle-glow" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="rgba(0,0,0,0.3)" />
                </filter>
              </defs>

              {/* 1. Road Outer Shadow / Curb - Broad */}
              <path
                d={pathD}
                fill="none"
                stroke={theme === "dark" ? "#1a202c" : "#94a3b8"}
                strokeWidth="50"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#road-subtle-glow)"
              />

              {/* 2. Main Road Surface (Thick Central Ribbon) - Broad */}
              <path
                d={pathD}
                fill="none"
                stroke={theme === "dark" ? "#2d3748" : "#cbd5e1"}
                strokeWidth="42"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* 3. Center Dashed Line */}
              <path
                d={pathD}
                fill="none"
                stroke="#ffffff"
                strokeWidth="3"
                strokeDasharray="10 10"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.95"
              />

              {/* Connecting Dotted Stems from Road to Cards */}
              {displayPositions.map((pos) => {
                const item = pos.item;
                const y1 = pos.isTop ? pos.roadY - 21 : pos.roadY + 21;
                const y2 = pos.isTop ? pos.cardY + CARD_HEIGHT : pos.cardY;

                return (
                  <line
                    key={`stem-${pos.displayId}`}
                    x1={pos.roadX}
                    y1={y1}
                    x2={pos.roadX}
                    y2={y2}
                    stroke={item.color || "#6366f1"}
                    strokeWidth="2.5"
                    strokeDasharray="3 3"
                    strokeLinecap="round"
                    opacity="0.9"
                  />
                );
              })}

              {/* START Badges */}
              {startBadges.map((b, bIdx) => (
                <g key={`start-badge-${bIdx}`} transform={`translate(${b.x}, ${b.y})`}>
                  <rect
                    x="-8"
                    y="-13"
                    width="54"
                    height="26"
                    rx="13"
                    fill={theme === "dark" ? "#1e293b" : "#ffffff"}
                    stroke="#10b981"
                    strokeWidth="1.5"
                    filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
                  />
                  <circle cx="2" cy="0" r="3.5" fill="#10b981" />
                  <text
                    x="12"
                    y="3.5"
                    fill={theme === "dark" ? "#ffffff" : "#0f172a"}
                    fontSize="8.5"
                    fontWeight="bold"
                    letterSpacing="0.5"
                  >
                    START
                  </text>
                </g>
              ))}

              {/* FINISH / LOOP Badges */}
              {loopBadges.map((b, bIdx) => (
                <g key={`loop-badge-${bIdx}`} transform={`translate(${b.x}, ${b.y})`}>
                  <rect
                    x="-8"
                    y="-13"
                    width="56"
                    height="26"
                    rx="13"
                    fill={theme === "dark" ? "#1e293b" : "#ffffff"}
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                    filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
                  />
                  <text
                    x="20"
                    y="3.5"
                    textAnchor="middle"
                    fill={theme === "dark" ? "#ffffff" : "#0f172a"}
                    fontSize="9"
                    fontWeight="bold"
                  >
                    🏁 END
                  </text>
                </g>
              ))}

              {/* Map Pin Markers attached directly to the road */}
              {displayPositions.map((pos) => renderPin(pos))}
            </svg>

            {/* HTML Feedback Cards - Alternating Top & Bottom */}
            {displayPositions.map((pos) => {
              const item = pos.item;
              const starCount = Math.max(1, Math.min(5, Number(item.stars) || 5));

              return (
                <div
                  key={`card-${pos.displayId}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPaused((prev) => !prev);
                  }}
                  onMouseEnter={() => {
                    isUserInteractingRef.current = true;
                  }}
                  onMouseLeave={() => {
                    if (!isDraggingRef.current) {
                      isUserInteractingRef.current = false;
                    }
                  }}
                  className="absolute z-20 group transition-all duration-300 pointer-events-auto cursor-pointer"
                  style={{
                    left: `${pos.cardX}px`,
                    top: `${pos.cardY}px`,
                    width: `${CARD_WIDTH}px`,
                  }}
                  title="Tap to pause/resume auto-scroll"
                >
                  {/* Card Body: Glassmorphism directly over homepage background */}
                  <div
                    className={`relative p-3.5 rounded-2xl backdrop-blur-xl transition-all duration-300 transform group-hover:-translate-y-1 shadow-lg border ${
                      theme === "dark"
                        ? "bg-slate-900/85 hover:bg-slate-900/95 border-white/15 hover:border-purple-400/50 shadow-black/40 text-white"
                        : "bg-white/85 hover:bg-white border-white/80 shadow-slate-300/60 text-slate-800"
                    }`}
                    style={
                      pos.isTop
                        ? {
                            borderBottomColor: item.color,
                            borderBottomWidth: "3px",
                          }
                        : {
                            borderTopColor: item.color,
                            borderTopWidth: "3px",
                          }
                    }
                  >
                    {/* Header: Tag & Stars */}
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span
                        className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full tracking-wider"
                        style={{
                          backgroundColor: `${item.color}20`,
                          color: item.color,
                        }}
                      >
                        {item.tag}
                      </span>

                      <div className="flex text-amber-400 text-[10px] drop-shadow-[0_0_4px_rgba(251,191,36,0.6)]">
                        {"★".repeat(starCount) + "☆".repeat(5 - starCount)}
                      </div>
                    </div>

                    {/* Milestone Name */}
                    <h4
                      className={`font-bold text-xs mb-1 line-clamp-1 ${
                        theme === "dark" ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {item.milestone}
                    </h4>

                    {/* Review Quote */}
                    <p
                      className={`text-[11px] leading-relaxed mb-2.5 line-clamp-3 italic ${
                        theme === "dark" ? "text-slate-300" : "text-slate-600"
                      }`}
                    >
                      “{item.review}”
                    </p>

                    {/* Student Info */}
                    <div className="flex items-center gap-2 pt-2 border-t border-white/10 dark:border-white/10">
                      {item.avatar ? (
                        <img
                          src={item.avatar}
                          alt={item.name}
                          className="w-5 h-5 rounded-full object-cover border shrink-0"
                          style={{ borderColor: item.color }}
                        />
                      ) : (
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 shadow-sm"
                          style={{ backgroundColor: item.color }}
                        >
                          {item.name ? item.name.charAt(0).toUpperCase() : "S"}
                        </div>
                      )}
                      <div className="overflow-hidden">
                        <p
                          className={`text-[11px] font-bold truncate leading-tight ${
                            theme === "dark" ? "text-white" : "text-slate-950"
                          }`}
                        >
                          {item.name}
                        </p>
                        <p
                          className="text-[9.5px] truncate leading-tight"
                          style={{ color: item.color }}
                        >
                          {item.role}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Button Section Below the Road */}
        <div className="mt-4 flex flex-col items-center justify-center gap-2 px-4">
          <button
            type="button"
            onClick={handleOpenAddFeedback}
            className="group relative inline-flex items-center gap-2.5 px-6 py-2.5 rounded-full font-bold text-xs sm:text-sm tracking-wide shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer bg-[#1b3f30] hover:bg-[#143024] text-white border border-emerald-500/30 shadow-[0_4px_18px_rgba(27,63,48,0.45)]"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <svg
              className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Your Feedback</span>
            <span className="text-[10px] sm:text-xs bg-emerald-950/70 border border-emerald-400/30 text-emerald-300 px-2 py-0.5 rounded-full font-semibold ml-1">
              + Milestone {feedbacksList.length + 1}
            </span>
          </button>

          <p className="text-[11px] text-white/60 text-center font-medium">
            {isLoggedIn ? (
              <span>
                Logged in as <strong className="text-purple-300">{user?.name || "Student"}</strong>. Share your milestone to appear on the road!
              </span>
            ) : (
              <span>Sign in with your StudyBuddy account to post your feedback and milestone to the roadmap.</span>
            )}
          </p>
        </div>
      </div>

      {/* --- ADD FEEDBACK MODAL (Rendered via Portal at document.body with z-[99999]) --- */}
      {isModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
            <div
              className={`relative w-full max-w-lg rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-[0_25px_60px_rgba(0,0,0,0.4)] border transition-all ${
                theme === "dark"
                  ? "bg-slate-900/98 border-emerald-500/30 text-white"
                  : "bg-white border-slate-200 text-slate-900 shadow-2xl"
              }`}
            >
              {/* Modal Header */}
              <div
                className={`flex items-center justify-between pb-4 border-b mb-5 ${
                  theme === "dark" ? "border-white/10" : "border-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0"
                    style={{ backgroundColor: selectedColor }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className={`text-lg sm:text-xl font-bold tracking-tight ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                      Add Milestone Feedback
                    </h3>
                    <p className={`text-xs ${theme === "dark" ? "text-white/70" : "text-slate-500"}`}>
                      Milestone {feedbacksList.length + 1} will be saved and added to the road
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                    theme === "dark"
                      ? "text-white/70 hover:text-white hover:bg-white/10"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  ✕
                </button>
              </div>

            {/* Error Message */}
            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                <span>⚠️</span>
                <span>{formError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmitFeedback} className="space-y-4">
              {/* User preview pill */}
              <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs">
                <div className="flex items-center gap-2.5">
                  {user?.profileImage ? (
                    <img
                      src={user.profileImage}
                      alt={user.name}
                      className="w-6 h-6 rounded-full object-cover border border-purple-400"
                    />
                  ) : (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-white text-[10px]"
                      style={{ backgroundColor: selectedColor }}
                    >
                      {user?.name?.charAt(0) || "U"}
                    </div>
                  )}
                  <span className="font-semibold">{user?.name || "Student"}</span>
                </div>
                <span className="text-[10px] uppercase font-bold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full">
                  Verified Student
                </span>
              </div>

              {/* Milestone Title */}
              <div>
                <label className="block text-xs font-semibold mb-1 opacity-90">
                  Milestone Name <span className="text-pink-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={milestone}
                  onChange={(e) => setMilestone(e.target.value)}
                  placeholder="e.g. Deep Focus Streak, Semester Topper, AI Mastery"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm border outline-none transition-all ${
                    theme === "dark"
                      ? "bg-slate-800/80 border-white/15 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 text-white placeholder-white/30"
                      : "bg-slate-50 border-slate-200 focus:border-indigo-500 text-slate-900 placeholder-slate-400"
                  }`}
                />
              </div>

              {/* Role / Degree */}
              <div>
                <label className="block text-xs font-semibold mb-1 opacity-90">
                  Your Course / Role
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Computer Science, Biotech Scholar, AI Researcher"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm border outline-none transition-all ${
                    theme === "dark"
                      ? "bg-slate-800/80 border-white/15 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 text-white placeholder-white/30"
                      : "bg-slate-50 border-slate-200 focus:border-indigo-500 text-slate-900 placeholder-slate-400"
                  }`}
                />
              </div>

              {/* Star Rating & Accent Color Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Rating */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 opacity-90">
                    Rating ({stars} Star{stars > 1 ? "s" : ""})
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((starVal) => (
                      <button
                        type="button"
                        key={starVal}
                        onClick={() => setStars(starVal)}
                        onMouseEnter={() => setHoverStars(starVal)}
                        onMouseLeave={() => setHoverStars(0)}
                        className="text-xl sm:text-2xl transition-transform hover:scale-125 focus:outline-none"
                      >
                        <span
                          className={
                            starVal <= (hoverStars || stars)
                              ? "text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]"
                              : "text-slate-600"
                          }
                        >
                          ★
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Accent Color Picker */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 opacity-90">
                    Milestone Color Accent
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {COLOR_PALETTE.map((c) => (
                      <button
                        type="button"
                        key={c.hex}
                        onClick={() => setSelectedColor(c.hex)}
                        title={c.label}
                        className={`w-6 h-6 rounded-full transition-all duration-200 ${
                          selectedColor === c.hex
                            ? "ring-2 ring-white scale-125 shadow-md"
                            : "opacity-70 hover:opacity-100 hover:scale-110"
                        }`}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Review Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold opacity-90">
                    Review / Feedback <span className="text-pink-400">*</span>
                  </label>
                  <span className="text-[10px] opacity-60">
                    {review.length}/280
                  </span>
                </div>
                <textarea
                  required
                  rows="3"
                  maxLength="280"
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="Share how StudyBuddy helped you stay consistent, track focus, or prep for exams..."
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm border outline-none transition-all resize-none ${
                    theme === "dark"
                      ? "bg-slate-800/80 border-white/15 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 text-white placeholder-white/30"
                      : "bg-slate-50 border-slate-200 focus:border-indigo-500 text-slate-900 placeholder-slate-400"
                  }`}
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold opacity-80 hover:opacity-100 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="relative inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#1b3f30] hover:bg-[#143024] border border-emerald-500/30 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving to Road...</span>
                    </>
                  ) : (
                    <>
                      <span>Add to Roadmap</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* --- NON-LOGGED-IN NOTICE MODAL (Rendered via Portal at document.body) --- */}
      {showAuthNotice &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
            <div
              className={`relative w-full max-w-sm rounded-3xl p-6 text-center backdrop-blur-2xl shadow-[0_25px_60px_rgba(0,0,0,0.4)] border ${
                theme === "dark"
                  ? "bg-slate-900/98 border-emerald-500/30 text-white"
                  : "bg-white border-slate-200 text-slate-900 shadow-2xl"
              }`}
            >
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className={`text-lg font-bold mb-1 ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                Login Required
              </h3>
              <p className={`text-xs mb-5 leading-relaxed ${theme === "dark" ? "text-white/70" : "text-slate-600"}`}>
                Only logged-in users can share feedback and add milestones to the Study Journey Roadmap.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowAuthNotice(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    theme === "dark"
                      ? "opacity-70 hover:opacity-100 hover:bg-white/10 text-white"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  Close
                </button>
                <Link
                  to="/login"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#1b3f30] hover:bg-[#143024] border border-emerald-500/30 shadow-md"
                >
                  Log In / Sign Up
                </Link>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default FeedbackRoadJourney;
