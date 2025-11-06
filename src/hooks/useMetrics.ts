import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getTelegramUser } from "@/lib/telegram";

export type MetricType = 
  | "new_guest_users"
  | "new_registered_users"
  | "session_duration"
  | "page_view"
  | "button_click"
  | "feature_usage";

interface MetricEventParams {
  eventType: MetricType;
  eventValue?: number;
  metadata?: Record<string, any>;
  sessionId?: string;
}

export const useMetrics = () => {
  const sessionIdRef = useRef<string | null>(null);
  const sessionStartRef = useRef<Date | null>(null);
  const userIdRef = useRef<string | null>(null);

  // Track session automatically
  useEffect(() => {
    const initSession = async () => {
      const telegramUser = getTelegramUser();
      
      if (telegramUser?.id) {
        // Try to get user profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("telegram_id", telegramUser.id)
          .maybeSingle();

        if (profile) {
          userIdRef.current = profile.id;
        }
      }

      // Create session
      const { data: session } = await supabase
        .from("user_sessions")
        .insert({
          user_id: userIdRef.current,
          session_start: new Date().toISOString(),
          is_active: true,
        })
        .select()
        .single();

      if (session) {
        sessionIdRef.current = session.id;
        sessionStartRef.current = new Date();
      }

      // Track new guest user if no profile
      if (!userIdRef.current) {
        await trackEvent({
          eventType: "new_guest_users",
          metadata: { telegram_id: telegramUser?.id },
        });
      }
    };

    initSession();

    // End session on unmount or page unload
    const endSession = async () => {
      if (sessionIdRef.current && sessionStartRef.current) {
        const duration = Math.floor(
          (new Date().getTime() - sessionStartRef.current.getTime()) / 1000
        );

        await supabase
          .from("user_sessions")
          .update({
            session_end: new Date().toISOString(),
            duration_seconds: duration,
            is_active: false,
          })
          .eq("id", sessionIdRef.current);

        // Track session duration metric
        await trackEvent({
          eventType: "session_duration",
          eventValue: duration,
          sessionId: sessionIdRef.current,
        });
      }
    };

    window.addEventListener("beforeunload", endSession);

    return () => {
      window.removeEventListener("beforeunload", endSession);
      endSession();
    };
  }, []);

  const trackEvent = useCallback(async ({
    eventType,
    eventValue,
    metadata,
    sessionId,
  }: MetricEventParams) => {
    try {
      await supabase.rpc("record_metric_event", {
        p_user_id: userIdRef.current,
        p_event_type: eventType,
        p_event_value: eventValue || null,
        p_metadata: metadata ? JSON.stringify(metadata) : null,
        p_session_id: sessionId || sessionIdRef.current,
      });
    } catch (error) {
      console.error("Error tracking metric:", error);
    }
  }, []);

  const trackPageView = useCallback(async (pagePath: string) => {
    await trackEvent({
      eventType: "page_view",
      metadata: { path: pagePath },
    });

    // Update session page_views count
    if (sessionIdRef.current) {
      const { data: session } = await supabase
        .from("user_sessions")
        .select("page_views")
        .eq("id", sessionIdRef.current)
        .single();

      if (session) {
        await supabase
          .from("user_sessions")
          .update({ page_views: (session.page_views || 0) + 1 })
          .eq("id", sessionIdRef.current);
      }
    }
  }, [trackEvent]);

  const trackButtonClick = useCallback(async (buttonName: string, metadata?: Record<string, any>) => {
    await trackEvent({
      eventType: "button_click",
      metadata: { button: buttonName, ...metadata },
    });

    // Update session actions_count
    if (sessionIdRef.current) {
      const { data: session } = await supabase
        .from("user_sessions")
        .select("actions_count")
        .eq("id", sessionIdRef.current)
        .single();

      if (session) {
        await supabase
          .from("user_sessions")
          .update({ actions_count: (session.actions_count || 0) + 1 })
          .eq("id", sessionIdRef.current);
      }
    }
  }, [trackEvent]);

  const trackFeatureUsage = useCallback(async (featureName: string, metadata?: Record<string, any>) => {
    await trackEvent({
      eventType: "feature_usage",
      metadata: { feature: featureName, ...metadata },
    });
  }, [trackEvent]);

  const trackNewUser = useCallback(async (userId: string) => {
    userIdRef.current = userId;
    await trackEvent({
      eventType: "new_registered_users",
      metadata: { user_id: userId },
    });
  }, [trackEvent]);

  return {
    trackEvent,
    trackPageView,
    trackButtonClick,
    trackFeatureUsage,
    trackNewUser,
    sessionId: sessionIdRef.current,
    userId: userIdRef.current,
  };
};
