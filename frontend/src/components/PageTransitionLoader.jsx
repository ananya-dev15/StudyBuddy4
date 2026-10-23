import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import loadingVideo from "../assets/loading (2).mp4";

/**
 * Full-screen page transition loader using `loading (2).mp4`
 * Displays a clean #FFFFFF white overlay with the centered animated loading video
 * for ~2 seconds during navigation between internal pages and on initial load/refresh.
 */
export default function PageTransitionLoader() {
  const location = useLocation();
  const videoRef = useRef(null);

  // Initial mount starts hidden so on link open, intro animation plays without loading icon
  const [isVisible, setIsVisible] = useState(false);
  const [isFading, setIsFading] = useState(false);

  const currentPathRef = useRef(location.pathname);
  const timerRef = useRef(null);
  const fadeTimerRef = useRef(null);

  const startTransition = () => {
    // Clear any existing active timers
    if (timerRef.current) clearTimeout(timerRef.current);
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);

    setIsVisible(true);
    setIsFading(false);

    // Reset video to beginning and ensure it plays
    if (videoRef.current) {
      try {
        videoRef.current.currentTime = 0;
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn("Loader video autoplay prevented:", err);
          });
        }
      } catch (err) {
        console.warn("Loader video error:", err);
      }
    }

    // Exact 1-second total duration: 800ms solid video playback + 200ms smooth fade-out = exactly 1000ms (1 second)
    timerRef.current = setTimeout(() => {
      setIsFading(true);
      fadeTimerRef.current = setTimeout(() => {
        setIsVisible(false);
        setIsFading(false);
        if (videoRef.current) {
          try {
            videoRef.current.pause();
          } catch (e) {
            // ignore
          }
        }
      }, 200); // 200ms smooth fade-out completing exactly at 1000ms (1 second)
    }, 800);
  };

  // Navigation trigger on route change
  // Suppressed for /intro (login intro) and navigating from /intro as requested
  useEffect(() => {
    if (currentPathRef.current !== location.pathname) {
      const prevPath = currentPathRef.current;
      currentPathRef.current = location.pathname;

      // Skip loader on login intro and when transitioning from intro to destination
      if (location.pathname === "/intro" || prevPath === "/intro") {
        return;
      }

      startTransition();
    }
  }, [location.pathname]);

  return (
    <div
      id="studybuddy-page-transition-loader"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 9999999,
        backgroundColor: "#FFFFFF",
        display: isVisible ? "flex" : "none",
        alignItems: "center",
        justifyContent: "center",
        opacity: isFading ? 0 : 1,
        transition: "opacity 200ms ease-out",
        willChange: "opacity",
        pointerEvents: isVisible && !isFading ? "all" : "none",
        userSelect: "none",
        cursor: isFading ? "default" : "wait",
      }}
      aria-hidden={!isVisible}
      aria-label="Loading page..."
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          maxWidth: "100vw",
          maxHeight: "100vh",
          backgroundColor: "#FFFFFF",
          overflow: "hidden",
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          preload="auto"
          loop
          disablePictureInPicture
          disableRemotePlayback
          controls={false}
          controlsList="nodownload nofullscreen noremoteplayback noplaybackrate"
          onTimeUpdate={(e) => {
            // Screen recording artifact toolbar appears at ~13.7s; loop back cleanly at 13.0s
            if (e.target.currentTime >= 13.0) {
              e.target.currentTime = 0;
            }
          }}
          style={{
            width: "min(75vw, 320px)",
            maxHeight: "65vh",
            aspectRatio: "862 / 1056",
            objectFit: "contain",
            backgroundColor: "transparent",
            mixBlendMode: "multiply",
            filter: "contrast(104%) brightness(103%)",
            WebkitFilter: "contrast(104%) brightness(103%)",
            clipPath: "inset(8px)",
            WebkitClipPath: "inset(8px)",
            border: "none",
            outline: "none",
            boxShadow: "none",
            display: "block",
            margin: "auto",
            pointerEvents: "none",
          }}
        >
          <source src={loadingVideo} type="video/mp4" />
          <source src="/loading (2).mp4" type="video/mp4" />
          <source src="/loading.mp4" type="video/mp4" />
        </video>
      </div>
    </div>
  );
}
