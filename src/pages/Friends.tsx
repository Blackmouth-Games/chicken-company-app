import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Users, Share2, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getTelegramUser } from "@/lib/telegram";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface ReferralInfo {
  id: string;
  telegram_first_name: string;
  telegram_username: string | null;
  has_chicken: boolean;
  created_at: string;
}

const Friends = () => {
  const telegramUser = getTelegramUser();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [userId, setUserId] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState<string>("");
  const [referrals, setReferrals] = useState<ReferralInfo[]>([]);
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [qualifiedReferrals, setQualifiedReferrals] = useState(0);
  const [rewardsEarned, setRewardsEarned] = useState(0);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    if (!telegramUser?.id) return;

    try {
      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, referral_code")
        .eq("telegram_id", telegramUser.id)
        .single();

      if (!profile) return;

      setUserId(profile.id);
      setReferralCode(profile.referral_code || "");

      // Get referrals with their building info
      const { data: referralData } = await supabase
        .from("referrals")
        .select(`
          id,
          referred_id,
          created_at,
          reward_claimed
        `)
        .eq("referrer_id", profile.id);

      if (referralData && referralData.length > 0) {
        // Get referred users profiles
        const referredIds = referralData.map(r => r.referred_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, telegram_first_name, telegram_username")
          .in("id", referredIds);

        // Check if each user has chickens (coop with current_chickens > 0)
        const { data: buildings } = await supabase
          .from("user_buildings")
          .select("user_id, building_type, current_chickens")
          .in("user_id", referredIds)
          .eq("building_type", "coop");

        const referralsList: ReferralInfo[] = referralData.map(ref => {
          const userProfile = profiles?.find(p => p.id === ref.referred_id);
          // User has chicken if they have at least one coop with current_chickens > 0
          const hasChicken = buildings?.some(b => 
            b.user_id === ref.referred_id && b.current_chickens > 0
          ) || false;

          return {
            id: ref.id,
            telegram_first_name: userProfile?.telegram_first_name || "Usuario",
            telegram_username: userProfile?.telegram_username || null,
            has_chicken: hasChicken,
            created_at: ref.created_at,
          };
        });

        setReferrals(referralsList);
        setTotalReferrals(referralsList.length);
        
        const qualified = referralsList.filter(r => r.has_chicken).length;
        setQualifiedReferrals(qualified);
        
        // Calculate rewards: incremental system
        // Coop 1: 1 amigo con gallina
        // Coop 2: 3 amigos totales (1 + 2 nuevos)
        // Coop 3: 5 amigos totales (3 + 2 nuevos)
        // Coop N: (2*N - 1) amigos totales
        // Formula: coop N requires 2*N - 1 friends
        let coopsEarned = 0;
        for (let coopNumber = 1; coopNumber <= 100; coopNumber++) { // Max 100 coops
          const requiredFriends = 2 * coopNumber - 1;
          if (qualified >= requiredFriends) {
            coopsEarned = coopNumber;
          } else {
            break;
          }
        }
        setRewardsEarned(coopsEarned);

        // Auto-grant coops if eligible
        if (coopsEarned > 0) {
          await grantReferralCoops(profile.id, coopsEarned, qualified);
        }
      }
    } catch (error) {
      console.error("Error loading referral data:", error);
    }
  };

  const grantReferralCoops = async (userId: string, coopsToGrant: number, qualifiedCount: number) => {
    try {
      // Check how many referral coops user already has
      const { data: existingCoops } = await supabase
        .from("user_buildings")
        .select("id")
        .eq("user_id", userId)
        .eq("building_type", "coop")
        .gte("position_index", 1000); // Use position_index >= 1000 to mark referral coops

      const existingCount = existingCoops?.length || 0;
      const coopsNeeded = coopsToGrant - existingCount;

      if (coopsNeeded > 0) {
        // Get next available positions
        const { data: allBuildings } = await supabase
          .from("user_buildings")
          .select("position_index")
          .eq("user_id", userId)
          .order("position_index", { ascending: false })
          .limit(1);

        let nextPosition = allBuildings && allBuildings.length > 0 
          ? Math.max(allBuildings[0].position_index + 1, 1000) 
          : 1000;

        // Create new coops
        const newCoops = Array.from({ length: coopsNeeded }, (_, i) => ({
          user_id: userId,
          building_type: "coop" as const,
          level: 1,
          capacity: 50,
          current_chickens: 0,
          position_index: nextPosition + i,
        }));

        await supabase.from("user_buildings").insert(newCoops);

        // Record metric: feature usage (referral reward earned)
        if (userId) {
          await supabase.rpc("record_metric_event", {
            p_user_id: userId,
            p_event_type: "feature_usage",
            p_event_value: coopsNeeded,
            p_metadata: {
              feature: "referral_reward_earned",
              coops_granted: coopsNeeded,
              qualified_friends: qualifiedCount,
              total_referrals: qualifiedCount,
            },
          });
        }

        toast({
          title: t("friends.rewardUnlocked"),
          description: t("friends.rewardUnlockedDesc", { 
            count: coopsNeeded, 
            plural: coopsNeeded > 1 ? 'es' : '' 
          }),
        });
      }
    } catch (error) {
      console.error("Error granting referral coops:", error);
    }
  };

  const referralLink = referralCode 
    ? `https://t.me/ChickenCompany_bot?start=${referralCode}`
    : "";

  const handleShare = async () => {
    if (!referralLink) {
      toast({
        title: t("friends.shareError"),
        description: t("friends.shareErrorDesc"),
        variant: "destructive",
      });
      return;
    }

    // Record metric: button click (referral link shared)
    if (userId) {
      await supabase.rpc("record_metric_event", {
        p_user_id: userId,
        p_event_type: "button_click",
        p_event_value: null,
        p_metadata: {
          button: "share_referral_link",
          referral_code: referralCode,
          total_referrals: totalReferrals,
          qualified_referrals: qualifiedReferrals,
        },
      });
    }

    // Check if we're in Telegram WebApp
    if (window.Telegram?.WebApp) {
      // Use Telegram's share URL scheme to open the share dialog
      // tg://msg_url?url=<encoded_url>&text=<encoded_text>
      const shareText = encodeURIComponent(t("friends.shareText"));
      const shareUrl = encodeURIComponent(referralLink);
      const telegramShareUrl = `tg://msg_url?url=${shareUrl}&text=${shareText}`;
      
      // Try to open Telegram share dialog using openLink or openTelegramLink
      if (window.Telegram.WebApp.openLink) {
        window.Telegram.WebApp.openLink(telegramShareUrl);
      } else if (window.Telegram.WebApp.openTelegramLink) {
        window.Telegram.WebApp.openTelegramLink(telegramShareUrl);
      } else {
        // Fallback: try to open the link directly
        window.open(telegramShareUrl, '_blank');
      }
    } else if (navigator.share) {
      // Fallback to Web Share API
      navigator.share({
        title: 'Join Chicken Company',
        text: t("friends.shareText"),
        url: referralLink
      }).catch((error) => {
        console.error('Error sharing:', error);
        // Fallback to clipboard
        navigator.clipboard.writeText(referralLink);
        toast({
          title: t("friends.linkCopied"),
          description: t("friends.linkCopiedDesc"),
        });
      });
    } else {
      // Final fallback: copy to clipboard
      navigator.clipboard.writeText(referralLink);
      toast({
        title: t("friends.linkCopied"),
        description: t("friends.linkCopiedDesc"),
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">{t("friends.title")}</h1>
          <p className="text-muted-foreground">
            {t("friends.subtitle")}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5" />
              {t("friends.referralRewards")}
            </CardTitle>
            <CardDescription>
              {t("friends.referralRewardsDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-4">
              <p className="text-sm font-semibold text-green-700 text-center mb-1">
                {t("friends.specialReward")}
              </p>
              <p className="text-xs text-center text-muted-foreground">
                {t("friends.incrementalSystem")}
              </p>
              
              {/* Progress bar to next coop */}
              <div className="mt-3">
                {(() => {
                  const nextCoopNumber = rewardsEarned + 1;
                  const requiredForNext = 2 * nextCoopNumber - 1;
                  const currentProgress = qualifiedReferrals;
                  const progressPercent = Math.min((currentProgress / requiredForNext) * 100, 100);
                  const remaining = Math.max(0, requiredForNext - currentProgress);
                  
                  return (
                    <>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{t("friends.progressToNextCoop")}</span>
                        <span className="font-semibold text-green-700">{currentProgress}/{requiredForNext}</span>
                      </div>
                      <Progress value={progressPercent} className="h-2" />
                      <p className="text-xs text-center text-muted-foreground mt-1">
                        {t("friends.remainingFriends", { 
                          count: remaining, 
                          plural: remaining !== 1 ? 's' : '' 
                        })}
                      </p>
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-primary/10 rounded-lg">
                <p className="text-xl font-bold text-primary">{totalReferrals}</p>
                <p className="text-xs text-muted-foreground">{t("friends.invited")}</p>
              </div>
              <div className="text-center p-3 bg-green-500/10 rounded-lg">
                <p className="text-xl font-bold text-green-600">{qualifiedReferrals}</p>
                <p className="text-xs text-muted-foreground">{t("friends.withChicken")}</p>
              </div>
              <div className="text-center p-3 bg-amber-500/10 rounded-lg">
                <p className="text-xl font-bold text-amber-600">{rewardsEarned}</p>
                <p className="text-xs text-muted-foreground">{t("friends.coops")}</p>
              </div>
            </div>

            <Button 
              className="w-full" 
              size="lg"
              onClick={handleShare}
              disabled={!referralLink}
            >
              <Share2 className="w-4 h-4 mr-2" />
              {t("friends.shareLink")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {t("friends.yourFriends")} ({referrals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {referrals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{t("friends.noFriendsYet")}</p>
                <p className="text-sm">{t("friends.shareLinkToStart")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {referrals.map((referral) => (
                  <div
                    key={referral.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {referral.telegram_first_name || t("friends.user")}
                          {referral.telegram_username && (
                            <span className="text-xs text-muted-foreground ml-1">
                              @{referral.telegram_username}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(referral.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {referral.has_chicken ? (
                      <div className="bg-green-500/20 text-green-700 text-xs px-2 py-1 rounded-full font-semibold">
                        {t("friends.withChickenBadge")}
                      </div>
                    ) : (
                      <div className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded-full">
                        {t("friends.withoutChickenBadge")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Friends;
