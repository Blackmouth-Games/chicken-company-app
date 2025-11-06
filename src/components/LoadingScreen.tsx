import { useEffect, useState } from "react";
import logoChicken from "@/assets/logo-chicken-company.png";

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen = ({ message = "Loading" }: LoadingScreenProps) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    return () => clearInterval(interval);
  }, []);

  // Generate random eggs positions
  const eggs = Array.from({ length: 6 }, (_, i) => ({
    id: i,
    left: Math.random() * 80 + 10,
    delay: Math.random() * 2,
    duration: 3 + Math.random() * 2,
  }));

  return (
    <div className="fixed inset-0 z-40 bg-background flex flex-col items-center justify-between p-6 overflow-hidden">
      {/* Header */}
      <div className="w-full text-center pt-4">
        <h1 className="text-2xl font-bold text-foreground">{message}</h1>
      </div>

      {/* Falling Eggs */}
      {eggs.map((egg) => (
        <div
          key={egg.id}
          className="absolute animate-fall"
          style={{
            left: `${egg.left}%`,
            animationDelay: `${egg.delay}s`,
            animationDuration: `${egg.duration}s`,
            top: "-60px",
          }}
        >
          <div
            className={`w-10 h-12 rounded-full ${
              egg.id % 2 === 0 ? "bg-amber-200" : "bg-white"
            } border-2 border-foreground/20`}
            style={{
              borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
            }}
          />
        </div>
      ))}

      {/* Center Content - Chicken and Logo */}
      <div className="flex-1 flex items-center justify-center relative">
        <div className="text-center space-y-8">
          {/* Speech Bubble */}
          <div className="relative bg-white border-2 border-foreground rounded-full px-8 py-4 mx-auto max-w-xs">
            <p className="text-xl font-bold text-foreground">Logo cocks</p>
            <div className="absolute bottom-0 left-1/4 transform translate-y-full">
              <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[20px] border-t-white" />
              <div className="w-0 h-0 border-l-[17px] border-l-transparent border-r-[17px] border-r-transparent border-t-[22px] border-t-foreground absolute -top-[22px] -left-[2px]" />
            </div>
          </div>

          {/* Chicken Logo */}
          <div className="relative animate-bounce">
            <img
              src={logoChicken}
              alt="Chicken"
              className="w-40 h-40 object-contain mx-auto drop-shadow-lg"
            />
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-md mb-8">
        <div className="h-8 bg-white border-2 border-foreground rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-300 transition-all duration-300 ease-out"
            style={{
              width: `${progress}%`,
              backgroundSize: "200% 100%",
              animation: "shimmer 2s infinite",
            }}
          >
            <div className="h-full w-full flex items-center justify-evenly">
              {[...Array(Math.floor(progress / 10))].map((_, i) => (
                <div key={i} className="w-1 h-4 bg-yellow-500 rounded" />
              ))}
            </div>
          </div>
        </div>
        <p className="text-center mt-2 text-sm text-muted-foreground">
          {progress}%
        </p>
      </div>

      <style>{`
        @keyframes fall {
          0% {
            transform: translateY(0) rotate(0deg);
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
          }
        }
        
        @keyframes shimmer {
          0% {
            background-position: 200% center;
          }
          100% {
            background-position: -200% center;
          }
        }
        
        .animate-fall {
          animation: fall linear infinite;
        }
      `}</style>
    </div>
  );
};
