import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getTelegramUser, getTelegramStartParam } from "@/lib/telegram";

export const useReferral = () => {
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const processReferral = async () => {
      try {
        const telegramUser = getTelegramUser();
        if (!telegramUser?.id) return;

        // Get start parameter (referral code or source)
        const startParam = getTelegramStartParam();
        
        // Check if user profile exists
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("telegram_id", telegramUser.id)
          .maybeSingle();

        // If profile exists, check source (will work once types are regenerated)
        if (existingProfile) {
          return;
        }

        // Determine source/referral
        let source = "direct";
        let referredById: string | null = null;

        if (startParam) {
          // Check if it's a referral code (starts with 'ref_')
          if (startParam.startsWith("ref_")) {
            const referralCode = startParam;
            
            // Find the referrer by their referral code
            const { data: referrer } = await supabase
              .from("profiles")
              .select("id")
              .eq("referral_code", referralCode)
              .maybeSingle();

            if (referrer) {
              referredById = referrer.id;
              source = "referral";
            } else {
              // Referral code not found, treat as UTM or custom source
              source = startParam;
            }
          } else {
            // Any other start param is a source/UTM
            source = startParam;
          }
        }

        // Create or update profile with source using RPC
        const { data: profile, error: profileError } = await supabase.rpc(
          "create_or_update_profile" as any,
          {
            p_telegram_id: telegramUser.id,
            p_username: telegramUser.username || null,
            p_first_name: telegramUser.first_name,
            p_last_name: telegramUser.last_name || null,
            p_source: source,
          }
        );

        if (profileError) {
          console.error("Error creating/updating profile:", profileError);
          return;
        }

        // If this was a referral, create the referral record
        if (referredById && profile) {
          const { error: referralError } = await supabase
            .from("referrals")
            .insert({
              referrer_id: referredById,
              referred_id: profile as string,
            } as any);

          if (referralError) {
            console.error("Error creating referral record:", referralError);
          }
        }
      } catch (error) {
        console.error("Error processing referral:", error);
      }
    };

    processReferral();
  }, []);

  const getUserReferralCode = async (): Promise<string | null> => {
    try {
      const telegramUser = getTelegramUser();
      if (!telegramUser?.id) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("telegram_id", telegramUser.id)
        .maybeSingle();

      return profile?.referral_code || null;
    } catch (error) {
      console.error("Error getting referral code:", error);
      return null;
    }
  };

  const getReferralStats = async () => {
    try {
      const telegramUser = getTelegramUser();
      if (!telegramUser?.id) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("telegram_id", telegramUser.id)
        .maybeSingle();

      if (!profile) return null;

      const { data, error } = await supabase.rpc("get_referral_stats" as any, {
        p_user_id: profile.id,
      });

      if (error) {
        console.error("Error getting referral stats:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error getting referral stats:", error);
      return null;
    }
  };

  return {
    getUserReferralCode,
    getReferralStats,
  };
};
