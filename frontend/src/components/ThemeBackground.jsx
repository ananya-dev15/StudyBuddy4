import React from "react";
import heroBgVideo from "../assets/fourth.mp4";
import { useAppContext } from "../context/AppContext";

export default function ThemeBackground() {
  const { theme } = useAppContext();

  return (
    <>
      {/* Static Animated Wallpaper (Fixed in both themes so all elements slide over it) */}
      <div className="fixed inset-0 w-full h-full -z-20 pointer-events-none overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover scale-105"
        >
          <source src={heroBgVideo} type="video/mp4" />
        </video>

        {/* Theme-dependent overlay layer */}
        <div
          className={`absolute inset-0 transition-colors duration-500 pointer-events-none ${
            theme === "dark"
              ? "bg-slate-950/65"
              : "bg-slate-950/25 backdrop-contrast-105"
          }`}
        />
      </div>

      {/* Glittery Particle Background */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        {Array.from({ length: 45 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-pulse bg-white/60"
            style={{
              width: `${(i % 3) + 2}px`,
              height: `${(i % 3) + 2}px`,
              top: `${(i * 19) % 100}%`,
              left: `${(i * 27) % 100}%`,
              animationDuration: `${(i % 4) + 3}s`,
            }}
          />
        ))}
      </div>
    </>
  );
}
