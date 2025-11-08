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

          {/* Warehouse and Market - With more space between */}
          <div className="grid grid-cols-2 gap-24 mb-20 relative z-20">
            <button
              onClick={() => setWarehouseOpen(true)}
              className="bg-gradient-to-br from-blue-100 to-blue-50 backdrop-blur-sm border-2 border-blue-400 rounded-lg p-6 hover:from-blue-200 hover:to-blue-100 transition-all hover:scale-105 relative shadow-lg"
            >
              <div className="flex flex-col items-center">
                <div className="absolute -top-4 -left-4 bg-blue-600 text-white rounded-full w-11 h-11 flex items-center justify-center text-sm font-bold shadow-md z-10">
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
                <div className="absolute -top-4 -left-4 bg-amber-600 text-white rounded-full w-11 h-11 flex items-center justify-center text-sm font-bold shadow-md z-10">
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
            {/* Left Column - Even positions (0,2,4,6,8,10) */}
            <div className="flex-1 grid grid-cols-1 gap-4">
              {Array.from({ length: Math.ceil(TOTAL_SLOTS / 2) }).map((_, index) => {
                const position = index * 2; // 0, 2, 4, 6, 8, 10...
                const building = getBuildingAtPosition(position);
                return (
                  <div key={position} className="relative">
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
            </div>

            {/* Center Conveyor Belt System - Animated */}
            <div className="relative flex-shrink-0 w-10 -mt-20 z-0">
              {/* Vertical segments for each row */}
              {buildings.filter(b => b.building_type === 'corral').map((building, index) => {
                const rowIndex = Math.floor(index / 2);
                const isLeftColumn = building.position_index < 6;
                
                return (
                  <div key={`segment-${building.id}`} className="relative" style={{ height: '180px' }}>
                    {/* Vertical segment with improved graphics and animation */}
                    <div className="absolute left-0 top-0 w-10 h-full bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 rounded-lg overflow-hidden shadow-lg border-x border-gray-800">
                      {/* Animated belt rollers */}
                      <div className="h-full w-full flex flex-col items-center justify-evenly animate-belt-vertical">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <div key={i} className="w-3 h-0.5 bg-gray-900 rounded-full shadow-inner" />
                        ))}
                      </div>
                      {/* Metallic shine effect */}
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-400/30 to-transparent" />
                      {/* Moving stripes effect */}
                      <div 
                        className="absolute inset-0 opacity-20"
                        style={{
                          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 10px, rgba(0,0,0,0.3) 10px, rgba(0,0,0,0.3) 20px)',
                          animation: 'belt-move-up 1s linear infinite'
                        }}
                      />
                    </div>
                    
                    {/* Animated eggs flowing through the belt */}
                    {building.current_chickens > 0 && (
                      <>
                        {/* Multiple eggs at different stages */}
                        {[0, 1, 2].map((eggIndex) => (
                          <div
                            key={`egg-${building.id}-${eggIndex}`}
                            className="absolute w-6 h-6 text-base flex items-center justify-center pointer-events-none z-50"
                            style={{
                              animation: `egg-journey-${isLeftColumn ? 'left' : 'right'}-row-${rowIndex} 8s ease-in-out infinite`,
                              animationDelay: `${index * 2 + eggIndex * 2.5}s`,
                            }}
                          >
                            🥚
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                );
              })}

              <style>{`
                @keyframes belt-move-up {
                  0% { background-position: 0 20px; }
                  100% { background-position: 0 0; }
                }
                
                @keyframes belt-move-horizontal {
                  0% { background-position: 20px 0; }
                  100% { background-position: 0 0; }
                }
                
                
                /* Journey animations for left column corrals */
                ${Array.from({ length: 6 }).map((_, rowIndex) => `
                  @keyframes egg-journey-left-row-${rowIndex} {
                    /* Start at corral (left side) */
                    0% {
                      left: -120px;
                      top: ${rowIndex * 180 + 70}px;
                      opacity: 0;
                      transform: scale(1);
                    }
                    3% {
                      opacity: 1;
                    }
                    
                    /* Move right on mini horizontal belt to central belt */
                    15% {
                      left: 20px;
                      top: ${rowIndex * 180 + 70}px;
                      opacity: 1;
                      transform: scale(1);
                    }
                    
                    /* Move up on vertical belt */
                    45% {
                      left: 20px;
                      top: 175px;
                      opacity: 1;
                      transform: scale(1);
                    }
                    
                    /* Move left on top horizontal belt toward warehouse */
                    75% {
                      left: calc(-50vw + 80px);
                      top: 175px;
                      opacity: 1;
                      transform: scale(1);
                    }
                    
                    /* Move down into warehouse */
                    90% {
                      left: calc(-50vw + 80px);
                      top: 225px;
                      opacity: 1;
                      transform: scale(0.8);
                    }
                    
                    95%, 100% {
                      left: calc(-50vw + 80px);
                      top: 225px;
                      opacity: 0;
                      transform: scale(0.5);
                    }
                  }
                `).join('\n')}
                
                /* Journey animations for right column corrals */
                ${Array.from({ length: 6 }).map((_, rowIndex) => `
                  @keyframes egg-journey-right-row-${rowIndex} {
                    /* Start at corral (right side) */
                    0% {
                      left: 72px;
                      top: ${rowIndex * 180 + 70}px;
                      opacity: 0;
                      transform: scale(1);
                    }
                    3% {
                      opacity: 1;
                    }
                    
                    /* Move left on mini horizontal belt to central belt */
                    15% {
                      left: 20px;
                      top: ${rowIndex * 180 + 70}px;
                      opacity: 1;
                      transform: scale(1);
                    }
                    
                    /* Move up on vertical belt */
                    45% {
                      left: 20px;
                      top: 175px;
                      opacity: 1;
                      transform: scale(1);
                    }
                    
                    /* Move left on top horizontal belt toward warehouse */
                    75% {
                      left: calc(-50vw + 80px);
                      top: 175px;
                      opacity: 1;
                      transform: scale(1);
                    }
                    
                    /* Move down into warehouse */
                    90% {
                      left: calc(-50vw + 80px);
                      top: 225px;
                      opacity: 1;
                      transform: scale(0.8);
                    }
                    
                    95%, 100% {
                      left: calc(-50vw + 80px);
                      top: 225px;
                      opacity: 0;
                      transform: scale(0.5);
                    }
                  }
                `).join('\n')}
              `}</style>
            </div>

            {/* Right Column - Odd positions (1,3,5,7,9,11) */}
            <div className="flex-1 grid grid-cols-1 gap-4">
              {Array.from({ length: Math.floor(TOTAL_SLOTS / 2) }).map((_, index) => {
                const position = index * 2 + 1; // 1, 3, 5, 7, 9, 11...
                const building = getBuildingAtPosition(position);
                return (
                  <div key={position} className="relative">
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
