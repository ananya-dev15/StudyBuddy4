import React, { useEffect, useRef, useState } from "react";
import introVideo from "../assets/studybuddy_intro.mp4";
import "./IntroAnimation.css";

/**
 * StudyBuddy Reusable Intro Animation Component
 * Plays the cinematic 3D claymation opening video (1280x720 H.264):
 * - Continuous cursive rainbow twisted rope forming "STUDYBUDDY"
 * - Cute green clay characters pulling, hauling, and celebrating
 * - Ceremonial silk ribbon cut with center bow & confetti burst
 * - 100% safe margins with zero ribbon or rope edge cropping
 * - Instant Skip button, safety timeout fallback, and reduced-motion support
 */
const IntroAnimation = ({
  onComplete,
  destination = "/",
}) => {
  const videoRef = useRef(null);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showUnmuteHint, setShowUnmuteHint] = useState(false);
  const completedRef = useRef(false);

  const handleFinish = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    setIsFadingOut(true);

    setTimeout(() => {
      if (onComplete) {
        onComplete(destination);
      }
    }, 550);
  };

  const toggleSound = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      const nextMuted = !videoRef.current.muted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
      setShowUnmuteHint(false);
    }
  };

  const handleOverlayClick = () => {
    if (videoRef.current && videoRef.current.muted) {
      videoRef.current.muted = false;
      setIsMuted(false);
      setShowUnmuteHint(false);
    }
  };

  useEffect(() => {
    // Check prefers-reduced-motion
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      const timer = setTimeout(() => handleFinish(), 500);
      return () => clearTimeout(timer);
    }

    // Safety timeout: 12 seconds max to ensure user is NEVER stuck
    const safetyTimer = setTimeout(() => {
      handleFinish();
    }, 12000);

    // Auto-play video with sound
    if (videoRef.current) {
      videoRef.current.muted = false;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("Unmuted autoplay restricted by browser policy, fallback to muted:", err);
          if (videoRef.current) {
            videoRef.current.muted = true;
            setIsMuted(true);
            setShowUnmuteHint(true);
            videoRef.current.play().catch((e) => {
              console.error("Playback error:", e);
            });
          }
        });
      }
    }

    return () => {
      clearTimeout(safetyTimer);
    };
  }, []);

  return (
    <div
      className={`studybuddy-intro-overlay ${isFadingOut ? "fade-out" : ""}`}
      id="studybuddy-cinematic-intro"
      role="dialog"
      aria-label="StudyBuddy Opening Animation"
      onClick={handleOverlayClick}
    >
      {/* 16:9 Responsive Video Viewport (Zero Cropping) */}
      <div className="studybuddy-intro-video-container">
        <video
          ref={videoRef}
          src={introVideo}
          className="studybuddy-intro-video"
          playsInline
          autoPlay
          onEnded={handleFinish}
          onError={(e) => {
            console.error("Intro video error:", e);
            handleFinish();
          }}
        />
      </div>

      {/* Soft Studio Vignette */}
      <div className="studybuddy-intro-vignette" />

      {/* Top Controls: Sound Toggle & Skip Button */}
      <div className="studybuddy-intro-controls">
        <button
          type="button"
          onClick={toggleSound}
          className={`studybuddy-intro-btn sound-btn ${showUnmuteHint ? "pulse-highlight" : ""}`}
          id="toggle-sound-btn"
          aria-label={isMuted ? "Unmute Audio" : "Mute Audio"}
        >
          <span>{isMuted ? "Unmute" : "Sound On"}</span>
          <span aria-hidden="true">{isMuted ? "🔇" : "🔊"}</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleFinish();
          }}
          className="studybuddy-intro-btn skip-btn"
          id="skip-intro-btn"
          aria-label="Skip Intro Animation"
        >
          <span>Skip</span>
          <span aria-hidden="true">⏭️</span>
        </button>
      </div>

      {/* Subtle Unmute Hint when browser blocks unmuted cold autoplay */}
      {showUnmuteHint && (
        <div className="studybuddy-intro-unmute-hint">
          <span>🔊 Tap anywhere for sound</span>
        </div>
      )}
    </div>
  );
};

export default IntroAnimation;
