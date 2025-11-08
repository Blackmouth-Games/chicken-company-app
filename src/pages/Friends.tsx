import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Users, Share2, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getTelegramUser } from "@/lib/telegram";
import { useToast } from "@/hooks/use-toast";

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

        // Check if each user has a chicken (corral)
        const { data: buildings } = await supabase
          .from("user_buildings")
          .select("user_id, building_type")
          .in("user_id", referredIds)
          .eq("building_type", "corral");

        const referralsList: ReferralInfo[] = referralData.map(ref => {
          const userProfile = profiles?.find(p => p.id === ref.referred_id);
          const hasChicken = buildings?.some(b => b.user_id === ref.referred_id) || false;

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
        
        // Calculate rewards: 1 corral por cada 3 amigos con gallina
        const corralsEarned = Math.floor(qualified / 3);
        setRewardsEarned(corralsEarned);

        // Auto-grant corrals if eligible
        if (corralsEarned > 0) {
          await grantReferralCorrals(profile.id, corralsEarned, qualified);
        }
      }
    } catch (error) {
      console.error("Error loading referral data:", error);
    }
  };

  const grantReferralCorrals = async (userId: string, corralsToGrant: number, qualifiedCount: number) => {
    try {
      // Check how many referral corrals user already has
      const { data: existingCorrals } = await supabase
        .from("user_buildings")
        .select("id")
        .eq("user_id", userId)
        .eq("building_type", "corral")
        .gte("position_index", 1000); // Use position_index >= 1000 to mark referral corrals

      const existingCount = existingCorrals?.length || 0;
      const corralsNeeded = corralsToGrant - existingCount;

      if (corralsNeeded > 0) {
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

        // Create new corrals
        const newCorrals = Array.from({ length: corralsNeeded }, (_, i) => ({
          user_id: userId,
          building_type: "corral" as const,
          level: 1,
          capacity: 50,
          current_chickens: 0,
          position_index: nextPosition + i,
        }));

        await supabase.from("user_buildings").insert(newCorrals);

        toast({
          title: "🎉 ¡Recompensa desbloqueada!",
          description: `Has ganado ${corralsNeeded} corral${corralsNeeded > 1 ? 'es' : ''} por invitar amigos`,
        });
      }
    } catch (error) {
      console.error("Error granting referral corrals:", error);
    }
  };

  const referralLink = referralCode 
    ? `https://t.me/ChickenCompany_bot?start=${referralCode}`
    : "";

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join Chicken Company',
        text: 'Play with me and earn rewards!',
        url: referralLink
      });
    } else {
      navigator.clipboard.writeText(referralLink);
      // You could add a toast notification here
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Invite Friends</h1>
          <p className="text-muted-foreground">
            Earn rewards by inviting your friends
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5" />
              Referral Rewards
            </CardTitle>
            <CardDescription>
              Get bonuses when your friends join and play
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-4">
              <p className="text-sm font-semibold text-green-700 text-center mb-1">
                🎁 Recompensa Especial
              </p>
              <p className="text-xs text-center text-muted-foreground">
                Por cada 3 amigos con gallina = 1 corral gratis
              </p>
              
              {/* Progress bar to next corral */}
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Progreso al próximo corral</span>
                  <span className="font-semibold text-green-700">{qualifiedReferrals % 3}/3</span>
                </div>
                <Progress value={(qualifiedReferrals % 3) * 33.33} className="h-2" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-primary/10 rounded-lg">
                <p className="text-xl font-bold text-primary">{totalReferrals}</p>
                <p className="text-xs text-muted-foreground">Invitados</p>
              </div>
              <div className="text-center p-3 bg-green-500/10 rounded-lg">
                <p className="text-xl font-bold text-green-600">{qualifiedReferrals}</p>
                <p className="text-xs text-muted-foreground">Con gallina</p>
              </div>
              <div className="text-center p-3 bg-amber-500/10 rounded-lg">
                <p className="text-xl font-bold text-amber-600">{rewardsEarned}</p>
                <p className="text-xs text-muted-foreground">Corrales</p>
              </div>
            </div>

            <Button 
              className="w-full" 
              size="lg"
              onClick={handleShare}
              disabled={!referralLink}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Compartir enlace
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Tus Amigos ({referrals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {referrals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aún no has invitado amigos</p>
                <p className="text-sm">Comparte tu enlace para empezar</p>
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
                          {referral.telegram_first_name}
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
                        ✓ Con gallina
                      </div>
                    ) : (
                      <div className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded-full">
                        Sin gallina
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
