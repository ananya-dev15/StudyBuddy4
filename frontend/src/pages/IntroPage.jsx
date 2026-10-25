import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import IntroAnimation from "../components/IntroAnimation";

/**
 * Dedicated Intro Page route
 * Used after successful authentication to play the cinematic
 * opening animation before transitioning to the homepage.
 */
const IntroPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const destination = location.state?.destination || "/";

  // If user refreshed while on /intro, skip directly to destination
  React.useEffect(() => {
    try {
      const navEntries = performance.getEntriesByType("navigation");
      const isReload = (navEntries && navEntries[0]?.type === "reload") || (performance.navigation && performance.navigation.type === 1);
      if (isReload) {
        navigate(destination, { replace: true });
      }
    } catch (e) {}
  }, [destination, navigate]);

  const handleComplete = () => {
    try {
      sessionStorage.setItem("studybuddy_intro_played", "true");
    } catch (e) {}
    navigate(destination, { replace: true });
  };

  return (
    <IntroAnimation
      onComplete={handleComplete}
      destination={destination}
    />
  );
};

export default IntroPage;
