import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook para rastrear métricas de juego mobile
 * Incluye: sesiones, retención, engagement, monetización, eventos de gameplay
 */
export const useGameMetrics = (userId: string | null) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);

  // Iniciar sesión al montar
  useEffect(() => {
    if (userId) {
      startSession();
    }

    // Finalizar sesión al desmontar
    return () => {
      if (sessionId) {
        endSession();
      }
    };
  }, [userId]);

  // Tracking de tiempo de sesión
  useEffect(() => {
    if (!sessionStart || !sessionId) return;

    const interval = setInterval(() => {
      updateSessionDuration();
    }, 30000); // Actualizar cada 30 segundos

    return () => clearInterval(interval);
  }, [sessionStart, sessionId]);

  /**
   * Iniciar una nueva sesión de juego
   */
  const startSession = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("user_sessions")
        .insert({
          user_id: userId,
          session_start: new Date().toISOString(),
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      setSessionId(data.id);
      setSessionStart(new Date());

      // Registrar evento de sesión iniciada
      await supabase.rpc("record_metric_event", {
        p_user_id: userId,
        p_event_type: "session_started",
        p_session_id: data.id,
      });
    } catch (error) {
      console.error("Error starting session:", error);
    }
  };

  /**
   * Finalizar sesión actual
   */
  const endSession = async () => {
    if (!sessionId || !sessionStart || !userId) return;

    try {
      const duration = Math.floor((Date.now() - sessionStart.getTime()) / 1000);

      await supabase
        .from("user_sessions")
        .update({
          session_end: new Date().toISOString(),
          duration_seconds: duration,
          is_active: false,
        })
        .eq("id", sessionId);

      // Registrar evento de sesión finalizada
      await supabase.rpc("record_metric_event", {
        p_user_id: userId,
        p_event_type: "session_ended",
        p_event_value: duration,
        p_session_id: sessionId,
      });

      setSessionId(null);
      setSessionStart(null);
    } catch (error) {
      console.error("Error ending session:", error);
    }
  };

  /**
   * Actualizar duración de sesión activa
   */
  const updateSessionDuration = async () => {
    if (!sessionId || !sessionStart) return;

    try {
      const duration = Math.floor((Date.now() - sessionStart.getTime()) / 1000);

      await supabase
        .from("user_sessions")
        .update({
          duration_seconds: duration,
        })
        .eq("id", sessionId);
    } catch (error) {
      console.error("Error updating session duration:", error);
    }
  };

  /**
   * Registrar evento de gameplay
   */
  const trackEvent = useCallback(
    async (
      eventType: string,
      eventValue?: number,
      metadata?: Record<string, any>
    ) => {
      if (!userId) return;

      try {
        await supabase.rpc("record_metric_event", {
          p_user_id: userId,
          p_event_type: eventType,
          p_event_value: eventValue || null,
          p_metadata: metadata || null,
          p_session_id: sessionId,
        });
      } catch (error) {
        console.error("Error tracking event:", error);
      }
    },
    [userId, sessionId]
  );

  /**
   * Incrementar contador de vistas de página
   */
  const trackPageView = useCallback(
    async (page: string) => {
      if (!sessionId) return;

      try {
        await supabase
          .from("user_sessions")
          .update({
            page_views: supabase.rpc("increment", { by: 1 }),
          })
          .eq("id", sessionId);

        await trackEvent("page_view", 1, { page });
      } catch (error) {
        console.error("Error tracking page view:", error);
      }
    },
    [sessionId, trackEvent]
  );

  /**
   * Incrementar contador de acciones
   */
  const trackAction = useCallback(
    async (action: string, metadata?: Record<string, any>) => {
      if (!sessionId) return;

      try {
        await supabase.rpc("increment_session_actions", {
          p_session_id: sessionId,
        });

        await trackEvent("action", 1, { action, ...metadata });
      } catch (error) {
        console.error("Error tracking action:", error);
      }
    },
    [sessionId, trackEvent]
  );

  /**
   * Eventos específicos de juego
   */
  const trackBuildingPurchased = useCallback(
    (buildingType: string, level: number, price: number) => {
      trackEvent("building_purchased", price, { buildingType, level });
      trackAction("purchase_building", { buildingType, level });
    },
    [trackEvent, trackAction]
  );

  const trackBuildingUpgraded = useCallback(
    (buildingType: string, fromLevel: number, toLevel: number, price: number) => {
      trackEvent("building_upgraded", price, {
        buildingType,
        fromLevel,
        toLevel,
      });
      trackAction("upgrade_building", { buildingType, toLevel });
    },
    [trackEvent, trackAction]
  );

  const trackSkinChanged = useCallback(
    (buildingType: string, skinKey: string) => {
      trackEvent("skin_changed", 1, { buildingType, skinKey });
      trackAction("change_skin", { buildingType, skinKey });
    },
    [trackEvent, trackAction]
  );

  const trackStoreProductViewed = useCallback(
    (productKey: string, productName: string) => {
      trackEvent("product_viewed", 1, { productKey, productName });
    },
    [trackEvent]
  );

  const trackDialogOpened = useCallback(
    (dialogName: string) => {
      trackEvent("dialog_opened", 1, { dialogName });
    },
    [trackEvent]
  );

  return {
    sessionId,
    sessionStart,
    trackEvent,
    trackPageView,
    trackAction,
    trackBuildingPurchased,
    trackBuildingUpgraded,
    trackSkinChanged,
    trackStoreProductViewed,
    trackDialogOpened,
  };
};
