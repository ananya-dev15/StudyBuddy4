import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import API_BASE from "../services/apiBase";

const DEFAULT_INTRO = {
  isIntro: true,
  title: "Frequently Asked Questions",
  subtitle: "Everything you need to know about StudyBuddy.",
};

const DEFAULT_FAQS = [
  {
    q: "Is StudyBuddy free to use?",
    a: "Yes! StudyBuddy offers a free plan with core features. You can upgrade for advanced analytics and AI tools.",
  },
  {
    q: "Can I use it on mobile?",
    a: "Absolutely. StudyBuddy is fully responsive and works on all devices.",
  },
  {
    q: "How does streak tracking work?",
    a: "Each day you log study sessions, your streak grows. Miss a day, and it resets — motivating you to stay consistent.",
  },
];

const SLIDE_DURATION = 5500; // ~5.5 seconds per slide

const FAQCarousel = ({
  theme = "dark",
  intro = DEFAULT_INTRO,
  faqs = DEFAULT_FAQS,
}) => {
  // Live dynamic FAQs fetched from backend MongoDB
  const [liveFaqs, setLiveFaqs] = useState(faqs);

  // Ask a Question Modal state
  const [isAskModalOpen, setIsAskModalOpen] = useState(false);
  const [askQuestion, setAskQuestion] = useState("");
  const [askName, setAskName] = useState("");
  const [askEmail, setAskEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Fetch published FAQs from backend
  const fetchPublishedFAQs = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/faqs/published`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.faqs) && data.faqs.length > 0) {
          const formatted = data.faqs.map((f) => ({
            q: f.question,
            a: f.answer,
            _id: f._id,
          }));
          setLiveFaqs(formatted);
        }
      }
    } catch (err) {
      console.warn("Could not fetch published FAQs from API, using default fallback:", err);
    }
  }, []);

  useEffect(() => {
    fetchPublishedFAQs();
  }, [fetchPublishedFAQs]);

  // Handle Question Submission
  const handleQuestionSubmit = async (e) => {
    e.preventDefault();
    if (!askQuestion.trim()) return;

    setIsSubmitting(true);
    setSubmitError("");
    setSubmitSuccess(false);

    try {
      const res = await fetch(`${API_BASE}/api/faqs/question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: askQuestion.trim(),
          userName: askName.trim() || undefined,
          userEmail: askEmail.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitSuccess(true);
        setAskQuestion("");
        setAskName("");
        setAskEmail("");
        setTimeout(() => {
          setIsAskModalOpen(false);
          setSubmitSuccess(false);
        }, 2200);
      } else {
        setSubmitError(data.message || "Failed to submit question. Please try again.");
      }
    } catch (err) {
      console.error("Error submitting question:", err);
      setSubmitError("Network error. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Combine into structured slides: Slide 1 = Introduction, Slide 2..N = FAQs
  const slides = useMemo(() => {
    return [
      {
        ...intro,
        isIntro: true,
      },
      ...liveFaqs.map((faq, idx) => ({
        isIntro: false,
        faqIndex: idx + 1,
        title: faq.q,
        subtitle: faq.a,
        ...faq,
      })),
    ];
  }, [intro, liveFaqs]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideStage, setSlideStage] = useState("active"); // "entering" | "active" | "exiting"
  const [direction, setDirection] = useState("next"); // "next" | "prev"
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [progress, setProgress] = useState(0);

  const isPaused = isHovered || isPressed || isAskModalOpen;
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const isTransitioningRef = useRef(false);
  const elapsedRef = useRef(0);
  const lastTimeRef = useRef(null);
  const rafIdRef = useRef(null);

  // Check for prefers-reduced-motion
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setPrefersReducedMotion(mediaQuery.matches);
      const listener = (e) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener?.("change", listener);
      return () => mediaQuery.removeEventListener?.("change", listener);
    }
  }, []);

  // Trigger smooth transition between slides
  const triggerTransition = useCallback(
    (dir, targetIndex = null) => {
      if (isTransitioningRef.current) return;
      isTransitioningRef.current = true;
      setDirection(dir);
      setSlideStage("exiting");

      // Short exit duration (200ms)
      setTimeout(() => {
        setCurrentIndex((prev) => {
          if (targetIndex !== null) return targetIndex;
          if (dir === "next") {
            return (prev + 1) % slides.length;
          } else {
            return (prev - 1 + slides.length) % slides.length;
          }
        });

        // Reset progress and elapsed
        elapsedRef.current = 0;
        setProgress(0);
        setSlideStage("entering");

        // Next animation frame: start entrance animation
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setSlideStage("active");
            setTimeout(() => {
              isTransitioningRef.current = false;
            }, 350);
          });
        });
      }, 200);
    },
    [slides.length]
  );

  // Manual next / prev navigation
  const handleManualNav = useCallback(
    (dir) => {
      elapsedRef.current = 0;
      setProgress(0);
      triggerTransition(dir);
    },
    [triggerTransition]
  );

  // Jump to specific dot
  const handleDotClick = useCallback(
    (idx) => {
      if (idx === currentIndex || isTransitioningRef.current) return;
      const dir = idx > currentIndex ? "next" : "prev";
      elapsedRef.current = 0;
      setProgress(0);
      triggerTransition(dir, idx);
    },
    [currentIndex, triggerTransition]
  );

  // Keyboard navigation (ArrowLeft / ArrowRight)
  const handleKeyDown = useCallback(
    (e) => {
      if (isAskModalOpen) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleManualNav("prev");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleManualNav("next");
      }
    },
    [handleManualNav, isAskModalOpen]
  );

  // Autoplay ticker via requestAnimationFrame
  useEffect(() => {
    lastTimeRef.current = performance.now();

    const loop = (now) => {
      const delta = now - (lastTimeRef.current || now);
      lastTimeRef.current = now;

      // Only increment if not paused and not currently transitioning
      if (!isPausedRef.current && !isTransitioningRef.current) {
        elapsedRef.current += delta;
        const currentProgress = Math.min(
          100,
          (elapsedRef.current / SLIDE_DURATION) * 100
        );
        setProgress(currentProgress);

        if (elapsedRef.current >= SLIDE_DURATION) {
          elapsedRef.current = 0;
          setProgress(0);
          triggerTransition("next");
        }
      }

      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [triggerTransition]);

  // Adjust currentIndex if slides shrink
  useEffect(() => {
    if (currentIndex >= slides.length) {
      setCurrentIndex(0);
      elapsedRef.current = 0;
      setProgress(0);
    }
  }, [slides.length, currentIndex]);

  const currentSlide = slides[currentIndex] || slides[0];

  // Helper classes for sliding animation
  const getQuestionAnimClass = () => {
    if (prefersReducedMotion) return "";
    if (slideStage === "exiting") {
      return direction === "next"
        ? "opacity-0 -translate-x-8 transition-all duration-200 ease-in"
        : "opacity-0 translate-x-8 transition-all duration-200 ease-in";
    }
    if (slideStage === "entering") {
      return direction === "next"
        ? "opacity-0 translate-x-8"
        : "opacity-0 -translate-x-8";
    }
    // "active"
    return "opacity-100 translate-x-0 transition-all duration-350 ease-out";
  };

  const getAnswerAnimClass = () => {
    if (prefersReducedMotion) return "";
    if (slideStage === "exiting") {
      return direction === "next"
        ? "opacity-0 -translate-x-6 transition-all duration-150 ease-in"
        : "opacity-0 translate-x-6 transition-all duration-150 ease-in";
    }
    if (slideStage === "entering") {
      return direction === "next"
        ? "opacity-0 translate-x-6"
        : "opacity-0 -translate-x-6";
    }
    // "active" with slight delay after question
    return "opacity-100 translate-x-0 transition-all duration-400 ease-out delay-150";
  };

  // Badge label: "Introduction (1 of 4)", "FAQ 1 (2 of 4)", etc.
  const getBadgeText = () => {
    if (currentSlide.isIntro) {
      return `Introduction (1 of ${slides.length})`;
    }
    return `FAQ ${currentSlide.faqIndex} (${currentIndex + 1} of ${slides.length})`;
  };

  return (
    <div
      className="w-full relative mx-auto text-left"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={(e) => {
        if (e.button === 0) setIsPressed(true);
      }}
      onMouseUp={() => setIsPressed(false)}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onTouchCancel={() => setIsPressed(false)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label="Frequently Asked Questions Carousel"
    >
      <div
        className={`relative rounded-3xl p-6 sm:p-8 backdrop-blur-2xl transition-all duration-300 border overflow-hidden select-none ${
          theme === "dark"
            ? "bg-gradient-to-b from-slate-900/75 to-slate-950/85 hover:from-slate-800/85 hover:to-slate-900/90 border-white/15 hover:border-purple-500/40 shadow-xl hover:shadow-[0_8px_25px_rgba(168,85,247,0.15)] text-white"
            : "bg-gradient-to-b from-white/70 via-white/55 to-white/65 hover:from-white/85 hover:via-white/70 hover:to-white/80 border-white/70 hover:border-white shadow-[0_8px_25px_rgba(0,0,0,0.08),inset_0_1px_1px_rgba(255,255,255,0.95)] hover:shadow-[0_14px_35px_rgba(31,38,135,0.15)] text-slate-800"
        }`}
      >
        {/* Top bar with slide index, Ask a Question button, & controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                theme === "dark"
                  ? currentSlide.isIntro
                    ? "bg-purple-500/20 border-purple-400/40 text-purple-200"
                    : "bg-white/10 border-white/20 text-indigo-300"
                  : currentSlide.isIntro
                  ? "bg-indigo-50 border-indigo-200 text-indigo-800"
                  : "bg-black/5 border-black/10 text-indigo-700"
              }`}
            >
              {getBadgeText()}
            </span>

            {/* Subtle Pause / Play status pill */}
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full transition-all duration-300 ${
                isPaused
                  ? theme === "dark"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "bg-amber-100 text-amber-800 border border-amber-200"
                  : "opacity-0 pointer-events-none"
              }`}
            >
              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
              Paused
            </span>
          </div>

          {/* Right Action: Ask a Question & Navigation Controls */}
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setIsAskModalOpen(true)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer shadow-sm ${
                theme === "dark"
                  ? "bg-gradient-to-r from-indigo-500/30 to-purple-500/30 hover:from-indigo-500/40 hover:to-purple-500/40 border-indigo-400/30 text-indigo-200"
                  : "bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700"
              }`}
              title="Submit a question to the team"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Ask a Question</span>
            </button>

            <button
              type="button"
              onClick={() => handleManualNav("prev")}
              aria-label="Previous Slide"
              title="Previous Slide"
              className={`p-2 rounded-xl border transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer ${
                theme === "dark"
                  ? "bg-white/10 hover:bg-white/20 border-white/15 hover:border-purple-400/50 text-white shadow-sm"
                  : "bg-white/80 hover:bg-white border-white/80 text-slate-800 shadow-sm hover:shadow"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => handleManualNav("next")}
              aria-label="Next Slide"
              title="Next Slide"
              className={`p-2 rounded-xl border transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer ${
                theme === "dark"
                  ? "bg-white/10 hover:bg-white/20 border-white/15 hover:border-purple-400/50 text-white shadow-sm"
                  : "bg-white/80 hover:bg-white border-white/80 text-slate-800 shadow-sm hover:shadow"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content Area (Fixed minimum height to prevent layout shifts) */}
        <div className="min-h-[140px] sm:min-h-[125px] md:min-h-[110px] flex flex-col justify-center pb-6">
          {currentSlide.isIntro ? (
            <div className="text-center py-2 sm:py-3 flex flex-col items-center justify-center">
              <h2
                className={`text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight transform ${
                  theme === "dark"
                    ? "text-white drop-shadow-[0_2px_12px_rgba(168,85,247,0.35)]"
                    : "text-slate-900 drop-shadow-sm"
                } ${getQuestionAnimClass()}`}
              >
                {currentSlide.title}
              </h2>

              <p
                className={`mt-2.5 sm:mt-3 text-sm sm:text-base md:text-lg font-medium leading-relaxed max-w-xl mx-auto transform ${
                  theme === "dark" ? "text-purple-200/90" : "text-slate-600 font-medium"
                } ${getAnswerAnimClass()}`}
              >
                {currentSlide.subtitle}
              </p>
            </div>
          ) : (
            <div>
              <h3
                className={`font-bold text-lg md:text-xl transform ${
                  theme === "dark" ? "text-white" : "text-slate-900"
                } ${getQuestionAnimClass()}`}
              >
                {currentSlide.title}
              </h3>

              <p
                className={`mt-2.5 text-sm md:text-base leading-relaxed transform ${
                  theme === "dark" ? "text-white/90" : "text-slate-700/90 font-medium"
                } ${getAnswerAnimClass()}`}
              >
                {currentSlide.subtitle}
              </p>
            </div>
          )}
        </div>

        {/* Bottom Pagination Dots & Instructions */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10 dark:border-white/10">
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {slides.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleDotClick(idx)}
                aria-label={
                  s.isIntro
                    ? "Go to Introduction slide"
                    : `Go to FAQ ${s.faqIndex}`
                }
                title={
                  s.isIntro
                    ? "Introduction"
                    : `FAQ ${s.faqIndex}: ${s.title}`
                }
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  idx === currentIndex
                    ? theme === "dark"
                      ? "w-6 h-1.5 bg-gradient-to-r from-indigo-400 to-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.6)]"
                      : "w-6 h-1.5 bg-[#1b3f30]"
                    : theme === "dark"
                    ? "w-1.5 h-1.5 bg-white/25 hover:bg-white/50"
                    : "w-1.5 h-1.5 bg-slate-400/50 hover:bg-slate-600"
                }`}
              />
            ))}
          </div>

          <span
            className={`text-[11px] font-medium tracking-wide ${
              theme === "dark" ? "text-white/40" : "text-slate-500"
            }`}
          >
            Hover or hold to pause
          </span>
        </div>

        {/* Subtle Smooth Progress Bar at bottom */}
        <div
          className={`absolute bottom-0 left-0 right-0 h-1 sm:h-1.5 overflow-hidden ${
            theme === "dark" ? "bg-white/10" : "bg-black/10"
          }`}
        >
          <div
            className={`h-full transition-[width] duration-75 ease-linear ${
              theme === "dark"
                ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]"
                : "bg-gradient-to-r from-[#1b3f30] via-emerald-600 to-[#1b3f30]"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Ask a Question Modal */}
      {isAskModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setIsAskModalOpen(false)}
        >
          <div
            className={`w-full max-w-lg rounded-2xl p-6 sm:p-7 shadow-2xl border transition-all ${
              theme === "dark"
                ? "bg-slate-900 border-slate-800 text-white"
                : "bg-white border-slate-200 text-slate-900"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold">Ask a Question</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Submit your query to the StudyBuddy team.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAskModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Success message */}
            {submitSuccess && (
              <div className="mt-4 p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>
                  Thank you! Your question has been submitted to the admin team. It will appear on the FAQ section once answered.
                </span>
              </div>
            )}

            {/* Error message */}
            {submitError && (
              <div className="mt-4 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-sm flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{submitError}</span>
              </div>
            )}

            {/* Form */}
            {!submitSuccess && (
              <form onSubmit={handleQuestionSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Your Question <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={askQuestion}
                    onChange={(e) => setAskQuestion(e.target.value)}
                    placeholder="e.g. How do I sync assignments with Google Calendar?"
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Your Name <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={askName}
                      onChange={(e) => setAskName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Your Email <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="email"
                      value={askEmail}
                      onChange={(e) => setAskEmail(e.target.value)}
                      placeholder="e.g. rahul@example.com"
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAskModalOpen(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !askQuestion.trim()}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md shadow-indigo-500/25 transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Question</span>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FAQCarousel;
