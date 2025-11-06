import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { useEffect, useState } from "react";
import { isTelegramWebApp, initTelegramWebApp } from "./lib/telegram";
import { AudioProvider } from "./contexts/AudioContext";
import { MetricsProvider } from "./components/MetricsProvider";
import { useReferral } from "./hooks/useReferral";
import { OrientationLock } from "./components/OrientationLock";
import { SplashScreen } from "./components/SplashScreen";
import { LoadingScreen } from "./components/LoadingScreen";
import ComingSoon from "./pages/ComingSoon";
import Home from "./pages/Home";
import Wallet from "./pages/Wallet";
import Friends from "./pages/Friends";
import NotFound from "./pages/NotFound";
import TelegramLayout from "./components/TelegramLayout";

const queryClient = new QueryClient();
const manifestUrl = import.meta.env.VITE_TONCONNECT_MANIFEST_URL;

const AppRoutes = () => {
  const [isFromTelegram, setIsFromTelegram] = useState<boolean | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  
  // Initialize referral tracking
  useReferral();

  useEffect(() => {
    initTelegramWebApp();
    const telegramStatus: boolean = isTelegramWebApp();
    setIsFromTelegram(telegramStatus);
  }, []);

  // Show splash screen first
  if (showSplash && isFromTelegram !== false) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  // Show loading while checking Telegram status
  if (isFromTelegram === null) {
    return <LoadingScreen message="Loading" />;
  }

  // If not from Telegram, show Coming Soon page
  if (!isFromTelegram) {
    return <ComingSoon />;
  }

  // If from Telegram, show app with navigation
  return (
    <MetricsProvider>
      <TelegramLayout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/friends" element={<Friends />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TelegramLayout>
    </MetricsProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      <AudioProvider>
        <TooltipProvider>
          <OrientationLock />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </AudioProvider>
    </TonConnectUIProvider>
  </QueryClientProvider>
);

export default App;
