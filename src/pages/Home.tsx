import { useState, useEffect, useRef } from "react";
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
import { WarehouseDialog } from "@/components/WarehouseDialog";
import { MarketDialog } from "@/components/MarketDialog";
import { HouseDialog } from "@/components/HouseDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAudio } from "@/contexts/AudioContext";

const Home = () => {
  const telegramUser = getTelegramUser();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<number>(0);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [warehouseOpen, setWarehouseOpen] = useState(false);
  const [marketOpen, setMarketOpen] = useState(false);
  const [houseOpen, setHouseOpen] = useState(false);
  const { toast } = useToast();
  const { playMusic, isMuted } = useAudio();
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const [userInteracted, setUserInteracted] = useState(false);

  // Number of available slots
  const TOTAL_SLOTS = 6;

  useEffect(() => {
    loadUserProfile();
  }, [telegramUser]);

  useEffect(() => {
    // Initialize music
    if (!musicRef.current) {
      musicRef.current = new Audio("/sounds/home-music.mp3");
      musicRef.current.loop = true;
    }

    // Try to play music when component mounts or mute state changes
    if (userInteracted) {
      playMusic(musicRef.current);
    }

    return () => {
      if (musicRef.current) {
        musicRef.current.pause();
        musicRef.current = null;
      }
    };
  }, [playMusic, userInteracted, isMuted]);

  // Enable music on first user interaction
  useEffect(() => {
    const enableAudio = () => {
      setUserInteracted(true);
      if (musicRef.current && !isMuted) {
        playMusic(musicRef.current);
      }
    };

    // Listen for any user interaction
    const events = ['click', 'touchstart', 'keydown'];
    events.forEach(event => {
      document.addEventListener(event, enableAudio, { once: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, enableAudio);
      });
    };
  }, [playMusic, isMuted]);

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
      {/* Background overlay removed to prevent white screen */}
      
      {/* Floating Header - Transparent with visible buttons */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center justify-between p-4">
          {/* Profile Avatar */}
          <button
            onClick={() => setProfileOpen(true)}
            className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/40 hover:border-primary transition-all hover:scale-105 bg-background shadow-lg"
          >
            <img
              src={defaultAvatar}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </button>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setTutorialOpen(true)}
              className="bg-background/95 backdrop-blur-sm border-border hover:bg-accent shadow-lg"
            >
              <Info className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              className="bg-background/95 backdrop-blur-sm border-border hover:bg-accent shadow-lg"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="relative z-10 p-6 pt-24">

        {/* Fixed Buildings */}
        <div className="max-w-3xl mx-auto mb-8">
          {/* House - Centered at top */}
          <div className="flex justify-center mb-8">
            <button
              onClick={() => setHouseOpen(true)}
              className="bg-background/80 backdrop-blur-sm border-2 border-primary/30 rounded-lg p-4 hover:bg-background/90 transition-all hover:scale-105"
            >
              <div className="flex flex-col items-center">
                <div className="text-5xl mb-1">🏠</div>
                <p className="text-xs font-medium">Farms house</p>
              </div>
            </button>
          </div>

          {/* Warehouse and Market - With space between */}
          <div className="grid grid-cols-2 gap-16 mb-8">
            <button
              onClick={() => setWarehouseOpen(true)}
              className="bg-gradient-to-br from-blue-100 to-blue-50 backdrop-blur-sm border-2 border-blue-400 rounded-lg p-6 hover:from-blue-200 hover:to-blue-100 transition-all hover:scale-105 relative shadow-lg"
            >
              <div className="flex flex-col items-center">
                <div className="absolute -top-3 -left-3 bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center text-sm font-bold shadow-md">
                  {buildings.find(b => b.building_type === 'warehouse')?.level || 1}
                </div>
                <div className="text-6xl mb-2">🏭</div>
                <p className="text-sm font-bold text-blue-900">Almacén</p>
              </div>
            </button>

            {/* Space for future vehicle */}
            <button
              onClick={() => setMarketOpen(true)}
              className="bg-gradient-to-br from-amber-100 to-orange-50 backdrop-blur-sm border-2 border-amber-400 rounded-lg p-6 hover:from-amber-200 hover:to-orange-100 transition-all hover:scale-105 relative shadow-lg"
            >
              <div className="flex flex-col items-center">
                <div className="absolute -top-3 -left-3 bg-amber-600 text-white rounded-full w-10 h-10 flex items-center justify-center text-sm font-bold shadow-md">
                  {buildings.find(b => b.building_type === 'market')?.level || 1}
                </div>
                <div className="text-6xl mb-2">🏪</div>
                <p className="text-sm font-bold text-amber-900">Market</p>
              </div>
            </button>
          </div>
        </div>

        {/* Building Slots Grid with Conveyor Belt */}
        <div className="max-w-3xl mx-auto">
          <div className="flex items-stretch gap-3 mb-20">
            {/* Left Column - Bigger slots */}
            <div className="flex-1 space-y-4">
              {Array.from({ length: TOTAL_SLOTS / 2 }).map((_, index) => (
                <BuildingSlot
                  key={index}
                  position={index}
                  building={getBuildingAtPosition(index)}
                  onBuyClick={handleBuyClick}
                />
              ))}
            </div>

            {/* Conveyor Belt System with Turn to Warehouse */}
            <div className="relative flex-shrink-0">
              {/* Vertical part of conveyor */}
              <div className="w-10 bg-gradient-to-b from-amber-800 via-amber-900 to-amber-800 rounded-lg border-2 border-amber-700 relative overflow-hidden shadow-lg" 
                   style={{ minHeight: 'calc(100vh - 200px)' }}>
                <div className="absolute inset-0 bg-repeating-linear-gradient opacity-20" 
                     style={{
                       backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 15px, rgba(0,0,0,0.3) 15px, rgba(0,0,0,0.3) 30px)',
                       animation: 'conveyor-up 3s linear infinite'
                     }}
                />
                {/* Moving items on vertical belt */}
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={`v-item-${i}`}
                    className="absolute left-1/2 -translate-x-1/2 w-6 h-6 text-lg flex items-center justify-center"
                    style={{
                      animation: `move-up 4s linear infinite`,
                      animationDelay: `${i * 1}s`,
                    }}
                  >
                    🥚
                  </div>
                ))}
              </div>
              
              {/* Turn/Corner piece */}
              <div className="absolute -top-32 left-0 w-10 h-32 bg-gradient-to-b from-amber-800 to-amber-900 border-2 border-amber-700 shadow-lg overflow-hidden"
                   style={{ borderRadius: '0 0 20px 0' }}>
                <div className="absolute inset-0 bg-repeating-linear-gradient opacity-20" />
                {/* Item turning corner */}
                <div
                  className="absolute w-6 h-6 text-lg flex items-center justify-center"
                  style={{
                    animation: `turn-corner 4s linear infinite`,
                  }}
                >
                  🥚
                </div>
              </div>
              
              {/* Horizontal part connecting to warehouse */}
              <div className="absolute -top-32 left-10 h-10 bg-gradient-to-r from-amber-900 via-amber-800 to-amber-900 border-2 border-amber-700 rounded-r-lg shadow-lg overflow-hidden"
                   style={{ width: '150px' }}>
                <div className="absolute inset-0 bg-repeating-linear-gradient opacity-20"
                     style={{
                       backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 15px, rgba(0,0,0,0.3) 15px, rgba(0,0,0,0.3) 30px)',
                       animation: 'conveyor-right 3s linear infinite'
                     }}
                />
                {/* Moving items on horizontal belt */}
                {[0, 1, 2].map((i) => (
                  <div
                    key={`h-item-${i}`}
                    className="absolute top-1/2 -translate-y-1/2 w-6 h-6 text-lg flex items-center justify-center"
                    style={{
                      animation: `move-right 3s linear infinite`,
                      animationDelay: `${i * 1}s`,
                    }}
                  >
                    🥚
                  </div>
                ))}
              </div>

              <style>{`
                @keyframes conveyor-up {
                  0% { background-position: 0 30px; }
                  100% { background-position: 0 0; }
                }
                @keyframes conveyor-right {
                  0% { background-position: 0 0; }
                  100% { background-position: 30px 0; }
                }
                @keyframes move-up {
                  0% {
                    bottom: -20px;
                    opacity: 0;
                  }
                  5% {
                    opacity: 1;
                  }
                  95% {
                    opacity: 1;
                  }
                  100% {
                    bottom: calc(100% + 160px);
                    opacity: 0;
                  }
                }
                @keyframes move-right {
                  0% {
                    left: -20px;
                    opacity: 0;
                  }
                  5% {
                    opacity: 1;
                  }
                  95% {
                    opacity: 1;
                  }
                  100% {
                    left: calc(100% + 20px);
                    opacity: 0;
                  }
                }
                @keyframes turn-corner {
                  0%, 95% {
                    opacity: 0;
                  }
                  96% {
                    bottom: 0;
                    left: 50%;
                    opacity: 1;
                  }
                  98% {
                    bottom: 50%;
                    left: 50%;
                  }
                  100% {
                    bottom: 100%;
                    left: 100%;
                    opacity: 0;
                  }
                }
              `}</style>
            </div>

            {/* Right Column - Bigger slots */}
            <div className="flex-1 space-y-4">
              {Array.from({ length: TOTAL_SLOTS / 2 }).map((_, index) => (
                <BuildingSlot
                  key={index + TOTAL_SLOTS / 2}
                  position={index + TOTAL_SLOTS / 2}
                  building={getBuildingAtPosition(index + TOTAL_SLOTS / 2)}
                  onBuyClick={handleBuyClick}
                />
              ))}
            </div>
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

      <WarehouseDialog open={warehouseOpen} onOpenChange={setWarehouseOpen} userId={userId || undefined} />
      <MarketDialog open={marketOpen} onOpenChange={setMarketOpen} userId={userId || undefined} />
      <HouseDialog open={houseOpen} onOpenChange={setHouseOpen} />
    </div>
  );
};

export default Home;
