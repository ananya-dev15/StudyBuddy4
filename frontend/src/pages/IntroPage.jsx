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

  const handleComplete = () => {
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
