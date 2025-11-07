import { useState, useEffect } from "react";
import bgFarm from "@/assets/bg-farm-grass.png";
import defaultAvatar from "@/assets/default-avatar.png";
import { getTelegramUser } from "@/lib/telegram";
import { Button } from "@/components/ui/button";
import { Settings, Info } from "lucide-react";
import { SettingsDialog } from "@/components/SettingsDialog";
import { TutorialDialog } from "@/components/TutorialDialog";
import { ProfileDialog } from "@/components/ProfileDialog";
import { BuildingSlot } from "@/components/BuildingSlot";
import { PurchaseBuildingDialog } from "@/components/PurchaseBuildingDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Home = () => {
  const telegramUser = getTelegramUser();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<number>(0);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  // Number of available slots
  const TOTAL_SLOTS = 6;

  useEffect(() => {
    loadUserProfile();
  }, [telegramUser]);

  const loadUserProfile = async () => {
    if (!telegramUser?.id) return;

    try {
      // Ensure profile exists or create it
      const { data: createdRows } = await supabase.rpc('create_or_update_profile', {
        p_telegram_id: telegramUser.id,
        p_telegram_first_name: telegramUser.first_name ?? null,
        p_telegram_last_name: telegramUser.last_name ?? null,
        p_telegram_username: telegramUser.username ?? null,
        p_source: 'telegram',
        p_referrer_code: null,
      });

      const created = Array.isArray(createdRows) ? createdRows[0] : undefined;

      if (created?.profile_id) {
        setUserId(created.profile_id);
        await loadBuildings(created.profile_id);
        return;
      }

      // Fallback: select by telegram id
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("telegram_id", telegramUser.id)
        .single();

      if (profile) {
        setUserId(profile.id);
        loadBuildings(profile.id);
      }
    } catch (error) {
      console.error("Error loading/creating profile:", error);
    }
  };

  const loadBuildings = async (profileId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_buildings")
        .select("*")
        .eq("user_id", profileId)
        .order("position_index");

      if (error) throw error;
      setBuildings(data || []);
    } catch (error) {
      console.error("Error loading buildings:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los edificios",
        variant: "destructive",
      });
    }
  };

  const handleBuyClick = (position: number) => {
    setSelectedPosition(position);
    setPurchaseDialogOpen(true);
  };

  const handlePurchaseComplete = () => {
    if (userId) {
      loadBuildings(userId);
    }
  };

  const getBuildingAtPosition = (position: number) => {
    return buildings.find((b) => b.position_index === position);
  };

  return (
    <div 
      className="min-h-screen w-full bg-repeat relative"
      style={{ 
        backgroundImage: `url(${bgFarm})`,
        backgroundSize: '200px 200px'
      }}
    >
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />
      
      <div className="relative z-10 p-6">
        {/* Profile Avatar */}
        <div className="absolute top-4 left-4 z-50">
          <button
            onClick={() => setProfileOpen(true)}
            className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20 hover:border-white/40 transition-all hover:scale-105"
          >
            <img
              src={defaultAvatar}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="absolute top-4 right-4 z-50 flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTutorialOpen(true)}
            className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20 text-white"
          >
            <Info className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20 text-white"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>

        {/* Building Slots Grid */}
        <div className="max-w-2xl mx-auto">
          <div className="grid grid-cols-2 gap-4 mb-20">
            {Array.from({ length: TOTAL_SLOTS }).map((_, index) => (
              <BuildingSlot
                key={index}
                position={index}
                building={getBuildingAtPosition(index)}
                onBuyClick={handleBuyClick}
              />
            ))}
          </div>
        </div>
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <TutorialDialog open={tutorialOpen} onOpenChange={setTutorialOpen} />
      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
      
      <PurchaseBuildingDialog
        open={purchaseDialogOpen}
        onOpenChange={setPurchaseDialogOpen}
        position={selectedPosition}
        userId={userId}
        onPurchaseComplete={handlePurchaseComplete}
      />
    </div>
  );
};

export default Home;
