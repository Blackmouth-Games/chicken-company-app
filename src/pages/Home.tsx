import { useState, useEffect, useRef } from "react";
import bgFarm from "@/assets/bg/bg-farm-grass.png";
import defaultAvatar from "@/assets/default-avatar.png";
import box1Image from "@/assets/other assets/box_1.png";
import box2Image from "@/assets/other assets/box_2.png";
import box3Image from "@/assets/other assets/box_3.png";
import beltImage from "@/assets/belts and roads/Belt_A.jpg";
import beltBL from "@/assets/belts and roads/Belt_BL.png";
import beltBR from "@/assets/belts and roads/Belt_BR.png";
import beltFunnel from "@/assets/belts and roads/Belt_funnel.jpg";
import { getTelegramUser } from "@/lib/telegram";
import { getBuildingImage, getBuildingDisplay, type BuildingType } from "@/lib/buildingImages";
import { useBuildingSkins } from "@/hooks/useBuildingSkins";
import { BUILDING_TYPES } from "@/lib/constants";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Settings, Info } from "lucide-react";
import { SettingsDialog } from "@/components/SettingsDialog";
import { TutorialDialog } from "@/components/TutorialDialog";
import { ProfileDialog } from "@/components/ProfileDialog";
import { BuildingSlot } from "@/components/BuildingSlot";
import { parseGridNotation, createGridNotation } from "@/lib/layoutCollisions";
import { PurchaseBuildingDialog } from "@/components/PurchaseBuildingDialog";
import { WarehouseDialog } from "@/components/WarehouseDialog";
import { MarketDialog } from "@/components/MarketDialog";
import { HouseDialog } from "@/components/HouseDialog";
import { CorralDialog } from "@/components/CorralDialog";
import { ConveyorBelt } from "@/components/ConveyorBelt";
import { Road } from "@/components/Road";
import { SelectionToolbar } from "@/components/SelectionToolbar";
import LayoutEditor from "@/components/LayoutEditor";
import { Egg } from "@/components/Egg";
import { Vehicle } from "@/components/Vehicle";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useAudio } from "@/contexts/AudioContext";
import { useLayoutEditor } from "@/hooks/useLayoutEditor";
import { useEggSystem } from "@/hooks/useEggSystem";
import { useVehicleSystem } from "@/hooks/useVehicleSystem";
import { useTonConnectUI } from "@tonconnect/ui-react";

const Home = () => {
  const { t } = useLanguage();
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
  const [headerEditMode, setHeaderEditMode] = useState(false);
  const [houseOpen, setHouseOpen] = useState(false);
  const [corralDialogOpen, setCorralDialogOpen] = useState(false);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | undefined>();
  const { toast } = useToast();
  const { playMusic, isMuted } = useAudio();
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const [userInteracted, setUserInteracted] = useState(false);

  // Use layout editor hook
  const {
    layoutConfig,
    isEditMode,
    isDragging,
    draggedBuilding,
    draggedBelt,
    draggedRoad,
    resizing,
    tempPosition,
    beltTempPosition,
    roadTempPosition,
    beltDragOffset,
    roadDragOffset,
    dragOffset,
    hasCollision,
    gridRef,
    selectedObject,
    getTotalRows,
    handleBuildingMouseDown,
    handleBuildingClick,
    handleBeltMouseDown,
    handleBeltClick,
    handleRoadMouseDown,
    handleRoadClick,
    handleResizeStart,
    updateBuildingLayout,
    updateCorralColumn,
    addBelt,
    removeBelt,
    updateBelt,
    removeRoad,
    updateRoad,
    toggleRoadPointA,
    toggleRoadPointB,
    toggleRoadTransport,
    setLayoutConfig,
    addBeltAtPosition,
    addRoadAtPosition,
    deleteSelected,
    duplicateSelected,
    rotateSelected,
    setSelectedObject,
    toggleBeltOutput,
    toggleBeltDestiny,
    toggleBeltTransport,
    pixelToGrid,
  } = useLayoutEditor(20);

  // Get building skins hooks
  const { getSkinByKey: getMarketSkinByKey } = useBuildingSkins(BUILDING_TYPES.MARKET);
  const { getSkinByKey: getWarehouseSkinByKey } = useBuildingSkins(BUILDING_TYPES.WAREHOUSE);

  // Get market building - use useMemo to ensure it updates when buildings change
  const marketBuilding = useMemo(() => {
    return buildings.find(b => b.building_type === 'market');
  }, [buildings]);
  const marketLevel = marketBuilding?.level || 1;
  
  // Get market skin info
  const marketSkinInfo = useMemo(() => {
    if (!marketBuilding?.selected_skin) return null;
    return getMarketSkinByKey(marketBuilding.selected_skin);
  }, [marketBuilding?.selected_skin, getMarketSkinByKey]);

  // Get market display (image or emoji)
  const marketDisplay = useMemo(() => {
    return getBuildingDisplay(
      'market',
      marketLevel,
      marketBuilding?.selected_skin || null,
      marketSkinInfo || undefined
    );
  }, [marketBuilding?.selected_skin, marketBuilding?.level, marketLevel, marketSkinInfo]);

  // Get warehouse building - use useMemo to ensure it updates when buildings change
  const warehouseBuilding = useMemo(() => {
    return buildings.find(b => b.building_type === 'warehouse');
  }, [buildings]);
  const warehouseLevel = warehouseBuilding?.level || 1;
  
  // Get warehouse skin info
  const warehouseSkinInfo = useMemo(() => {
    if (!warehouseBuilding?.selected_skin) return null;
    return getWarehouseSkinByKey(warehouseBuilding.selected_skin);
  }, [warehouseBuilding?.selected_skin, getWarehouseSkinByKey]);

  // Get warehouse display (image or emoji)
  const warehouseDisplay = useMemo(() => {
    return getBuildingDisplay(
      'warehouse',
      warehouseLevel,
      warehouseBuilding?.selected_skin || null,
      warehouseSkinInfo || undefined
    );
  }, [warehouseBuilding?.selected_skin, warehouseBuilding?.level, warehouseLevel, warehouseSkinInfo]);

  // Check wallet connection status
  const [tonConnectUI] = useTonConnectUI();
  const isWalletConnected = tonConnectUI.connected;

  // Filter buildings to only count coops (slots are only for coops)
  // Use useMemo to ensure it updates when buildings change
  const coops = useMemo(() => {
    return buildings.filter(b => b.building_type === 'corral');
  }, [buildings]);
  const occupiedSlots = coops.length;
  
  // Calculate total slots based on wallet connection status
  let totalSlots: number;
  
  if (isWalletConnected) {
    // Wallet connected: show occupied slots + 1-2 empty slots (prefer even number)
    // For new users: they get 1 coop by default, so they'll see 1 occupied + empty slots
    const MIN_EMPTY_SLOTS = 1;
    const MAX_EMPTY_SLOTS = 2;
    let emptySlots = MIN_EMPTY_SLOTS;
    totalSlots = occupiedSlots + emptySlots;
    
    // If total is odd, try to add one more empty slot (up to MAX_EMPTY_SLOTS)
    if (totalSlots % 2 !== 0 && emptySlots < MAX_EMPTY_SLOTS) {
      emptySlots = MAX_EMPTY_SLOTS;
      totalSlots = occupiedSlots + emptySlots;
    }
    
    // If still odd, add one more to make it even (but this should rarely happen)
    if (totalSlots % 2 !== 0) {
      totalSlots++;
    }
    
    // Minimum 2 slots (1 per side) if wallet connected
    if (totalSlots < 2) {
      totalSlots = 2;
    }
  } else {
    // Wallet not connected: show 2 empty slots (1 per side) to encourage wallet connection
    totalSlots = 2;
  }
  
  const TOTAL_SLOTS = totalSlots;

  // Responsive cell size based on container width and gap
  const [cellSize, setCellSize] = useState<number>(20);
  useEffect(() => {
    const compute = () => {
      const el = gridRef.current as HTMLDivElement | null;
      if (!el) return;

      const columns = 16;
      const gapVal = parseFloat(String(layoutConfig.grid.gap).replace('px', '')) || 0;
      const rect = el.getBoundingClientRect();
      // Usar el ancho del viewport para garantizar 16 columnas visibles
      const width = Math.max(rect.width, window.innerWidth);

      // Escala 100% por ancho: 16 columnas siempre visibles y celdas 1:1
      const sizeByWidth = (width - gapVal * (columns - 1)) / columns;
      const candidate = Math.floor(sizeByWidth);
      const clamped = Math.max(8, Number.isFinite(candidate) ? candidate : 8);

      setCellSize(prev => (prev !== clamped ? clamped : prev));
    };

    compute();
    window.addEventListener('resize', compute);
    // Reaccionar a cambios del contenedor (p. ej., barras/side-panels)
    const el = gridRef.current as HTMLDivElement | null;
    const ro = el ? new ResizeObserver(() => compute()) : null;
    if (el && ro) ro.observe(el);
    return () => {
      window.removeEventListener('resize', compute);
      if (el && ro) ro.disconnect();
    };
  }, [gridRef, layoutConfig.grid.gap, layoutConfig.grid.totalRows]);
  
  // State for hiding buildings, belts and roads
  const [hideBuildings, setHideBuildings] = useState(false);
  const [hideBelts, setHideBelts] = useState(false);
  const [hideRoads, setHideRoads] = useState(false);
  
  // State for paint mode
  const [paintMode, setPaintMode] = useState(false);

  // Listen to edit mode changes for header button
  useEffect(() => {
    // Initialize from useLayoutEditor's isEditMode
    setHeaderEditMode(isEditMode);
    
    const handleEditModeChange = (e: any) => {
      setHeaderEditMode(!!e.detail);
    };
    window.addEventListener('layoutEditModeChange', handleEditModeChange as EventListener);
    return () => {
      window.removeEventListener('layoutEditModeChange', handleEditModeChange as EventListener);
    };
  }, [isEditMode]);

  // Toggle edit mode from header
  const toggleEditModeFromHeader = () => {
    const newMode = !headerEditMode;
    setHeaderEditMode(newMode);
    localStorage.setItem('layoutEditMode', JSON.stringify(newMode));
    window.dispatchEvent(new CustomEvent('layoutEditModeChange', { detail: newMode }));
  };
  const [paintOptions, setPaintOptions] = useState<{ direction: 'north' | 'south' | 'east' | 'west'; type: 'straight' | 'curve-ne' | 'curve-nw' | 'curve-se' | 'curve-sw' | 'turn' | 'turn-rt' | 'turn-lt' | 'turn-ne' | 'turn-nw' | 'turn-se' | 'turn-sw' | 'funnel'; objectType: 'belt' | 'road' }>({ direction: 'east', type: 'straight', objectType: 'belt' });
  const [hoveredCell, setHoveredCell] = useState<{ col: number; row: number } | null>(null);

  // Helper functions for belt preview
  const getBeltPreviewImage = (type: string, direction: 'north' | 'south' | 'east' | 'west') => {
    if (type.startsWith('turn-')) {
      const clockwiseTypes = ['turn-rt', 'turn-ne', 'turn-se', 'turn-sw'];
      return clockwiseTypes.includes(type) ? beltBR : beltBL;
    }
    if (type === 'turn') {
      // For turn belts, calculate entry direction from exit (clockwise 90°)
      const directions: ('north' | 'south' | 'east' | 'west')[] = ['north', 'east', 'south', 'west'];
      const exitIndex = directions.indexOf(direction);
      const entryIndex = (exitIndex - 1 + 4) % 4; // -1 for clockwise
      const entryDir = directions[entryIndex];
      
      // Decide clockwise or counterclockwise
      const isClockwise =
        (direction === 'north' && entryDir === 'east') ||
        (direction === 'east' && entryDir === 'south') ||
        (direction === 'south' && entryDir === 'west') ||
        (direction === 'west' && entryDir === 'north');
      
      return isClockwise ? beltBR : beltBL;
    } else if (type === 'funnel') {
      return beltFunnel;
    } else {
      return beltImage;
    }
  };

  const getBeltPreviewTransform = (type: string, direction: 'north' | 'south' | 'east' | 'west') => {
    if (type === 'turn-rt') {
      switch (direction) {
        case 'north': return 'rotate(0deg)';
        case 'east': return 'rotate(90deg)';
        case 'south': return 'rotate(180deg)';
        case 'west': return 'rotate(270deg)';
        default: return 'rotate(0deg)';
      }
    } else if (type === 'turn-lt') {
      switch (direction) {
        case 'north': return 'rotate(0deg)';
        case 'east': return 'rotate(90deg)';
        case 'south': return 'rotate(180deg)';
        case 'west': return 'rotate(270deg)';
        default: return 'rotate(0deg)';
      }
    } else if (type === 'turn-ne') {
      return 'rotate(90deg)';
    } else if (type === 'turn-nw') {
      return 'rotate(270deg)';
    } else if (type === 'turn-se') {
      return 'rotate(90deg)';
    } else if (type === 'turn-sw') {
      return 'rotate(270deg)';
    } else if (type === 'turn') {
      // Turn belts: rotate based on exit direction
      switch (direction) {
        case 'north': return 'rotate(0deg)';
        case 'east': return 'rotate(90deg)';
        case 'south': return 'rotate(180deg)';
        case 'west': return 'rotate(270deg)';
        default: return 'rotate(0deg)';
      }
    } else if (type === 'funnel') {
      // Funnel belts: rotate based on exit direction
      switch (direction) {
        case 'east': return 'rotate(0deg)';
        case 'south': return 'rotate(90deg)';
        case 'west': return 'rotate(180deg)';
        case 'north': return 'rotate(270deg)';
        default: return 'rotate(0deg)';
      }
    } else {
      // Straight and curve belts: rotate based on direction
      switch (direction) {
        case 'north': return 'rotate(270deg)';
        case 'south': return 'rotate(90deg)';
        case 'east': return 'rotate(0deg)';
        case 'west': return 'rotate(180deg)';
        default: return 'rotate(0deg)';
      }
    }
  };
  
  useEffect(() => {
    const handleHideBuildingsChange = (event: CustomEvent<boolean>) => {
      setHideBuildings(event.detail);
    };
    const handleHideBeltsChange = (event: CustomEvent<boolean>) => {
      setHideBelts(event.detail);
    };
    const handleHideRoadsChange = (event: CustomEvent<boolean>) => {
      setHideRoads(event.detail);
    };

    window.addEventListener('hideBuildingsChange', handleHideBuildingsChange as EventListener);
    window.addEventListener('hideBeltsChange', handleHideBeltsChange as EventListener);
    window.addEventListener('hideRoadsChange', handleHideRoadsChange as EventListener);
    return () => {
      window.removeEventListener('hideBuildingsChange', handleHideBuildingsChange as EventListener);
      window.removeEventListener('hideBeltsChange', handleHideBeltsChange as EventListener);
      window.removeEventListener('hideRoadsChange', handleHideRoadsChange as EventListener);
    };
  }, []);

  useEffect(() => {
    const handlePaintModeChange = (event: CustomEvent<boolean>) => {
      setPaintMode(event.detail);
    };

    window.addEventListener('paintModeChange', handlePaintModeChange as EventListener);
    return () => {
      window.removeEventListener('paintModeChange', handlePaintModeChange as EventListener);
    };
  }, []);

  useEffect(() => {
    const handlePaintOptionsChange = (event: CustomEvent<{ direction: 'north' | 'south' | 'east' | 'west'; type: 'straight' | 'curve-ne' | 'curve-nw' | 'curve-se' | 'curve-sw' | 'turn' | 'turn-rt' | 'turn-lt' | 'turn-ne' | 'turn-nw' | 'turn-se' | 'turn-sw' | 'funnel'; objectType: 'belt' | 'road' }>) => {
      setPaintOptions(event.detail);
    };

    window.addEventListener('paintOptionsChange', handlePaintOptionsChange as EventListener);
    return () => {
      window.removeEventListener('paintOptionsChange', handlePaintOptionsChange as EventListener);
    };
  }, []);


  useEffect(() => {
    loadUserProfile();
  }, [telegramUser]);

  // Listen for skin selection and building upgrade events to refresh buildings
  useEffect(() => {
    let isHandling = false; // Prevent multiple simultaneous calls
    
    const handleRefreshBuildings = async () => {
      // Prevent multiple simultaneous calls
      if (isHandling) {
        console.log("[Home] Building refresh event already being handled, skipping...");
        return;
      }
      
      isHandling = true;
      try {
        // Reload buildings to get updated data (level, selected_skin, etc.)
        if (userId) {
          await loadBuildings(userId);
        } else {
          // Only call loadUserProfile if we have telegramUser
          if (telegramUser?.id) {
            await loadUserProfile();
          }
        }
      } catch (error) {
        console.error("[Home] Error handling building refresh:", error);
        // Don't show toast here - loadBuildings already shows it
      } finally {
        isHandling = false;
      }
    };

    // Listen for skin selection events
    window.addEventListener('skinSelected', handleRefreshBuildings);
    // Listen for building upgrade events
    window.addEventListener('buildingUpgraded', handleRefreshBuildings);
    
    return () => {
      window.removeEventListener('skinSelected', handleRefreshBuildings);
      window.removeEventListener('buildingUpgraded', handleRefreshBuildings);
    };
  }, [userId, telegramUser]);

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

  // Calculate warehouse capacity from actual warehouse building
  const warehouseCapacity = useMemo(() => {
    if (!warehouseBuilding) {
      return { current: 0, max: 100 }; // Default if no warehouse
    }
    // TODO: Get actual stored amount from database (eggs/items)
    // For now, use a placeholder - this should come from warehouse inventory
    const stored = 0; // This should be fetched from database
    return {
      current: stored,
      max: warehouseBuilding.capacity || 100
    };
  }, [warehouseBuilding]);

  // Calculate which box image to show based on capacity percentage
  const getBoxImage = () => {
    if (!warehouseBuilding || warehouseCapacity.max === 0) return null;
    const percentage = (warehouseCapacity.current / warehouseCapacity.max) * 100;
    if (percentage >= 80) return box3Image;
    if (percentage >= 45) return box2Image;
    if (percentage >= 15) return box1Image;
    return null; // No box if less than 15%
  };

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
        // Ensure default buildings are created for new profiles
        await ensureDefaultBuildings(created.profile_id);
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
        // Ensure default buildings exist (in case they weren't created during auth)
        await ensureDefaultBuildings(profile.id);
        loadBuildings(profile.id);
      }
    } catch (error) {
      console.error("Error loading/creating profile:", error);
    }
  };

  // Ensure default buildings (warehouse, market, and one corral) exist
  const ensureDefaultBuildings = async (profileId: string) => {
    try {
      // Get existing buildings
      const { data: existingBuildings } = await supabase
        .from("user_buildings")
        .select("building_type")
        .eq("user_id", profileId);

      const existingTypes = (existingBuildings || []).map(b => b.building_type);
      const needsWarehouse = !existingTypes.includes('warehouse');
      const needsMarket = !existingTypes.includes('market');
      // Check if user has at least one corral (limit: 1 default corral)
      const existingCorrals = (existingBuildings || []).filter(b => b.building_type === 'corral');
      const needsCorral = existingCorrals.length === 0;

      if (!needsWarehouse && !needsMarket && !needsCorral) {
        return; // All default buildings exist, nothing to do
      }

      // Get default prices for level 1
      const buildingTypesToCheck: string[] = [];
      if (needsWarehouse) buildingTypesToCheck.push('warehouse');
      if (needsMarket) buildingTypesToCheck.push('market');
      if (needsCorral) buildingTypesToCheck.push('corral');

      const { data: prices } = await supabase
        .from("building_prices")
        .select("*")
        .in("building_type", buildingTypesToCheck)
        .eq("level", 1);

      const warehousePrice = prices?.find(p => p.building_type === 'warehouse');
      const marketPrice = prices?.find(p => p.building_type === 'market');
      const corralPrice = prices?.find(p => p.building_type === 'corral');

      const buildingsToCreate: any[] = [];

      if (needsWarehouse) {
        buildingsToCreate.push({
          user_id: profileId,
          building_type: 'warehouse',
          level: 1,
          position_index: -1, // Special position for default buildings
          capacity: warehousePrice?.capacity || 100, // Default capacity if price not found
          current_chickens: 0,
        });
      }

      if (needsMarket) {
        buildingsToCreate.push({
          user_id: profileId,
          building_type: 'market',
          level: 1,
          position_index: -2, // Special position for default buildings
          capacity: marketPrice?.capacity || 100, // Default capacity if price not found
          current_chickens: 0,
        });
      }

      // Create one corral (coop) of level 1 if user has none (limit: 1)
      if (needsCorral) {
        buildingsToCreate.push({
          user_id: profileId,
          building_type: 'corral',
          level: 1,
          position_index: 0, // First position for the default corral
          capacity: corralPrice?.capacity || 50, // Default capacity if price not found
          current_chickens: 0,
        });
      }

      if (buildingsToCreate.length > 0) {
        const { error: createError } = await supabase
          .from("user_buildings")
          .insert(buildingsToCreate);

        if (createError) {
          console.error("[Home] Error creating default buildings:", createError);
        } else {
          console.log("[Home] Created default buildings:", buildingsToCreate.map(b => b.building_type));
        }
      }
    } catch (error) {
      console.error("[Home] Error ensuring default buildings:", error);
    }
  };

  const loadBuildings = async (profileId: string) => {
    if (!profileId) {
      console.warn("[Home] loadBuildings called without profileId");
      return;
    }
    
    try {
      // First, ensure default buildings exist
      await ensureDefaultBuildings(profileId);

      const { data, error } = await supabase
        .from("user_buildings")
        .select("*")
        .eq("user_id", profileId)
        .order("position_index");

      if (error) {
        console.error("[Home] Error loading buildings from Supabase:", error);
        throw error;
      }
      
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
      loadBuildings(userId).then(() => {
        // Force re-render to update belts after purchase
        // The belts will be automatically regenerated based on TOTAL_SLOTS
        // which is calculated from buildings.length
      });
    }
  };

  // Get coop at position (slots are only for coops)
  const getBuildingAtPosition = (position: number) => {
    return coops.find((b) => b.position_index === position);
  };

  // Generate automatic belts: one belt per coop pointing to center, plus central vertical line
  // IMPORTANT: This generates belts for ALL slots, even empty ones
  // Belts are created automatically when a new coop is purchased
  const generateCorralBelts = () => {
    const autoBelts: any[] = [];
    const slotsPerSide = Math.ceil(TOTAL_SLOTS / 2);
    const leftStartRow = layoutConfig.leftCorrals.startRow ?? 1;
    const rightStartRow = layoutConfig.rightCorrals.startRow ?? 1;
    const slotRowSpan = Math.max(1, layoutConfig.leftCorrals.rowSpan ?? 1);
    const leftColumns = parseGridNotation(layoutConfig.leftCorrals.gridColumn);
    const rightColumns = parseGridNotation(layoutConfig.rightCorrals.gridColumn);
    
    // Calculate center column: there are 3 columns between leftCorrals and rightCorrals
    // leftCorrals ends at leftColumns.end, rightCorrals starts at rightColumns.start
    // The 3 columns are: leftColumns.end, leftColumns.end+1, leftColumns.end+2
    // Center column is the middle one: leftColumns.end + 1
    const centerCol = leftColumns.end + 1; // Center of the 3 columns between corrals
    
    // Calculate first and last row of slots
    const firstSlotRow = Math.min(leftStartRow, rightStartRow);
    const lastSlotIndex = slotsPerSide - 1;
    const lastSlotBaseRow = Math.max(
      leftStartRow + lastSlotIndex * (slotRowSpan + 1),
      rightStartRow + lastSlotIndex * (slotRowSpan + 1)
    );
    const lastSlotRow = lastSlotBaseRow + slotRowSpan - 1;
    
    // Generate central vertical line: continuous line from first slot to last slot
    // Create one belt per row from firstSlotRow to lastSlotRow + 1
    // BUT: Remove the last 3 belts from the vertical line
    const centerLineStartRow = firstSlotRow;
    const centerLineEndRow = lastSlotRow + 1; // Extend one row below the last slot
    const actualEndRow = centerLineEndRow - 4; // Remove last 4 belts
    
    // Find where the two output belts converge (where left and right output belts meet the center line)
    // This is typically at the row where the first output belts from left and right corrals meet
    const firstLeftBeltRow = leftStartRow + 3; // First left output belt row
    const firstRightBeltRow = rightStartRow + 3; // First right output belt row
    const convergenceRow = Math.max(firstLeftBeltRow, firstRightBeltRow); // Where they converge
    
    // Generate continuous vertical line: one belt per row (excluding last 3)
    // Generate regardless of getTotalRows() limit - belts can be outside visible area
    for (let beltRow = centerLineStartRow; beltRow <= actualEndRow; beltRow++) {
      if (beltRow >= 1 && centerCol >= 1 && centerCol <= 30) {
        // Check if there's already a belt at this position
        const existingBelt = autoBelts.find(b => {
          const beltRowNotation = parseGridNotation(b.gridRow);
          const beltColNotation = parseGridNotation(b.gridColumn);
          return beltRowNotation.start === beltRow && beltColNotation.start === centerCol;
        });
        
        if (!existingBelt) {
          // First funnel at position 4, then every 8 rows after that
          // Funnel receives from West (left corrals), North (above), South (below) and exits North (up)
          // Calculate relative position from start of center line
          const relativeRow = beltRow - centerLineStartRow;
          // First funnel at position 4 (relativeRow === 3, since it's 0-indexed), then every 8 after that
          const isFunnelRow = relativeRow === 3 || (relativeRow > 3 && (relativeRow - 3) % 8 === 0);
          
          if (beltRow === convergenceRow || isFunnelRow) {
            autoBelts.push({
              id: `belt-auto-center-row-${beltRow}`,
              gridColumn: createGridNotation(centerCol, centerCol + 1),
              gridRow: createGridNotation(beltRow, beltRow + 1),
              direction: 'north' as const, // Funnel exits up (north) in vertical line
              type: 'funnel' as const,
              isTransport: true, // Center line belts are transport
            });
          } else {
            autoBelts.push({
              id: `belt-auto-center-row-${beltRow}`,
              gridColumn: createGridNotation(centerCol, centerCol + 1),
              gridRow: createGridNotation(beltRow, beltRow + 1),
              direction: 'north' as const,
              type: 'straight' as const,
              isTransport: true, // Center line belts are transport
            });
          }
        }
      }
    }
    
    // Generate ONE belt per corral pointing to center
    // Left corrals: belts point east (towards center)
    // Only one belt per corral, positioned 3 rows from the top of each corral
    for (let i = 0; i < slotsPerSide; i++) {
      const baseRow = leftStartRow + i * (slotRowSpan + 1);
      // Belt should be 3 rows from the top of the corral: row = baseRow + 3
      const beltRow = baseRow + 3;
      // Belt column: right edge of left corral (pointing east towards center)
      const beltCol = leftColumns.end;
      
      // Generate belt regardless of getTotalRows() limit - belts can be outside visible area
      if (beltRow >= 1 && beltCol >= 1 && beltCol <= 30) {
        // Check if there's already a belt at this position
        const existingBelt = autoBelts.find(b => {
          const beltRowNotation = parseGridNotation(b.gridRow);
          const beltColNotation = parseGridNotation(b.gridColumn);
          return beltRowNotation.start === beltRow && beltColNotation.start === beltCol;
        });
        
        if (!existingBelt) {
          const slotPosition = i * 2; // Left slots: 0, 2, 4, 6, ...
          autoBelts.push({
            id: `belt-auto-left-${i}`,
            gridColumn: createGridNotation(beltCol, beltCol + 1),
            gridRow: createGridNotation(beltRow, beltRow + 1),
            direction: 'east' as const,
            type: 'straight' as const,
            isOutput: true, // Auto-generated belts from slots are output
            slotPosition: slotPosition, // Associate with slot position
          });
        }
      }
    }
    
    // Right corrals: belts point west (towards center)
    // Only one belt per corral, positioned 3 rows from the top of each corral
    // Belts should be in the column just to the left of right corral start (rightColumns.start - 1)
    // This places them one column to the left of where they currently are
    for (let i = 0; i < slotsPerSide; i++) {
      const baseRow = rightStartRow + i * (slotRowSpan + 1);
      // Belt should be 3 rows from the top of the corral: row = baseRow + 3
      const beltRow = baseRow + 3;
      // Belt column: one column to the left of right corral start (rightColumns.start - 1)
      // This is the column just to the left of where they currently are
      const beltCol = rightColumns.start - 1;
      
      // Generate belt regardless of getTotalRows() limit - belts can be outside visible area
      if (beltRow >= 1 && beltCol >= 1 && beltCol <= 30) {
        // Check if there's already a belt at this position
        const existingBelt = autoBelts.find(b => {
          const beltRowNotation = parseGridNotation(b.gridRow);
          const beltColNotation = parseGridNotation(b.gridColumn);
          return beltRowNotation.start === beltRow && beltColNotation.start === beltCol;
        });
        
        if (!existingBelt) {
          const slotPosition = i * 2 + 1; // Right slots: 1, 3, 5, 7, ...
          autoBelts.push({
            id: `belt-auto-right-${i}`,
            gridColumn: createGridNotation(beltCol, beltCol + 1),
            gridRow: createGridNotation(beltRow, beltRow + 1),
            direction: 'west' as const,
            type: 'straight' as const,
            isOutput: true, // Auto-generated belts from slots are output
            slotPosition: slotPosition, // Associate with slot position
          });
        }
      }
    }
    
    // Connect center line to buildings (warehouse and market)
    // Get building positions
    const warehouseCols = parseGridNotation(layoutConfig.warehouse.gridColumn);
    const warehouseRows = parseGridNotation(layoutConfig.warehouse.gridRow);
    const marketCols = parseGridNotation(layoutConfig.market.gridColumn);
    const marketRows = parseGridNotation(layoutConfig.market.gridRow);
    
    // Calculate connection points
    // Warehouse: connect from center line to warehouse
    // Find the row where center line intersects with warehouse's row range
    const warehouseCenterRow = Math.floor((warehouseRows.start + warehouseRows.end) / 2);
    if (warehouseCenterRow >= centerLineStartRow && warehouseCenterRow <= centerLineEndRow) {
      // Warehouse is to the left of center, so belt should point west (from center to warehouse)
      // Create horizontal belt from center column towards warehouse
      // Place belt in the column just before center, pointing west (towards warehouse)
      const connectionCol = centerCol - 1; // Column just before center
      
      // Create connection belt (one belt, not continuous)
      if (connectionCol >= 1 && connectionCol <= 30 && warehouseCenterRow < getTotalRows()) {
        // Check if there's already a belt at this position
        const existingBelt = autoBelts.find(b => {
          const beltRowNotation = parseGridNotation(b.gridRow);
          const beltColNotation = parseGridNotation(b.gridColumn);
          return beltRowNotation.start === warehouseCenterRow && beltColNotation.start === connectionCol;
        });
        
        if (!existingBelt) {
          autoBelts.push({
            id: `belt-auto-warehouse-connection`,
            gridColumn: createGridNotation(connectionCol, connectionCol + 1),
            gridRow: createGridNotation(warehouseCenterRow, warehouseCenterRow + 1),
            direction: 'west' as const, // Points towards warehouse (left)
            type: 'straight' as const,
            isTransport: true, // Connection belts are transport
          });
        }
      }
    }
    
    // Market: connect from center line to market
    const marketCenterRow = Math.floor((marketRows.start + marketRows.end) / 2);
    if (marketCenterRow >= centerLineStartRow && marketCenterRow <= centerLineEndRow) {
      // Market is to the right of center, so belt should point east (from center to market)
      // Create horizontal belt from center column towards market
      // Place belt in the column just after center, pointing east (towards market)
      const connectionCol = centerCol + 1; // Column just after center
      
      // Create connection belt (one belt, not continuous)
      if (connectionCol >= 1 && connectionCol <= 30 && marketCenterRow < getTotalRows()) {
        // Check if there's already a belt at this position
        const existingBelt = autoBelts.find(b => {
          const beltRowNotation = parseGridNotation(b.gridRow);
          const beltColNotation = parseGridNotation(b.gridColumn);
          return beltRowNotation.start === marketCenterRow && beltColNotation.start === connectionCol;
        });
        
        if (!existingBelt) {
          autoBelts.push({
            id: `belt-auto-market-connection`,
            gridColumn: createGridNotation(connectionCol, connectionCol + 1),
            gridRow: createGridNotation(marketCenterRow, marketCenterRow + 1),
            direction: 'east' as const, // Points towards market (right)
            type: 'straight' as const,
            isTransport: true, // Connection belts are transport
          });
        }
      }
    }
    
    return autoBelts;
  };

  // Combine manual belts with auto-generated corral belts
  const autoCorralBelts = generateCorralBelts();
  const manualBelts = layoutConfig.belts || [];
  const allBelts = [...autoCorralBelts, ...manualBelts];
  const allRoads = layoutConfig.roads || [];

  // Egg system - must be after allBelts is defined
  const { eggs, getEggDebugInfo } = useEggSystem(allBelts, buildings);
  
  // Vehicle system - must be after roads are defined
  const { vehicles, getVehicleDebugInfo } = useVehicleSystem(allRoads, marketLevel);
  
  // Debug: Send egg and vehicle information to DebugPanel
  useEffect(() => {
    // Send immediately
    if (getEggDebugInfo) {
      window.dispatchEvent(new CustomEvent('eggDebugInfo', { detail: getEggDebugInfo() }));
    }
    if (getVehicleDebugInfo) {
      const debugInfo = getVehicleDebugInfo();
      console.log('[Home] Sending vehicle debug info:', debugInfo);
      window.dispatchEvent(new CustomEvent('vehicleDebugInfo', { detail: debugInfo }));
    }
    
    const interval = setInterval(() => {
      if (getEggDebugInfo) {
        window.dispatchEvent(new CustomEvent('eggDebugInfo', { detail: getEggDebugInfo() }));
      }
      if (getVehicleDebugInfo) {
        const debugInfo = getVehicleDebugInfo();
        window.dispatchEvent(new CustomEvent('vehicleDebugInfo', { detail: debugInfo }));
      }
    }, 1000); // Update every second
    
    return () => clearInterval(interval);
  }, [getEggDebugInfo, getVehicleDebugInfo]);

  // Debug: Send belt information to DebugPanel
  useEffect(() => {
    const leftBelts = autoCorralBelts.filter(b => b.id.startsWith('belt-auto-left-'));
    const rightBelts = autoCorralBelts.filter(b => b.id.startsWith('belt-auto-right-'));
    const centerBelts = autoCorralBelts.filter(b => b.id.startsWith('belt-auto-center-'));
    
    const beltDebugInfo = {
      totalAutoBelts: autoCorralBelts.length,
      leftBelts: {
        count: leftBelts.length,
        belts: leftBelts.map(b => ({ id: b.id, row: b.gridRow, col: b.gridColumn, direction: b.direction }))
      },
      rightBelts: {
        count: rightBelts.length,
        belts: rightBelts.map(b => ({ id: b.id, row: b.gridRow, col: b.gridColumn, direction: b.direction }))
      },
      centerBelts: {
        count: centerBelts.length,
        firstRow: centerBelts.length > 0 ? centerBelts[0].gridRow : null,
        lastRow: centerBelts.length > 0 ? centerBelts[centerBelts.length - 1].gridRow : null
      },
      config: {
        leftCorralsStartRow: layoutConfig.leftCorrals.startRow,
        leftCorralsRowSpan: layoutConfig.leftCorrals.rowSpan,
        rightCorralsStartRow: layoutConfig.rightCorrals.startRow,
        rightCorralsRowSpan: layoutConfig.rightCorrals.rowSpan,
        slotsPerSide: Math.ceil(TOTAL_SLOTS / 2),
        totalSlots: TOTAL_SLOTS
      },
      manualBelts: manualBelts.length,
      totalBelts: allBelts.length
    };
    
    // Send to DebugPanel via custom event
    window.dispatchEvent(new CustomEvent('beltDebugInfo', { detail: beltDebugInfo }));
  }, [autoCorralBelts, allBelts, manualBelts, layoutConfig.leftCorrals.startRow, layoutConfig.rightCorrals.startRow, layoutConfig.leftCorrals.rowSpan, layoutConfig.rightCorrals.rowSpan, TOTAL_SLOTS]);

  const handleUpgradeComplete = () => {
    if (userId) {
      // Reload and reorder buildings after upgrade
      loadBuildings(userId);
    }
  };

  const handleBuildingClickAction = (buildingId: string) => {
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
              variant={headerEditMode ? "default" : "outline"}
              size="sm"
              onClick={toggleEditModeFromHeader}
              className="bg-background/95 backdrop-blur-sm border-border hover:bg-accent shadow-lg gap-2"
            >
              <Layout className="h-4 w-4" />
              {headerEditMode ? t('layoutEditor.deactivateEdit') : t('layoutEditor.activateEdit')}
            </Button>
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
        {/* Grid Container - Fine grid with buildings on top, corrals vertical below */}
        <div 
          ref={gridRef}
          className="w-full mx-auto relative -mx-4 md:-mx-6" 
          style={{ maxWidth: layoutConfig.grid.maxWidth }}
        >
          {/* Grid numbering overlay - Only in edit mode */}
          {isEditMode && (
            <>
              {/* Column numbers */}
              <div className="absolute -top-6 left-0 right-0 flex pointer-events-none" style={{ gap: layoutConfig.grid.gap }}>
                {Array.from({ length: 30 }).map((_, i) => (
                  <div key={`col-${i}`} className="flex-1 text-center text-xs font-mono text-foreground/60">
                    {i + 1}
                  </div>
                ))}
              </div>
              {/* Row numbers */}
              <div className="absolute -left-8 top-0 bottom-0 flex flex-col pointer-events-none" style={{ gap: layoutConfig.grid.gap }}>
                {Array.from({ length: getTotalRows() }).map((_, i) => (
                  <div key={`row-${i}`} className="flex-1 flex items-center justify-end text-xs font-mono text-foreground/60">
                    {i + 1}
                  </div>
                ))}
              </div>
            </>
          )}
          
          {/* Fine grid overlay - Only visible in edit mode */}
          {isEditMode && (
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: 'linear-gradient(to right, rgba(0,0,0,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.08) 1px, transparent 1px)',
                backgroundSize: `${
                  cellSize + (parseFloat(String(layoutConfig.grid.gap).replace('px', '')) || 0)
                }px ${
                  cellSize + (parseFloat(String(layoutConfig.grid.gap).replace('px', '')) || 0)
                }px`
              }}
            />
          )}
          {/* Grid: 25 columns total - Responsive cells that scale with screen */}
          <div 
            data-grid-container
            className={`grid items-stretch relative w-full mx-auto ${paintMode && isEditMode ? 'cursor-crosshair' : ''}`}
            style={{
              gridTemplateColumns: `repeat(16, ${cellSize}px)`,
              gridAutoRows: `${cellSize}px`,
              gap: layoutConfig.grid.gap
            }}
            onMouseMove={(e) => {
              if (paintMode && isEditMode && !isDragging) {
                // Don't calculate if mouse is over UI elements (buttons, modals, etc.)
                const target = e.target as HTMLElement;
                if (target.closest('button') || 
                    target.closest('.absolute.left-full') || 
                    target.closest('[data-belt]') || 
                    target.closest('[data-building]') || 
                    target.closest('[data-road]') ||
                    target.closest('[role="dialog"]') ||
                    target.closest('.fixed') ||
                    target.closest('.absolute.z-50')) {
                  setHoveredCell(null);
                  return;
                }
                
                // Use the same pixelToGrid function for consistency
                // This ensures the hover position matches exactly with click positions
                if (!gridRef.current) {
                  setHoveredCell(null);
                  return;
                }
                
                const gridRect = gridRef.current.getBoundingClientRect();
                
                // Verify mouse is actually within grid bounds
                const mouseX = e.clientX;
                const mouseY = e.clientY;
                if (mouseX < gridRect.left || mouseX > gridRect.right ||
                    mouseY < gridRect.top || mouseY > gridRect.bottom) {
                  setHoveredCell(null);
                  return;
                }
                
                // Use pixelToGrid for accurate calculation (same as click handler)
                const gridPos = pixelToGrid(mouseX, mouseY);
                setHoveredCell(gridPos);
              }
            }}
            onMouseLeave={() => {
              setHoveredCell(null);
            }}
            onClick={(e) => {
              // Don't process if click is on action buttons modal or other UI elements
              const target = e.target as HTMLElement;
              if (target.closest('.absolute.left-full')) {
                return;
              }
              
              // Only block clicks on belts/buildings when in paint mode
              if (paintMode && isEditMode && !isDragging) {
                // In paint mode, block clicks on belts/buildings to allow painting
                if (target.closest('[data-belt]') || target.closest('[data-building]') || target.closest('[data-road]')) {
                  return;
                }
              }
              
              if (paintMode && isEditMode && !isDragging) {
                e.stopPropagation();
                const gapPx = parseFloat(String(layoutConfig.grid.gap).replace('px', '')) || 0;
                const totalRows = getTotalRows();
                
                // Use the grid element that triggered the event for accurate positioning
                const gridElement = e.currentTarget as HTMLElement;
                const gridRect = gridElement.getBoundingClientRect();
                
                const totalGapWidth = gapPx * (16 - 1);
                const totalGapHeight = gapPx * (totalRows - 1);
                const cellWidth = (gridRect.width - totalGapWidth) / 16;
                const cellHeight = (gridRect.height - totalGapHeight) / totalRows;
                
                // Calculate column and row from click position relative to grid element
                // Use the gridElement's getBoundingClientRect for consistency
                // getBoundingClientRect() automatically accounts for scroll
                const gridRelativeX = e.clientX - gridRect.left;
                const gridRelativeY = e.clientY - gridRect.top;
                
                const col = Math.max(1, Math.min(16, Math.floor((gridRelativeX + gapPx / 2) / (cellWidth + gapPx)) + 1));
                const row = Math.max(1, Math.min(totalRows, Math.floor((gridRelativeY + gapPx / 2) / (cellHeight + gapPx)) + 1));
                
                // Debug: Send click position to DebugPanel
                const clickInfo = {
                  clientX: e.clientX,
                  clientY: e.clientY,
                  gridRectLeft: gridRect.left,
                  gridRectTop: gridRect.top,
                  gridRelativeX,
                  gridRelativeY,
                  cellWidth,
                  cellHeight,
                  gapPx,
                  calculatedCol: col,
                  calculatedRow: row,
                  gridRectWidth: gridRect.width,
                  gridRectHeight: gridRect.height,
                  totalRows,
                };
                window.dispatchEvent(new CustomEvent('paintModeClick', { detail: clickInfo }));
                
                // Check if there's already a belt at this position
                const existingBelt = allBelts.find(belt => {
                  const beltCol = parseGridNotation(belt.gridColumn);
                  const beltRow = parseGridNotation(belt.gridRow);
                  return beltCol.start === col && beltRow.start === row;
                });
                
                // Check if there's a road at this position (roads are 2x2)
                const existingRoad = layoutConfig.roads?.find(road => {
                  const roadCol = parseGridNotation(road.gridColumn);
                  const roadRow = parseGridNotation(road.gridRow);
                  return roadCol.start <= col && roadCol.end > col && roadRow.start <= row && roadRow.end > row;
                });
                
                // Check if there's a building at this position
                const hasBuilding = 
                  (parseGridNotation(layoutConfig.house.gridColumn).start <= col && parseGridNotation(layoutConfig.house.gridColumn).end > col &&
                   parseGridNotation(layoutConfig.house.gridRow).start <= row && parseGridNotation(layoutConfig.house.gridRow).end > row) ||
                  (parseGridNotation(layoutConfig.warehouse.gridColumn).start <= col && parseGridNotation(layoutConfig.warehouse.gridColumn).end > col &&
                   parseGridNotation(layoutConfig.warehouse.gridRow).start <= row && parseGridNotation(layoutConfig.warehouse.gridRow).end > row) ||
                  (parseGridNotation(layoutConfig.market.gridColumn).start <= col && parseGridNotation(layoutConfig.market.gridColumn).end > col &&
                   parseGridNotation(layoutConfig.market.gridRow).start <= row && parseGridNotation(layoutConfig.market.gridRow).end > row) ||
                  (parseGridNotation(layoutConfig.boxes.gridColumn).start <= col && parseGridNotation(layoutConfig.boxes.gridColumn).end > col &&
                   parseGridNotation(layoutConfig.boxes.gridRow).start <= row && parseGridNotation(layoutConfig.boxes.gridRow).end > row);
                
                // Handle painting based on object type
                if (paintOptions.objectType === 'belt') {
                  // Don't add belt if there's already a road or belt here
                  if (!existingRoad && !existingBelt && !hasBuilding) {
                    // Use paint options for direction and type
                    addBeltAtPosition(col, row, paintOptions.direction, paintOptions.type);
                  } else if (existingBelt && existingBelt.id.startsWith('belt-') && !existingBelt.id.startsWith('belt-auto-')) {
                    // Remove belt if clicking on an existing manual belt
                    removeBelt(existingBelt.id);
                  }
                } else if (paintOptions.objectType === 'road') {
                  // For roads, check if the 2x2 area is available
                  // Check if there's a road that overlaps with this 2x2 area
                  const roadAreaCol = { start: col, end: col + 2 };
                  const roadAreaRow = { start: row, end: row + 2 };
                  
                  const overlappingRoad = layoutConfig.roads?.find(road => {
                    const roadCol = parseGridNotation(road.gridColumn);
                    const roadRow = parseGridNotation(road.gridRow);
                    return !(
                      roadAreaCol.end <= roadCol.start ||
                      roadAreaCol.start >= roadCol.end ||
                      roadAreaRow.end <= roadRow.start ||
                      roadAreaRow.start >= roadRow.end
                    );
                  });
                  
                  // Check if there's a belt in the 2x2 area
                  const hasBeltInArea = allBelts.some(belt => {
                    const beltCol = parseGridNotation(belt.gridColumn);
                    const beltRow = parseGridNotation(belt.gridRow);
                    return beltCol.start >= roadAreaCol.start && beltCol.end <= roadAreaCol.end &&
                           beltRow.start >= roadAreaRow.start && beltRow.end <= roadAreaRow.end;
                  });
                  
                  // Roads can be placed behind buildings, so we don't check for building collisions
                  if (!overlappingRoad && !hasBeltInArea) {
                    // Use paint options for direction and type
                    addRoadAtPosition(col, row, paintOptions.direction, paintOptions.type);
                  } else if (overlappingRoad) {
                    // Remove road if clicking on an existing road
                    removeRoad(overlappingRoad.id);
                  }
                }
              } else if (isEditMode && !isDragging && selectedObject) {
                // Deselect when clicking on empty cell (not in paint mode)
                e.stopPropagation();
                setSelectedObject(null);
              }
            }}
          >
            {/* Hover cell highlight - Belt preview */}
            {hoveredCell && paintMode && isEditMode && paintOptions.objectType === 'belt' && (
              <div
                className="absolute pointer-events-none z-10 w-full h-full flex items-center justify-center"
                style={{
                  gridColumn: `${hoveredCell.col} / ${hoveredCell.col + 1}`,
                  gridRow: `${hoveredCell.row} / ${hoveredCell.row + 1}`,
                  opacity: 0.7,
                }}
              >
                <img
                  src={getBeltPreviewImage(paintOptions.type, paintOptions.direction)}
                  alt="Belt preview"
                  className="w-full h-full object-cover"
                  style={{
                    transform: getBeltPreviewTransform(paintOptions.type, paintOptions.direction),
                  }}
                />
              </div>
            )}
            
            {/* Hover cell highlight - Road preview */}
            {hoveredCell && paintMode && isEditMode && paintOptions.objectType === 'road' && (
              <div
                className="absolute pointer-events-none z-10 border-2 border-red-500 bg-red-500/20"
                style={{
                  gridColumn: `${hoveredCell.col} / ${hoveredCell.col + 2}`,
                  gridRow: `${hoveredCell.row} / ${hoveredCell.row + 2}`,
                }}
              />
            )}
            
            {/* Building placement preview */}
            {isEditMode && isDragging && draggedBuilding && tempPosition && (
              (() => {
                const key = draggedBuilding as 'warehouse' | 'market' | 'house' | 'boxes';
                const conf = layoutConfig[key];
                const colSpan = parseGridNotation(conf.gridColumn);
                const rowSpan = parseGridNotation(conf.gridRow);
                const width = colSpan.end - colSpan.start;
                const height = rowSpan.end - rowSpan.start;
                const startCol = tempPosition.col;
                const startRow = tempPosition.row;
                return (
                  <div
                    key="preview-building"
                    style={{
                      gridColumn: `${startCol} / ${startCol + width}`,
                      gridRow: `${startRow} / ${startRow + height}`,
                    }}
                    className="pointer-events-none border-2 border-dashed border-yellow-400/80 bg-yellow-200/20 rounded-md"
                  />
                );
              })()
            )}

            {/* Belt placement preview */}
            {isEditMode && isDragging && draggedBelt && beltTempPosition && (
              <div
                key="preview-belt"
                style={{
                  gridColumn: `${beltTempPosition.col} / ${beltTempPosition.col + 1}`,
                  gridRow: `${beltTempPosition.row} / ${beltTempPosition.row + 1}`,
                }}
                className="pointer-events-none border-2 border-dashed border-cyan-400/80 bg-cyan-200/20 rounded-md z-30"
              />
            )}

            {/* HOUSE - Top Center above everything */}
            {!hideBuildings && (
            <div
              className={`flex items-center justify-center relative group z-10 ${isEditMode ? 'ring-2 ring-purple-500 ring-offset-2' : ''} ${
                isDragging && draggedBuilding === 'house' ? 'ring-4 ring-purple-600 ring-offset-4' : ''
              } ${hasCollision ? 'ring-4 ring-red-500 ring-offset-4 animate-pulse' : ''} ${
                selectedObject?.type === 'building' && selectedObject?.id === 'house' ? 'ring-4 ring-yellow-400 ring-offset-4' : ''
              }`}
              style={{
                gridColumn: layoutConfig.house.gridColumn,
                gridRow: layoutConfig.house.gridRow,
              }}
              data-building="house"
            >
              <button
                onMouseDown={(e) => isEditMode && handleBuildingMouseDown(e, 'house')}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isEditMode) {
                    handleBuildingClick('house');
                  } else {
                    setHouseOpen(true);
                  }
                }}
                className={`w-full h-full flex items-center justify-center transition-all ${
                  isEditMode ? 'cursor-move hover:shadow-2xl' : 'hover:scale-105'
                } ${isDragging && draggedBuilding === 'house' ? 'opacity-50 scale-105' : ''}`}
              >
                <div className="flex flex-col items-center justify-center w-full h-full">
                  <img
                    src={getBuildingImage('house', 1, 'A')}
                    alt="House"
                    className="w-full h-full object-contain pointer-events-none"
                  />
                  {isEditMode && (
                    <>
                      <div className="absolute top-1 right-1 bg-purple-600 text-white text-xs px-2 py-1 rounded font-mono">
                        {layoutConfig.house.gridColumn} / {layoutConfig.house.gridRow}
                      </div>
                    </>
                  )}
                </div>
              </button>

              {/* Edit Controls when in Edit Mode */}
              {isEditMode && (
                <div className="absolute inset-0 pointer-events-none">
                  {/* Resize handles */}
                  <div 
                    className="resize-handle absolute top-0 left-0 w-4 h-4 bg-purple-600 rounded-full cursor-nw-resize pointer-events-auto -translate-x-1/2 -translate-y-1/2 hover:scale-150 transition-transform z-50"
                    onMouseDown={(e) => handleResizeStart(e, 'house', 'nw')}
                  />
                  <div 
                    className="resize-handle absolute top-0 right-0 w-4 h-4 bg-purple-600 rounded-full cursor-ne-resize pointer-events-auto translate-x-1/2 -translate-y-1/2 hover:scale-150 transition-transform z-50"
                    onMouseDown={(e) => handleResizeStart(e, 'house', 'ne')}
                  />
                  <div 
                    className="resize-handle absolute bottom-0 left-0 w-4 h-4 bg-purple-600 rounded-full cursor-sw-resize pointer-events-auto -translate-x-1/2 translate-y-1/2 hover:scale-150 transition-transform z-50"
                    onMouseDown={(e) => handleResizeStart(e, 'house', 'sw')}
                  />
                  <div 
                    className="resize-handle absolute bottom-0 right-0 w-4 h-4 bg-purple-600 rounded-full cursor-se-resize pointer-events-auto translate-x-1/2 translate-y-1/2 hover:scale-150 transition-transform z-50"
                    onMouseDown={(e) => handleResizeStart(e, 'house', 'se')}
                  />
                  {/* Edge resize handles (vertical only) */}
                  <div 
                    className="resize-handle absolute top-0 left-1/2 w-4 h-4 bg-purple-600 rounded-full cursor-n-resize pointer-events-auto -translate-x-1/2 -translate-y-1/2 hover:scale-150 transition-transform z-50"
                    onMouseDown={(e) => handleResizeStart(e, 'house', 'n')}
                  />
                  <div 
                    className="resize-handle absolute bottom-0 left-1/2 w-4 h-4 bg-purple-600 rounded-full cursor-s-resize pointer-events-auto -translate-x-1/2 translate-y-1/2 hover:scale-150 transition-transform z-50"
                    onMouseDown={(e) => handleResizeStart(e, 'house', 's')}
                  />
                  <div 
                    className="resize-handle absolute top-1/2 left-0 w-4 h-4 bg-purple-600 rounded-full cursor-w-resize pointer-events-auto -translate-x-1/2 -translate-y-1/2 hover:scale-150 transition-transform z-50"
                    onMouseDown={(e) => handleResizeStart(e, 'house', 'w')}
                  />
                  <div 
                    className="resize-handle absolute top-1/2 right-0 w-4 h-4 bg-purple-600 rounded-full cursor-e-resize pointer-events-auto translate-x-1/2 -translate-y-1/2 hover:scale-150 transition-transform z-50"
                    onMouseDown={(e) => handleResizeStart(e, 'house', 'e')}
                  />
                  
                </div>
              )}
            </div>
            )}
            
            {/* WAREHOUSE - Top Left: Columns 1-6, Rows 1-3 */}
            {!hideBuildings && (
            <div 
              className={`flex items-center justify-center relative group z-10 ${isEditMode ? 'ring-2 ring-blue-500 ring-offset-2' : ''} ${
                isDragging && draggedBuilding === 'warehouse' ? 'ring-4 ring-blue-600 ring-offset-4' : ''
              } ${hasCollision ? 'ring-4 ring-red-500 ring-offset-4 animate-pulse' : ''} ${
                selectedObject?.type === 'building' && selectedObject?.id === 'warehouse' ? 'ring-4 ring-yellow-400 ring-offset-4' : ''
              }`}
              style={{ 
                gridColumn: layoutConfig.warehouse.gridColumn,
                gridRow: layoutConfig.warehouse.gridRow
              }}
              data-building="warehouse"
            >
              <button
                onMouseDown={(e) => isEditMode && handleBuildingMouseDown(e, 'warehouse')}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isEditMode) {
                    handleBuildingClick('warehouse');
                  } else {
                    setWarehouseOpen(true);
                  }
                }}
                className={`w-full h-full flex items-center justify-center transition-all relative ${
                  isEditMode ? 'cursor-move hover:shadow-2xl' : 'hover:scale-105'
                } ${isDragging && draggedBuilding === 'warehouse' ? 'opacity-50 scale-105' : ''}`}
              >
                <div className="flex flex-col items-center">
                  <div className="absolute -top-2.5 -left-2.5 bg-blue-600 text-white rounded-full w-5 h-5 md:w-6 md:h-6 flex items-center justify-center text-[10px] md:text-xs font-bold shadow-md z-50">
                    {warehouseLevel}
                  </div>
                  {warehouseDisplay && warehouseDisplay.type === 'image' ? (
                    <img 
                      src={warehouseDisplay.src} 
                      alt="Warehouse" 
                      className="w-full h-full object-contain pointer-events-none"
                    />
                  ) : (
                    <div className="text-4xl md:text-5xl pointer-events-none">🏚️</div>
                  )}
                  {isEditMode && (
                    <>
                      <div className="absolute top-1 right-1 bg-blue-600 text-white text-xs px-2 py-1 rounded font-mono">
                        {layoutConfig.warehouse.gridColumn} / {layoutConfig.warehouse.gridRow}
                      </div>
                    </>
                  )}
                </div>
              </button>
              
              {/* Edit Controls when in Edit Mode */}
              {isEditMode && (
                <div className="absolute inset-0 pointer-events-none">
                  {/* Resize handles in corners */}
                  <div 
                    className="resize-handle absolute top-0 left-0 w-4 h-4 bg-blue-600 rounded-full cursor-nw-resize pointer-events-auto -translate-x-1/2 -translate-y-1/2 hover:scale-150 transition-transform z-50"
                    onMouseDown={(e) => handleResizeStart(e, 'warehouse', 'nw')}
                  />
                  <div 
                    className="resize-handle absolute top-0 right-0 w-4 h-4 bg-blue-600 rounded-full cursor-ne-resize pointer-events-auto translate-x-1/2 -translate-y-1/2 hover:scale-150 transition-transform z-50"
                    onMouseDown={(e) => handleResizeStart(e, 'warehouse', 'ne')}
                  />
                  <div 
                    className="resize-handle absolute bottom-0 left-0 w-4 h-4 bg-blue-600 rounded-full cursor-sw-resize pointer-events-auto -translate-x-1/2 translate-y-1/2 hover:scale-150 transition-transform z-50"
                    onMouseDown={(e) => handleResizeStart(e, 'warehouse', 'sw')}
                  />
                  <div 
                    className="resize-handle absolute bottom-0 right-0 w-4 h-4 bg-blue-600 rounded-full cursor-se-resize pointer-events-auto translate-x-1/2 translate-y-1/2 hover:scale-150 transition-transform z-50"
                    onMouseDown={(e) => handleResizeStart(e, 'warehouse', 'se')}
                  />
                  
                  {/* Edge resize handles */}
                  <div 
                    className="resize-handle absolute top-0 left-1/2 w-4 h-4 bg-blue-600 rounded-full cursor-n-resize pointer-events-auto -translate-x-1/2 -translate-y-1/2 hover:scale-150 transition-transform z-50"
                    onMouseDown={(e) => handleResizeStart(e, 'warehouse', 'n')}
                  />
                  <div 
                    className="resize-handle absolute bottom-0 left-1/2 w-4 h-4 bg-blue-600 rounded-full cursor-s-resize pointer-events-auto -translate-x-1/2 translate-y-1/2 hover:scale-150 transition-transform z-50"
                    onMouseDown={(e) => handleResizeStart(e, 'warehouse', 's')}
                  />
                  <div 
                    className="resize-handle absolute left-0 top-1/2 w-4 h-4 bg-blue-600 rounded-full cursor-w-resize pointer-events-auto -translate-x-1/2 -translate-y-1/2 hover:scale-150 transition-transform z-50"
                    onMouseDown={(e) => handleResizeStart(e, 'warehouse', 'w')}
                  />
                  <div 
                    className="resize-handle absolute right-0 top-1/2 w-4 h-4 bg-blue-600 rounded-full cursor-e-resize pointer-events-auto translate-x-1/2 -translate-y-1/2 hover:scale-150 transition-transform z-50"
                    onMouseDown={(e) => handleResizeStart(e, 'warehouse', 'e')}
                  />
                  
                </div>
              )}
            </div>
            )}

            {/* MARKET - Top Right: Columns 20-25, Rows 1-3 */}
            {!hideBuildings && (
            <div 
              className={`flex items-center justify-center relative group z-10 ${isEditMode ? 'ring-2 ring-green-500 ring-offset-2' : ''} ${
                isDragging && draggedBuilding === 'market' ? 'ring-4 ring-green-600 ring-offset-4' : ''
              } ${hasCollision ? 'ring-4 ring-red-500 ring-offset-4 animate-pulse' : ''} ${
                selectedObject?.type === 'building' && selectedObject?.id === 'market' ? 'ring-4 ring-yellow-400 ring-offset-4' : ''
              }`}
              style={{ 
                gridColumn: layoutConfig.market.gridColumn,
                gridRow: layoutConfig.market.gridRow
              }}
              data-building="market"
            >
              <button
                onMouseDown={(e) => isEditMode && handleBuildingMouseDown(e, 'market')}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isEditMode) {
                    handleBuildingClick('market');
                  } else {
                    setMarketOpen(true);
                  }
                }}
                className={`w-full h-full flex items-center justify-center transition-all relative ${
                  isEditMode ? 'cursor-move hover:shadow-2xl' : 'hover:scale-105'
                } ${isDragging && draggedBuilding === 'market' ? 'opacity-50 scale-105' : ''}`}
              >
                <div className="flex flex-col items-center">
                  <div className="absolute -top-2.5 -left-2.5 bg-green-600 text-white rounded-full w-5 h-5 md:w-6 md:h-6 flex items-center justify-center text-[10px] md:text-xs font-bold shadow-md z-50">
                    {marketLevel}
                  </div>
                  {marketDisplay && (
                    <img 
                      src={marketDisplay.src} 
                      alt="Market" 
                      className="w-full h-full object-contain pointer-events-none"
                    />
                  )}
                  {isEditMode && (
                    <>
                      <div className="absolute top-1 right-1 bg-green-600 text-white text-xs px-2 py-1 rounded font-mono">
                        {layoutConfig.market.gridColumn} / {layoutConfig.market.gridRow}
                      </div>
                    </>
                  )}
                </div>
              </button>
              
              {/* Edit Controls when in Edit Mode */}
              {isEditMode && (
                <div className="absolute inset-0 pointer-events-none">
                  {/* Resize handles in corners */}
                  <div 
                    className="resize-handle absolute top-0 left-0 w-4 h-4 bg-green-600 rounded-full cursor-nw-resize pointer-events-auto -translate-x-1/2 -translate-y-1/2 hover:scale-150 transition-transform z-50"
                    onMouseDown={(e) => handleResizeStart(e, 'market', 'nw')}
                  />
                  <div 
                    className="resize-handle absolute top-0 right-0 w-4 h-4 bg-green-600 rounded-full cursor-ne-resize pointer-events-auto translate-x-1/2 -translate-y-1/2 hover:scale-150 transition-transform z-50"
                    onMouseDown={(e) => handleResizeStart(e, 'market', 'ne')}
                  />
                  <div 
                    className="resize-handle absolute bottom-0 left-0 w-4 h-4 bg-green-600 rounded-full cursor-sw-resize pointer-events-auto -translate-x-1/2 translate-y-1/2 hover:scale-150 transition-transform z-50"
                    onMouseDown={(e) => handleResizeStart(e, 'market', 'sw')}
                  />
                  <div 
                    className="resize-handle absolute bottom-0 right-0 w-4 h-4 bg-green-600 rounded-full cursor-se-resize pointer-events-auto translate-x-1/2 translate-y-1/2 hover:scale-150 transition-transform z-50"
                    onMouseDown={(e) => handleResizeStart(e, 'market', 'se')}
                  />
                  
                  {/* Edge resize handles */}
                  <div 
                    className="resize-handle absolute top-0 left-1/2 w-4 h-4 bg-green-600 rounded-full cursor-n-resize pointer-events-auto -translate-x-1/2 -translate-y-1/2 hover:scale-150 transition-transform z-50"
                    onMouseDown={(e) => handleResizeStart(e, 'market', 'n')}
                  />
                  <div 
                    className="resize-handle absolute bottom-0 left-1/2 w-4 h-4 bg-green-600 rounded-full cursor-s-resize pointer-events-auto -translate-x-1/2 translate-y-1/2 hover:scale-150 transition-transform z-50"
                    onMouseDown={(e) => handleResizeStart(e, 'market', 's')}
                  />
                  <div 
                    className="resize-handle absolute left-0 top-1/2 w-4 h-4 bg-green-600 rounded-full cursor-w-resize pointer-events-auto -translate-x-1/2 -translate-y-1/2 hover:scale-150 transition-transform z-50"
                    onMouseDown={(e) => handleResizeStart(e, 'market', 'w')}
                  />
                  <div 
                    className="resize-handle absolute right-0 top-1/2 w-4 h-4 bg-green-600 rounded-full cursor-e-resize pointer-events-auto translate-x-1/2 -translate-y-1/2 hover:scale-150 transition-transform z-50"
                    onMouseDown={(e) => handleResizeStart(e, 'market', 'e')}
                  />
                </div>
              )}
            </div>
            )}

            {/* BOXES - Can be placed inside warehouse */}
            {!hideBuildings && (
            <div 
              className={`flex items-center justify-center relative group z-20 ${isEditMode ? 'ring-2 ring-amber-500 ring-offset-2' : ''} ${
                isDragging && draggedBuilding === 'boxes' ? 'ring-4 ring-amber-600 ring-offset-4' : ''
              } ${selectedObject?.type === 'building' && selectedObject?.id === 'boxes' ? 'ring-4 ring-yellow-400 ring-offset-4' : ''}`}
              style={{ 
                gridColumn: layoutConfig.boxes.gridColumn,
                gridRow: layoutConfig.boxes.gridRow
              }}
              data-building="boxes"
            >
              <div
                onMouseDown={(e) => isEditMode && handleBuildingMouseDown(e, 'boxes')}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isEditMode) {
                    handleBuildingClick('boxes');
                  }
                }}
                className={`w-full h-full flex items-center justify-center transition-all ${
                  isEditMode ? 'cursor-move' : ''
                } ${isDragging && draggedBuilding === 'boxes' ? 'opacity-50 scale-105' : ''}`}
              >
                {getBoxImage() && (
                  <img
                    src={getBoxImage()!} 
                    alt="Storage boxes" 
                    className="w-full h-full object-contain pointer-events-none"
                  />
                )}
                {isEditMode && (
                  <>
                    <div className="absolute top-1 right-1 bg-amber-600 text-white text-xs px-2 py-1 rounded font-mono">
                      {layoutConfig.boxes.gridColumn} / {layoutConfig.boxes.gridRow}
                    </div>
                  </>
                )}
              </div>

              {/* Edit Controls */}
              {isEditMode && (
                <div className="absolute inset-0 pointer-events-none">
                  <div 
                    className="resize-handle absolute top-0 left-0 w-4 h-4 bg-amber-600 rounded-full cursor-nw-resize pointer-events-auto -translate-x-1/2 -translate-y-1/2 hover:scale-150 transition-transform z-50"
                    onMouseDown={(e) => handleResizeStart(e, 'boxes', 'nw')}
                  />
                  <div 
                    className="resize-handle absolute top-0 right-0 w-4 h-4 bg-amber-600 rounded-full cursor-ne-resize pointer-events-auto translate-x-1/2 -translate-y-1/2 hover:scale-150 transition-transform z-50"
                    onMouseDown={(e) => handleResizeStart(e, 'boxes', 'ne')}
                  />
                  <div 
                    className="resize-handle absolute bottom-0 left-0 w-4 h-4 bg-amber-600 rounded-full cursor-sw-resize pointer-events-auto -translate-x-1/2 translate-y-1/2 hover:scale-150 transition-transform z-50"
                    onMouseDown={(e) => handleResizeStart(e, 'boxes', 'sw')}
                  />
                  <div 
                    className="resize-handle absolute bottom-0 right-0 w-4 h-4 bg-amber-600 rounded-full cursor-se-resize pointer-events-auto translate-x-1/2 translate-y-1/2 hover:scale-150 transition-transform z-50"
                    onMouseDown={(e) => handleResizeStart(e, 'boxes', 'se')}
                  />
                  {/* Edge resize handles (vertical only) */}
                  <div 
                    className="resize-handle absolute top-0 left-1/2 w-4 h-4 bg-amber-600 rounded-full cursor-n-resize pointer-events-auto -translate-x-1/2 -translate-y-1/2 hover:scale-150 transition-transform z-50"
                    onMouseDown={(e) => handleResizeStart(e, 'boxes', 'n')}
                  />
                  <div 
                    className="resize-handle absolute bottom-0 left-1/2 w-4 h-4 bg-amber-600 rounded-full cursor-s-resize pointer-events-auto -translate-x-1/2 translate-y-1/2 hover:scale-150 transition-transform z-50"
                    onMouseDown={(e) => handleResizeStart(e, 'boxes', 's')}
                  />
                </div>
              )}
            </div>
            )}

            {/* ROADS - Render first so they appear behind buildings and belts (z-0) */}
            {!hideRoads && layoutConfig.roads?.map((road, idx) => {
              const isRoadDragging = draggedRoad === road.id;
              
              return (
                <Road
                  key={road.id}
                  road={road}
                  idx={idx}
                  isEditMode={isEditMode}
                  isDragging={isRoadDragging}
                  isSelected={selectedObject?.type === 'road' && selectedObject?.id === road.id}
                  tempPosition={isRoadDragging ? roadTempPosition : null}
                  dragOffset={isRoadDragging ? dragOffset : null}
                  roadDragOffset={isRoadDragging ? roadDragOffset : null}
                  onMouseDown={(e) => isEditMode && handleRoadMouseDown(e, road.id)}
                  onClick={() => handleRoadClick(road.id)}
                  onRemove={isEditMode ? () => removeRoad(road.id) : undefined}
                  onRotate={isEditMode ? () => rotateSelected() : undefined}
                  onUpdateColumn={(value) => updateRoad(road.id, { gridColumn: value })}
                  onUpdateRow={(value) => updateRoad(road.id, { gridRow: value })}
                  onTogglePointA={isEditMode ? () => toggleRoadPointA(road.id) : undefined}
                  onToggleTransport={isEditMode ? () => toggleRoadTransport(road.id) : undefined}
                  onTogglePointB={isEditMode ? () => toggleRoadPointB(road.id) : undefined}
                />
              );
            })}

            {/* CONVEYOR BELTS - Auto-generated corral belts + manual belts - Render first so they appear behind buildings */}
            {!hideBelts && allBelts.map((belt, idx) => {
              const isBeltDragging = draggedBelt === belt.id;
              // Auto-generated belts (belt-auto-*) are not editable
              const isAutoBelt = belt.id.startsWith('belt-auto-');
              const isManualBelt = !isAutoBelt && !belt.id.startsWith('belt-center-') && !belt.id.startsWith('belt-left-') && !belt.id.startsWith('belt-right-');
              
              return (
                <ConveyorBelt
                  key={belt.id}
                  belt={belt}
                  idx={idx}
                  isEditMode={isEditMode}
                  isDragging={isBeltDragging}
                  isSelected={selectedObject?.type === 'belt' && selectedObject?.id === belt.id}
                  tempPosition={beltTempPosition}
                  dragOffset={isBeltDragging ? dragOffset : null}
                  beltDragOffset={isBeltDragging ? beltDragOffset : null}
                  onMouseDown={(e) => isEditMode && isManualBelt && handleBeltMouseDown(e, belt.id)}
                  onClick={() => isEditMode && handleBeltClick(belt.id)}
                  onRemove={isManualBelt ? () => removeBelt(belt.id) : undefined}
                  onRotate={isManualBelt ? () => rotateSelected() : undefined}
                  onUpdateColumn={(value) => isManualBelt && updateBelt(belt.id, { gridColumn: value })}
                  onUpdateRow={(value) => isManualBelt && updateBelt(belt.id, { gridRow: value })}
                  onToggleOutput={() => {
                    // When toggling output manually, we need to find the slot position
                    // For now, we'll let the user specify it, but for auto-generated belts it's already set
                    // Manual belts won't have a slotPosition unless explicitly set
                    toggleBeltOutput(belt.id, belt.slotPosition);
                  }}
                  onToggleDestiny={() => toggleBeltDestiny(belt.id)}
                  onToggleTransport={() => toggleBeltTransport(belt.id)}
                />
              );
            })}

            {/* EGGS */}
            {eggs.map(egg => {
              const currentBelt = allBelts.find(b => b.id === egg.currentBeltId);
              if (!currentBelt) return null;
              
              return (
                <Egg
                  key={egg.id}
                  id={egg.id}
                  gridColumn={currentBelt.gridColumn}
                  gridRow={currentBelt.gridRow}
                  progress={egg.progress}
                  direction={currentBelt.direction}
                  beltType={currentBelt.type}
                  entryDirection={egg.entryDirection}
                />
              );
            })}

            {/* VEHICLES */}
            {vehicles.map(vehicle => {
              const currentRoad = allRoads.find(r => r.id === vehicle.currentRoadId);
              if (!currentRoad) return null;
              
              return (
                <Vehicle
                  key={vehicle.id}
                  id={vehicle.id}
                  gridColumn={currentRoad.gridColumn}
                  gridRow={currentRoad.gridRow}
                  progress={vehicle.progress}
                  direction={currentRoad.direction}
                  isLoaded={vehicle.isLoaded}
                  reverseDirection={vehicle.reverseDirection}
                  goingToB={vehicle.goingToB}
                  cellSize={cellSize}
                />
              );
            })}

            {/* LEFT CORRALS */}
            {!hideBuildings && Array.from({ length: Math.ceil(TOTAL_SLOTS / 2) }).map((_, index) => {
              const position = index * 2;
              const building = getBuildingAtPosition(position);
              const slotRowSpan = Math.max(1, Math.ceil((layoutConfig.leftCorrals.rowSpan ?? 1) * 1.3));
              // Add 1 cell of vertical space between each slot
              const baseRow = (layoutConfig.leftCorrals.startRow ?? 1) + index * (slotRowSpan + 1);
              
              return (
                <div 
                  key={`left-${position}`}
                  className="relative group overflow-visible"
                  style={{ 
                    gridColumn: layoutConfig.leftCorrals.gridColumn,
                    gridRow: `${baseRow} / ${baseRow + slotRowSpan}`,
                  }}
                  data-slot={`left-${position}`}
                >
                  <BuildingSlot
                    position={position}
                    building={building ? {
                      ...building,
                      selected_skin: building.selected_skin || null
                    } : undefined}
                    onBuyClick={handleBuyClick}
                    onBuildingClick={building ? () => handleBuildingClickAction(building.id) : undefined}
                    isLeftColumn={true}
                    isEditMode={isEditMode}
                    editControls={isEditMode && index === 0 ? (
                      <div className="bg-background/95 backdrop-blur-sm border-2 border-yellow-500 rounded-lg p-2 space-y-1 z-[100] relative">
                        <div className="text-xs font-bold text-yellow-700 mb-1">Corrales Izquierdos</div>
                        <div className="flex gap-2 text-xs">
                          <label className="flex-1">
                            <span className="block text-muted-foreground">Columns:</span>
                            <input
                              type="text"
                              value={layoutConfig.leftCorrals.gridColumn}
                              onChange={(e) => updateCorralColumn('left', { gridColumn: e.target.value })}
                              className="w-full px-2 py-1 border rounded bg-background"
                              placeholder="1 / 7"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </label>
                          <label className="flex-1">
                            <span className="block text-muted-foreground">Start Row:</span>
                            <input
                              type="number"
                              value={layoutConfig.leftCorrals.startRow}
                              onChange={(e) => updateCorralColumn('left', { startRow: parseInt(e.target.value) || 4 })}
                              className="w-full px-2 py-1 border rounded bg-background"
                              placeholder="4"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </label>
                          <label className="flex-1">
                            <span className="block text-muted-foreground">Row span (alto slot):</span>
                            <input
                              type="number"
                              min={1}
                              value={layoutConfig.leftCorrals.rowSpan ?? 1}
                              onChange={(e) => updateCorralColumn('left', { rowSpan: Math.max(1, parseInt(e.target.value) || 1) })}
                              className="w-full px-2 py-1 border rounded bg-background"
                              placeholder="1"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </label>
                        </div>
                      </div>
                    ) : undefined}
                  />
                </div>
              );
            })}

            {/* RIGHT CORRALS */}
            {!hideBuildings && Array.from({ length: Math.ceil(TOTAL_SLOTS / 2) }).map((_, index) => {
              const position = index * 2 + 1;
              const building = getBuildingAtPosition(position);
              const slotRowSpan = Math.max(1, Math.ceil((layoutConfig.rightCorrals.rowSpan ?? 1) * 1.3));
              // Add 1 cell of vertical space between each slot
              const baseRow = (layoutConfig.rightCorrals.startRow ?? 1) + index * (slotRowSpan + 1);
              
              return (
                <div 
                  key={`right-${position}`}
                  className="relative group overflow-visible"
                  style={{ 
                    gridColumn: layoutConfig.rightCorrals.gridColumn,
                    gridRow: `${baseRow} / ${baseRow + slotRowSpan}`,
                  }}
                  data-slot={`right-${position}`}
                >
                  <BuildingSlot
                    position={position}
                    building={building ? {
                      ...building,
                      selected_skin: building.selected_skin || null
                    } : undefined}
                    onBuyClick={handleBuyClick}
                    onBuildingClick={building ? () => handleBuildingClickAction(building.id) : undefined}
                    isLeftColumn={false}
                    isEditMode={isEditMode}
                    editControls={isEditMode && index === 0 ? (
                      <div className="bg-background/95 backdrop-blur-sm border-2 border-orange-500 rounded-lg p-2 space-y-1 z-[100] relative">
                        <div className="text-xs font-bold text-orange-700 mb-1">Corrales Derechos</div>
                        <div className="flex gap-2 text-xs">
                          <label className="flex-1">
                            <span className="block text-muted-foreground">Columns:</span>
                            <input
                              type="text"
                              value={layoutConfig.rightCorrals.gridColumn}
                              onChange={(e) => updateCorralColumn('right', { gridColumn: e.target.value })}
                              className="w-full px-2 py-1 border rounded bg-background"
                              placeholder="20 / 26"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </label>
                          <label className="flex-1">
                            <span className="block text-muted-foreground">Start Row:</span>
                            <input
                              type="number"
                              value={layoutConfig.rightCorrals.startRow}
                              onChange={(e) => updateCorralColumn('right', { startRow: parseInt(e.target.value) || 4 })}
                              className="w-full px-2 py-1 border rounded bg-background"
                              placeholder="4"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </label>
                          <label className="flex-1">
                            <span className="block text-muted-foreground">Row span (alto slot):</span>
                            <input
                              type="number"
                              min={1}
                              value={layoutConfig.rightCorrals.rowSpan ?? 1}
                              onChange={(e) => updateCorralColumn('right', { rowSpan: Math.max(1, parseInt(e.target.value) || 1) })}
                              className="w-full px-2 py-1 border rounded bg-background"
                              placeholder="1"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </label>
                        </div>
                      </div>
                    ) : undefined}
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
      <HouseDialog open={houseOpen} onOpenChange={setHouseOpen} userId={userId || undefined} />
      <CorralDialog 
        open={corralDialogOpen} 
        onOpenChange={setCorralDialogOpen} 
        userId={userId || undefined}
        buildingId={selectedBuildingId}
      />
      
      <SelectionToolbar
        selectedObject={selectedObject}
        onRotate={rotateSelected}
        onDuplicate={duplicateSelected}
        onDelete={deleteSelected}
        onDeselect={() => setSelectedObject(null)}
      />
      
      <LayoutEditor />
    </div>
  );
};

export default Home;
