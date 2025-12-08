import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { isTelegramWebApp, initTelegramWebApp } from "./lib/telegram";
import { AudioProvider } from "./contexts/AudioContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { MetricsProvider } from "./components/MetricsProvider";
import { useReferral } from "./hooks/useReferral";
import { OrientationLock } from "./components/OrientationLock";
import { SplashScreen } from "./components/SplashScreen";
import { LoadingScreen } from "./components/LoadingScreen";
import ComingSoon from "./pages/ComingSoon";
import Home from "./pages/Home";
import Wallet from "./pages/Wallet";
import Friends from "./pages/Friends";
import Store from "./pages/Store";
import AdminSkins from "./pages/AdminSkins";
import AdminLogin from "./pages/AdminLogin";
import { AdminStore } from "./pages/AdminStore";
import { AdminDashboard } from "./pages/AdminDashboard";
import { AdminBuildingPrices } from "./pages/AdminBuildingPrices";
import { AdminUsers } from "./pages/AdminUsers";
import { AdminSales } from "./pages/AdminSales";
import { AdminFlappyChickenMetrics } from "./pages/AdminFlappyChickenMetrics";
import NotFound from "./pages/NotFound";
import TelegramLayout from "./components/TelegramLayout";
import DebugOverlay from "./components/DebugOverlay";
import { ErrorBoundary } from "./components/ErrorBoundary";
const queryClient = new QueryClient();
const manifestUrl = import.meta.env.VITE_TONCONNECT_MANIFEST_URL || "/tonconnect-manifest.json";

// Lazy TonConnect provider to avoid blocking render if SDK fails
const TonProvider = ({ children }: { children: any }) => {
  const [Provider, setProvider] = useState<any>(null);
  useEffect(() => {
    import("@tonconnect/ui-react")
      .then((mod) => setProvider(() => mod.TonConnectUIProvider))
      .catch((err) => {
        console.error("[TonProvider] Failed to load TonConnectUIProvider", err);
        setProvider(() => (({ children }: any) => <>{children}</>));
      });
  }, []);
  if (!Provider) return <>{children}</>;
  return <Provider manifestUrl={manifestUrl}>{children}</Provider>;
};

const AppRoutes = () => {
  const [isFromTelegram, setIsFromTelegram] = useState<boolean | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  
  // Initialize referral tracking
  useReferral();

  useEffect(() => {
    initTelegramWebApp();
    const telegramStatus: boolean = isTelegramWebApp();
    const params = new URLSearchParams(window.location.search);
    const forceWeb = params.get('debug') === '1' || params.get('forceWeb') === '1';
    const forced = forceWeb ? true : telegramStatus;
    console.log("[AppRoutes] init", { telegramStatus, forced, forceWeb, manifestUrl });
    setIsFromTelegram(forced);
  }, []);

  // Check if current path is an admin route
  const isAdminRoute = window.location.pathname.startsWith('/admin');

  // Show splash screen first (skip for admin routes)
  if (showSplash && isFromTelegram !== false && !isAdminRoute) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  // Show loading while checking Telegram status (skip for admin routes)
  if (isFromTelegram === null && !isAdminRoute) {
    return <LoadingScreen message="Loading" />;
  }

  // Allow admin routes from web without Telegram requirement
  if (isAdminRoute) {
    return (
      <MetricsProvider>
        <ErrorBoundary>
          <Routes>
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/building-prices" element={<AdminBuildingPrices />} />
            <Route path="/admin/skins" element={<AdminSkins />} />
            <Route path="/admin/store" element={<AdminStore />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/sales" element={<AdminSales />} />
            <Route path="/admin/flappy-chicken-metrics" element={<AdminFlappyChickenMetrics />} />
            <Route path="*" element={<Navigate to="/admin/login" replace />} />
          </Routes>
        </ErrorBoundary>
      </MetricsProvider>
    );
  }

  // If not from Telegram and not admin route, show Coming Soon page
  if (!isFromTelegram) {
    return <ComingSoon />;
  }

  // If from Telegram, show app with navigation
  return (
    <MetricsProvider>
      <ErrorBoundary>
        <TelegramLayout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/store" element={<Store />} />
            <Route path="/friends" element={<Friends />} />
            <Route path="/admin/skins" element={<AdminSkins />} />
            <Route path="/admin/store" element={<AdminStore />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TelegramLayout>
      </ErrorBoundary>
    </MetricsProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TonProvider>
      <LanguageProvider>
        <AudioProvider>
          <TooltipProvider>
            <OrientationLock />
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
            {/* Debug overlay toggled by ?debug=1 */}
            <DebugOverlay manifestUrl={manifestUrl} />
          </TooltipProvider>
        </AudioProvider>
      </LanguageProvider>
    </TonProvider>
  </QueryClientProvider>
);

export default App;
