import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useRef } from "react";

export const useGameMetrics = (userId?: string) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionStartRef = useRef<Date | null>(null);
  const actionsCountRef = useRef<number>(0);

  // Initialize session tracking
  useEffect(() => {
    if (!userId) return;

    const initSession = async () => {
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
        sessionStartRef.current = new Date();
      } catch (error) {
        console.error("Error creating session:", error);
      }
    };

    initSession();

    // Cleanup on unmount
    return () => {
      endSession();
    };
  }, [userId]);

  const recordEvent = async (
    eventType: "building_purchased" | "building_upgraded" | "button_click" | "feature_usage" | "page_view",
    eventValue?: number,
    metadata?: Record<string, any>
  ) => {
    if (!userId) return;

    try {
      await supabase.from("metric_events").insert({
        user_id: userId,
        session_id: sessionId,
        event_type: eventType,
        event_value: eventValue,
        metadata,
      });

      actionsCountRef.current++;
    } catch (error) {
      console.error("Error recording metric event:", error);
    }
  };

  const endSession = async () => {
    if (!sessionId || !sessionStartRef.current) return;

    try {
      const duration = Math.floor(
        (new Date().getTime() - sessionStartRef.current.getTime()) / 1000
      );

      await supabase
        .from("user_sessions")
        .update({
          session_end: new Date().toISOString(),
          duration_seconds: duration,
          is_active: false,
          actions_count: actionsCountRef.current,
        })
        .eq("id", sessionId);
    } catch (error) {
      console.error("Error ending session:", error);
    }
  };

  // Specific tracking functions
  const trackBuildingPurchase = (buildingType: string, price: number) => {
    recordEvent("building_purchased", price, { building_type: buildingType });
  };

  const trackBuildingUpgrade = (
    buildingType: string,
    fromLevel: number,
    toLevel: number,
    price: number
  ) => {
    recordEvent("building_upgraded", price, {
      building_type: buildingType,
      from_level: fromLevel,
      to_level: toLevel,
    });
  };

  const trackSkinChange = (buildingType: string, skinKey: string) => {
    recordEvent("feature_usage", undefined, {
      feature: "skin_change",
      building_type: buildingType,
      skin_key: skinKey,
    });
  };

  const trackStoreProductView = (productKey: string) => {
    recordEvent("page_view", undefined, {
      page: "store_product",
      product_key: productKey,
    });
  };

  const trackDialogOpen = (dialogName: string) => {
    recordEvent("button_click", undefined, {
      action: "open_dialog",
      dialog_name: dialogName,
    });
  };

  return {
    sessionId,
    recordEvent,
    trackBuildingPurchase,
    trackBuildingUpgrade,
    trackSkinChange,
    trackStoreProductView,
    trackDialogOpen,
  };
};
