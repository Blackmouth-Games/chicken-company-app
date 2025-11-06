import { ReactNode, useEffect } from "react";
import { useMetrics } from "@/hooks/useMetrics";
import { useLocation } from "react-router-dom";

interface MetricsProviderProps {
  children: ReactNode;
}

export const MetricsProvider = ({ children }: MetricsProviderProps) => {
  const { trackPageView } = useMetrics();
  const location = useLocation();

  // Track page views on route change
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname, trackPageView]);

  return <>{children}</>;
};
