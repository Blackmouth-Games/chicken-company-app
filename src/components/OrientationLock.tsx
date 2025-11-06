import { useEffect, useState } from "react";

export const OrientationLock = () => {
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      // Check if the device is in landscape mode
      const landscape = window.matchMedia("(orientation: landscape)").matches;
      const isMobile = window.innerWidth < 768;
      
      setIsLandscape(landscape && isMobile);
    };

    // Check on mount
    checkOrientation();

    // Listen for orientation changes
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);

    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, []);

  if (!isLandscape) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center p-8">
      <div className="text-center text-white space-y-6">
        <div className="text-6xl">📱</div>
        <div className="text-2xl font-bold">Por favor, gira tu dispositivo</div>
        <div className="text-lg opacity-80">
          Esta aplicación solo funciona en modo vertical
        </div>
        <div className="animate-bounce text-4xl mt-8">↻</div>
      </div>
    </div>
  );
};
