import { useState, useEffect, useRef } from "react";
import bgFarm from "@/assets/bg-farm-grass.png";
import defaultAvatar from "@/assets/default-avatar.png";
import { getTelegramUser } from "@/lib/telegram";
import { getBuildingImage, type BuildingType } from "@/lib/buildingImages";
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
      className="min-h-screen w-full bg-repeat relative overflow-x-hidden"
      style={{ 
        backgroundImage: `url(${bgFarm})`,
        backgroundSize: '200px 200px'
      }}
    >
      {/* Floating Header */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => setProfileOpen(true)}
            className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/40 hover:border-primary transition-all hover:scale-105 bg-background shadow-lg"
          >
            <img src={defaultAvatar} alt="Profile" className="w-full h-full object-cover" />
          </button>
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

      <div className="relative z-10 p-4 md:p-6 pt-20 md:pt-24">
        {/* House - Centered at top */}
        <div className="flex justify-center mb-6 md:mb-8">
          <button
            onClick={() => setHouseOpen(true)}
            className="bg-background/80 backdrop-blur-sm border-2 border-primary/30 rounded-lg p-3 md:p-4 hover:bg-background/90 transition-all hover:scale-105"
          >
            <div className="flex flex-col items-center">
              <div className="text-4xl md:text-5xl mb-1">🏠</div>
              <p className="text-xs font-medium">Farms house</p>
            </div>
          </button>
        </div>

        {/* Grid Container - Fine grid with buildings on top, corrals vertical below */}
        <div className="max-w-7xl mx-auto relative">
          {/* Fine grid overlay */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'linear-gradient(to right, rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.03) 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }}
          />
          {/* Grid: 25 columns total - Warehouse(6) | Left Corrals(6) | Belt(1) | Right Corrals(6) | Market(6) */}
          <div 
            className="grid gap-4 md:gap-6 auto-rows-fr items-stretch relative"
            style={{
              gridTemplateColumns: 'repeat(25, 1fr)',
              minHeight: '700px'
            }}
          >
            
            {/* WAREHOUSE - Top Left: Columns 1-6, Rows 1-3 */}
            <div 
              className="flex items-center justify-center"
              style={{ 
                gridColumn: '1 / 7',
                gridRow: '1 / 4'
              }}
            >
              <button
                onClick={() => setWarehouseOpen(true)}
                className="bg-gradient-to-br from-blue-100 to-blue-50 border-2 border-blue-400 rounded-lg p-4 md:p-6 hover:from-blue-200 hover:to-blue-100 transition-all hover:scale-105 relative shadow-lg w-full h-full min-h-[240px] md:min-h-[280px] flex items-center justify-center"
              >
                <div className="flex flex-col items-center">
                  <div className="absolute -top-3 -left-3 bg-blue-600 text-white rounded-full w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-sm md:text-base font-bold shadow-md z-10">
                    {buildings.find(b => b.building_type === 'warehouse')?.level || 1}
                  </div>
                  <img 
                    src={getBuildingImage('warehouse', buildings.find(b => b.building_type === 'warehouse')?.level || 1, 'A')} 
                    alt="Warehouse" 
                    className="w-40 h-40 md:w-52 md:h-52 object-contain"
                  />
                </div>
              </button>
            </div>

            {/* MARKET - Top Right: Columns 20-25, Rows 1-3 */}
            <div 
              className="flex items-center justify-center"
              style={{ 
                gridColumn: '20 / 26',
                gridRow: '1 / 4'
              }}
            >
              <button
                onClick={() => setMarketOpen(true)}
                className="bg-gradient-to-br from-green-100 to-green-50 border-2 border-green-400 rounded-lg p-4 md:p-6 hover:from-green-200 hover:to-green-100 transition-all hover:scale-105 relative shadow-lg w-full h-full min-h-[240px] md:min-h-[280px] flex items-center justify-center"
              >
                <div className="flex flex-col items-center">
                  <div className="absolute -top-3 -left-3 bg-green-600 text-white rounded-full w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-sm md:text-base font-bold shadow-md z-10">
                    {buildings.find(b => b.building_type === 'market')?.level || 1}
                  </div>
                  <img 
                    src={getBuildingImage('market', buildings.find(b => b.building_type === 'market')?.level || 1, 'A')} 
                    alt="Market" 
                    className="w-40 h-40 md:w-52 md:h-52 object-contain"
                  />
                </div>
              </button>
            </div>

            {/* VERTICAL CONVEYOR BELT - Center: Column 13, Rows 1 to end */}
            <div 
              className="flex justify-center relative"
              style={{ 
                gridColumn: '13 / 14',
                gridRow: `1 / span ${Math.max(6, Math.ceil(TOTAL_SLOTS / 2) + 3)}`
              }}
            >
              <div className="w-full h-full bg-gradient-to-r from-pink-400 via-pink-500 to-pink-400 shadow-lg border-x-2 border-pink-600 relative overflow-hidden">
                {/* Belt pattern */}
                <div className="h-full w-full flex flex-col items-center justify-evenly">
                  {Array.from({ length: 30 }).map((_, i) => (
                    <div key={i} className="w-3 h-0.5 bg-pink-700 rounded-full shadow-inner" />
                  ))}
                </div>
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
              </div>
            </div>

            {/* LEFT CORRALS - Columns 1-6, starting from row 4, vertical stack */}
            {Array.from({ length: Math.ceil(TOTAL_SLOTS / 2) }).map((_, index) => {
              const position = index * 2;
              const building = getBuildingAtPosition(position);
              return (
                <div 
                  key={`left-${position}`}
                  style={{ 
                    gridColumn: '1 / 7',
                    gridRow: 4 + index
                  }}
                >
                  <BuildingSlot
                    position={position}
                    building={building}
                    onBuyClick={handleBuyClick}
                    onBuildingClick={building ? () => handleBuildingClick(building.id) : undefined}
                    isLeftColumn={true}
                  />
                </div>
              );
            })}

            {/* RIGHT CORRALS - Columns 20-25, starting from row 4, vertical stack */}
            {Array.from({ length: Math.ceil(TOTAL_SLOTS / 2) }).map((_, index) => {
              const position = index * 2 + 1;
              const building = getBuildingAtPosition(position);
              return (
                <div 
                  key={`right-${position}`}
                  style={{ 
                    gridColumn: '20 / 26',
                    gridRow: 4 + index
                  }}
                >
                  <BuildingSlot
                    position={position}
                    building={building}
                    onBuyClick={handleBuyClick}
                    onBuildingClick={building ? () => handleBuildingClick(building.id) : undefined}
                    isLeftColumn={false}
                  />
                </div>
              );
            })}

          </div>
        </div>

        {/* Old layout code removed - replaced with grid */}
        <div className="hidden">
          <div className="flex gap-3 mb-20 relative">
            {/* Old conveyor system - keeping for reference but hidden */}
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
