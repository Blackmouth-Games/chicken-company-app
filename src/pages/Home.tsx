import { useState, useEffect } from "react";
import bgFarm from "@/assets/bg-farm-grass.png";
import { getTelegramUser } from "@/lib/telegram";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { SettingsDialog } from "@/components/SettingsDialog";
import { BuildingSlot } from "@/components/BuildingSlot";
import { PurchaseBuildingDialog } from "@/components/PurchaseBuildingDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Home = () => {
  const telegramUser = getTelegramUser();
  const [settingsOpen, setSettingsOpen] = useState(false);
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
      console.error("Error loading profile:", error);
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
      style={{ backgroundImage: `url(${bgFarm})` }}
    >
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />
      
      <div className="relative z-10 p-6">
        {/* Settings Button */}
        <div className="absolute top-4 right-4 z-50">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20 text-white"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white drop-shadow-lg mb-2">
            Welcome, {telegramUser?.first_name || 'Guest'}!
          </h1>
          <p className="text-white/90 drop-shadow">
            Start farming your chickens
          </p>
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
