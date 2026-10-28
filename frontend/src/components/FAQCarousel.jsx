import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";

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
  // Combine into structured slides: Slide 1 = Introduction, Slide 2..N = FAQs
  const slides = useMemo(() => {
    return [
      {
        ...intro,
        isIntro: true,
      },
      ...faqs.map((faq, idx) => ({
        isIntro: false,
        faqIndex: idx + 1,
        title: faq.q,
        subtitle: faq.a,
        ...faq,
      })),
    ];
  }, [intro, faqs]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideStage, setSlideStage] = useState("active"); // "entering" | "active" | "exiting"
  const [direction, setDirection] = useState("next"); // "next" | "prev"
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [progress, setProgress] = useState(0);

  const isPaused = isHovered || isPressed;
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

  // Direct dot click navigation
  const handleDotClick = useCallback(
    (index) => {
      if (index === currentIndex || isTransitioningRef.current) return;
      elapsedRef.current = 0;
      setProgress(0);
      const dir = index > currentIndex ? "next" : "prev";
      triggerTransition(dir, index);
    },
    [currentIndex, triggerTransition]
  );

  // Main animation timer loop via requestAnimationFrame
  useEffect(() => {
    lastTimeRef.current = performance.now();

    const tick = (now) => {
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      if (!isPausedRef.current && !isTransitioningRef.current) {
        elapsedRef.current += delta;
        const pct = Math.min(100, (elapsedRef.current / SLIDE_DURATION) * 100);
        setProgress(pct);

        if (elapsedRef.current >= SLIDE_DURATION) {
          elapsedRef.current = 0;
          setProgress(0);
          triggerTransition("next");
          return;
        }
      }

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [triggerTransition, currentIndex]);

  // Global window listeners for mouseup and touchend to ensure release always resumes
  useEffect(() => {
    const handleGlobalRelease = () => {
      setIsPressed(false);
    };
    window.addEventListener("mouseup", handleGlobalRelease);
    window.addEventListener("touchend", handleGlobalRelease);
    window.addEventListener("touchcancel", handleGlobalRelease);

    return () => {
      window.removeEventListener("mouseup", handleGlobalRelease);
      window.removeEventListener("touchend", handleGlobalRelease);
      window.removeEventListener("touchcancel", handleGlobalRelease);
    };
  }, []);

  const currentSlide = slides[currentIndex] || slides[0];

  // Helper classes for animation stages
  const getQuestionAnimClass = () => {
    if (prefersReducedMotion) {
      if (slideStage === "exiting") return "opacity-0 transition-opacity duration-200";
      if (slideStage === "entering") return "opacity-0";
      return "opacity-100 transition-opacity duration-300";
    }

    if (slideStage === "exiting") {
      return direction === "next"
        ? "opacity-0 -translate-x-8 scale-[0.98] transition-all duration-200 ease-in"
        : "opacity-0 translate-x-8 scale-[0.98] transition-all duration-200 ease-in";
    }
    if (slideStage === "entering") {
      return direction === "next"
        ? "opacity-0 translate-x-10 scale-[0.98]"
        : "opacity-0 -translate-x-10 scale-[0.98]";
    }
    // "active"
    return "opacity-100 translate-x-0 scale-100 transition-all duration-400 ease-out";
  };

  const getAnswerAnimClass = () => {
    if (prefersReducedMotion) {
      if (slideStage === "exiting") return "opacity-0 transition-opacity duration-200";
      if (slideStage === "entering") return "opacity-0";
      return "opacity-100 transition-opacity duration-300";
    }

    if (slideStage === "exiting") {
      return direction === "next"
        ? "opacity-0 -translate-x-6 transition-all duration-200 ease-in"
        : "opacity-0 translate-x-6 transition-all duration-200 ease-in";
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
    >
      <div
        className={`relative rounded-3xl p-6 sm:p-8 backdrop-blur-2xl transition-all duration-300 border overflow-hidden select-none ${
          theme === "dark"
            ? "bg-gradient-to-b from-slate-900/75 to-slate-950/85 hover:from-slate-800/85 hover:to-slate-900/90 border-white/15 hover:border-purple-500/40 shadow-xl hover:shadow-[0_8px_25px_rgba(168,85,247,0.15)] text-white"
            : "bg-gradient-to-b from-white/70 via-white/55 to-white/65 hover:from-white/85 hover:via-white/70 hover:to-white/80 border-white/70 hover:border-white shadow-[0_8px_25px_rgba(0,0,0,0.08),inset_0_1px_1px_rgba(255,255,255,0.95)] hover:shadow-[0_14px_35px_rgba(31,38,135,0.15)] text-slate-800"
        }`}
      >
        {/* Top bar with slide index & pause badge */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                theme === "dark"
                  ? currentSlide.isIntro
                    ? "bg-purple-500/15 border-purple-400/30 text-purple-200"
                    : "bg-white/5 border-white/10 text-purple-300"
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

          {/* Navigation Controls (Arrows) */}
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
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
    </div>
  );
};

export default FAQCarousel;
