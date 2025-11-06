import { useEffect, useState } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [videoEnded, setVideoEnded] = useState(false);

  useEffect(() => {
    // Fallback in case video doesn't load or play
    const timeout = setTimeout(() => {
      onComplete();
    }, 5000); // 5 seconds max

    return () => clearTimeout(timeout);
  }, [onComplete]);

  const handleVideoEnd = () => {
    setVideoEnded(true);
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
      <video
        autoPlay
        muted
        playsInline
        onEnded={handleVideoEnd}
        className="w-full h-full object-cover"
      >
        <source src="/splash-video.mp4" type="video/mp4" />
      </video>
    </div>
  );
};
