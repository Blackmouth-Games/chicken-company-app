import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { useEffect, useState } from "react";
import { isTelegramWebApp, initTelegramWebApp } from "./lib/telegram";
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

  useEffect(() => {
    initTelegramWebApp();
    const telegramStatus: boolean = isTelegramWebApp();
    setIsFromTelegram(telegramStatus);
  }, []);

  // Show loading while checking Telegram status
  if (isFromTelegram === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-xl text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If not from Telegram, show Coming Soon page
  if (!isFromTelegram) {
    return <ComingSoon />;
  }

  // If from Telegram, show app with navigation
  return (
    <TelegramLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </TelegramLayout>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </TonConnectUIProvider>
  </QueryClientProvider>
);

export default App;
