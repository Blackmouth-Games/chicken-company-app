import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays } from "date-fns";

export const useMetricsDashboard = (days: number = 30) => {
  const startDate = subDays(new Date(), days).toISOString().split('T')[0];
  const endDate = new Date().toISOString().split('T')[0];

  const { data: metricsData, isLoading, error } = useQuery({
    queryKey: ["metrics-summary", startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_metrics_summary", {
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) throw error;
      return data;
    },
  });

  const { data: dailyMetrics } = useQuery({
    queryKey: ["daily-metrics", days],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_metrics")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: metricEvents } = useQuery({
    queryKey: ["metric-events", days],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metric_events")
        .select("*")
        .gte("created_at", subDays(new Date(), days).toISOString())
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  // Get session duration from user_sessions table directly
  const { data: userSessions } = useQuery({
    queryKey: ["user-sessions", days],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_sessions")
        .select("duration_seconds, session_start")
        .gte("session_start", subDays(new Date(), days).toISOString())
        .not("duration_seconds", "is", null);

      if (error) throw error;
      return data;
    },
  });

  // Calculate aggregated stats
  const avgSessionDuration = userSessions && userSessions.length > 0
    ? userSessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / userSessions.length
    : 0;

  const stats = {
    totalNewGuests: dailyMetrics?.reduce((sum, m) => 
      m.metric_type === "new_guest_users" ? sum + (m.metric_value || 0) : sum, 0) || 0,
    totalNewUsers: dailyMetrics?.reduce((sum, m) => 
      m.metric_type === "new_registered_users" ? sum + (m.metric_value || 0) : sum, 0) || 0,
    avgSessionDuration,
    totalPageViews: dailyMetrics?.reduce((sum, m) => 
      m.metric_type === "page_view" ? sum + (m.metric_value || 0) : sum, 0) || 0,
    totalButtonClicks: dailyMetrics?.reduce((sum, m) => 
      m.metric_type === "button_click" ? sum + (m.metric_value || 0) : sum, 0) || 0,
  };

  return {
    metricsData,
    dailyMetrics,
    metricEvents,
    stats,
    isLoading,
    error,
  };
};
