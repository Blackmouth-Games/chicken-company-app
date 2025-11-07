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
import { CorralDialog } from "@/components/CorralDialog";
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
  const [corralDialogOpen, setCorralDialogOpen] = useState(false);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | undefined>();
  const { toast } = useToast();
  const { playMusic, isMuted } = useAudio();
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const [userInteracted, setUserInteracted] = useState(false);

  // Dynamic slots: always even number, min 6, max based on buildings + min 4-6 empty
  const occupiedSlots = buildings.length;
  const MIN_EMPTY_SLOTS = 4;
  const MAX_EMPTY_SLOTS = 6;
  // Calculate total to always be even
  let totalSlots = occupiedSlots + MIN_EMPTY_SLOTS;
  if (totalSlots % 2 !== 0) totalSlots++; // Make it even
  if (totalSlots < 6) totalSlots = 6; // Minimum 6 slots
  const TOTAL_SLOTS = totalSlots;

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
      
      // Sort buildings: corrals by level (desc), then others by position
      const sorted = (data || []).sort((a, b) => {
        const isACorral = a.building_type === 'corral';
        const isBCorral = b.building_type === 'corral';
        
        // Corrals first
        if (isACorral && !isBCorral) return -1;
        if (!isACorral && isBCorral) return 1;
        
        // Both corrals: sort by level descending
        if (isACorral && isBCorral) {
          return b.level - a.level;
        }
        
        // Others by position
        return a.position_index - b.position_index;
      });
      
      // Reassign position_index based on sorted order
      const updates = sorted.map((building, index) => ({
        id: building.id,
        position_index: index
      }));
      
      // Update positions in database if changed
      for (const update of updates) {
        const original = data?.find(b => b.id === update.id);
        if (original && original.position_index !== update.position_index) {
          await supabase
            .from("user_buildings")
            .update({ position_index: update.position_index })
            .eq("id", update.id);
        }
      }
      
      setBuildings(sorted);
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

  const handleUpgradeComplete = () => {
    if (userId) {
      // Reload and reorder buildings after upgrade
      loadBuildings(userId);
    }
  };

  const handleBuildingClick = (buildingId: string) => {
    setSelectedBuildingId(buildingId);
    setCorralDialogOpen(true);
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
          <div className="flex gap-3 mb-20 relative">
            {/* Left Column - Building slots filled by rows */}
            <div className="flex-1 grid grid-cols-1 gap-4">
              {Array.from({ length: Math.ceil(TOTAL_SLOTS / 2) }).map((_, index) => {
                const building = getBuildingAtPosition(index);
                return (
                  <div key={index} className="relative">
                    <BuildingSlot
                      position={index}
                      building={building}
                      onBuyClick={handleBuyClick}
                      onBuildingClick={building ? () => handleBuildingClick(building.id) : undefined}
                    />
                  </div>
                );
              })}
            </div>

            {/* Center Conveyor Belt System */}
            <div className="relative flex-shrink-0 w-12">
              {/* Main vertical conveyor - height based on corral rows */}
              {buildings.filter(b => b.building_type === 'corral').length > 0 && (
                <>
                  
                  <div
                    className="w-12 bg-gradient-to-b from-amber-800 via-amber-900 to-amber-800 rounded-lg border-2 border-amber-700 relative overflow-hidden shadow-lg"
                    style={{ 
                      height: `${Math.ceil(buildings.filter(b => b.building_type === 'corral').length / 2) * 180}px`
                    }}
                  >
                    <div className="absolute inset-0 bg-repeating-linear-gradient opacity-20" 
                         style={{
                           backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 15px, rgba(0,0,0,0.3) 15px, rgba(0,0,0,0.3) 30px)',
                           animation: 'conveyor-up 3s linear infinite'
                         }}
                    />
                    {/* Moving eggs going up */}
                    {buildings
                      .filter(b => b.building_type === 'corral' && b.current_chickens > 0)
                      .slice(0, 4)
                      .map((building, i) => (
                        <div
                          key={`center-egg-${building.id}`}
                          className="absolute left-1/2 -translate-x-1/2 w-6 h-6 text-lg flex items-center justify-center"
                          style={{
                            animation: `move-up-center 5s linear infinite`,
                            animationDelay: `${i * 1.2}s`,
                          }}
                        >
                          🥚
                        </div>
                      ))
                    }
                  </div>
                  
                </>
              )}

              <style>{`
                @keyframes conveyor-up {
                  0% { background-position: 0 30px; }
                  100% { background-position: 0 0; }
                }
                @keyframes conveyor-right {
                  0% { background-position: 0 0; }
                  100% { background-position: 30px 0; }
                }
                @keyframes move-up-center {
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
              `}</style>
            </div>

            {/* Right Column - Building slots filled by rows */}
            <div className="flex-1 grid grid-cols-1 gap-4">
              {Array.from({ length: Math.floor(TOTAL_SLOTS / 2) }).map((_, index) => {
                const position = index + Math.ceil(TOTAL_SLOTS / 2);
                const building = getBuildingAtPosition(position);
                return (
                  <div key={position} className="relative">
                    <BuildingSlot
                      position={position}
                      building={building}
                      onBuyClick={handleBuyClick}
                      onBuildingClick={building ? () => handleBuildingClick(building.id) : undefined}
                    />
                  </div>
                );
              })}
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
      <CorralDialog 
        open={corralDialogOpen} 
        onOpenChange={setCorralDialogOpen} 
        userId={userId || undefined}
        buildingId={selectedBuildingId}
      />
    </div>
  );
};

export default Home;
