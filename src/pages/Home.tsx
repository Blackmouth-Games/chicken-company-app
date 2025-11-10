import { useState, useEffect, useRef } from "react";
import bgFarm from "@/assets/bg-farm-grass.png";
import defaultAvatar from "@/assets/default-avatar.png";
import box1Image from "@/assets/box_1.png";
import box2Image from "@/assets/box_2.png";
import box3Image from "@/assets/box_3.png";
import { getTelegramUser } from "@/lib/telegram";
import { getBuildingImage, type BuildingType } from "@/lib/buildingImages";
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
import { SelectionToolbar } from "@/components/SelectionToolbar";
import LayoutEditor from "@/components/LayoutEditor";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAudio } from "@/contexts/AudioContext";
import { useLayoutEditor } from "@/hooks/useLayoutEditor";

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
  const [warehouseCapacity, setWarehouseCapacity] = useState({ current: 0, max: 100 });

  // Use layout editor hook
  const {
    layoutConfig,
    isEditMode,
    isDragging,
    draggedBuilding,
    draggedBelt,
    resizing,
    tempPosition,
    beltTempPosition,
    hasCollision,
    gridRef,
    selectedObject,
    getTotalRows,
    handleBuildingMouseDown,
    handleBuildingClick,
    handleBeltMouseDown,
    handleBeltClick,
    handleResizeStart,
    updateBuildingLayout,
    updateCorralColumn,
    addBelt,
    removeBelt,
    updateBelt,
    setLayoutConfig,
    addBeltAtPosition,
    deleteSelected,
    duplicateSelected,
    rotateSelected,
    setSelectedObject,
  } = useLayoutEditor(20);

  // Dynamic slots: always even number, min 6, max based on buildings + min 4-6 empty
  const occupiedSlots = buildings.length;
  const MIN_EMPTY_SLOTS = 4;
  const MAX_EMPTY_SLOTS = 6;
  // Calculate total to always be even
  let totalSlots = occupiedSlots + MIN_EMPTY_SLOTS;
  if (totalSlots % 2 !== 0) totalSlots++; // Make it even
  if (totalSlots < 6) totalSlots = 6; // Minimum 6 slots
  const TOTAL_SLOTS = totalSlots;

  // Responsive cell size based on container width and gap
  const [cellSize, setCellSize] = useState<number>(20);
  useEffect(() => {
    const compute = () => {
      const el = gridRef.current as HTMLDivElement | null;
      if (!el) return;

      const columns = 30;
      const gapVal = parseFloat(String(layoutConfig.grid.gap).replace('px', '')) || 0;
      const rect = el.getBoundingClientRect();
      // Usar el ancho del viewport para garantizar 30 columnas visibles
      const width = Math.max(rect.width, window.innerWidth);

      // Escala 100% por ancho: 30 columnas siempre visibles y celdas 1:1
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
  
  // State for hiding buildings and corrals
  const [hideBuildings, setHideBuildings] = useState(false);
  
  // State for paint mode
  const [paintMode, setPaintMode] = useState(false);
  
  useEffect(() => {
    const handleHideBuildingsChange = (event: CustomEvent<boolean>) => {
      setHideBuildings(event.detail);
    };

    window.addEventListener('hideBuildingsChange', handleHideBuildingsChange as EventListener);
    return () => {
      window.removeEventListener('hideBuildingsChange', handleHideBuildingsChange as EventListener);
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

  // Load warehouse capacity (simulated for now)
  useEffect(() => {
    // TODO: Load from database
    setWarehouseCapacity({ current: 67, max: 100 }); // Example: 67%
  }, []);

  // Calculate which box image to show based on capacity percentage
  const getBoxImage = () => {
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
      loadBuildings(userId).then(() => {
        // Force re-render to update belts after purchase
        // The belts will be automatically regenerated based on TOTAL_SLOTS
        // which is calculated from buildings.length
      });
    }
  };

  const getBuildingAtPosition = (position: number) => {
    return buildings.find((b) => b.position_index === position);
  };

  // Generate automatic belts: one belt per corral pointing to center, plus central vertical line
  // IMPORTANT: This generates belts for ALL slots, even empty ones
  // Belts are created automatically when a new farm is purchased
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
    const centerLineStartRow = firstSlotRow;
    const centerLineEndRow = lastSlotRow + 1; // Extend one row below the last slot
    
    // Generate continuous vertical line: one belt per row
    for (let beltRow = centerLineStartRow; beltRow <= centerLineEndRow; beltRow++) {
      if (beltRow < getTotalRows() && centerCol >= 1 && centerCol <= 30) {
        // Check if there's already a belt at this position
        const existingBelt = autoBelts.find(b => {
          const beltRowNotation = parseGridNotation(b.gridRow);
          const beltColNotation = parseGridNotation(b.gridColumn);
          return beltRowNotation.start === beltRow && beltColNotation.start === centerCol;
        });
        
        if (!existingBelt) {
          autoBelts.push({
            id: `belt-auto-center-row-${beltRow}`,
            gridColumn: createGridNotation(centerCol, centerCol + 1),
            gridRow: createGridNotation(beltRow, beltRow + 1),
            direction: 'north' as const,
            type: 'straight' as const,
          });
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
      
      if (beltRow < getTotalRows() && beltCol >= 1 && beltCol <= 30) {
        // Check if there's already a belt at this position
        const existingBelt = autoBelts.find(b => {
          const beltRowNotation = parseGridNotation(b.gridRow);
          const beltColNotation = parseGridNotation(b.gridColumn);
          return beltRowNotation.start === beltRow && beltColNotation.start === beltCol;
        });
        
        if (!existingBelt) {
          autoBelts.push({
            id: `belt-auto-left-${i}`,
            gridColumn: createGridNotation(beltCol, beltCol + 1),
            gridRow: createGridNotation(beltRow, beltRow + 1),
            direction: 'east' as const,
            type: 'straight' as const,
          });
        }
      }
    }
    
    // Right corrals: belts point west (towards center)
    // Only one belt per corral, positioned 3 rows from the top of each corral
    for (let i = 0; i < slotsPerSide; i++) {
      const baseRow = rightStartRow + i * (slotRowSpan + 1);
      // Belt should be 3 rows from the top of the corral: row = baseRow + 3
      const beltRow = baseRow + 3;
      // Belt column: left edge of right corral (pointing west towards center)
      const beltCol = rightColumns.start;
      
      if (beltRow < getTotalRows() && beltCol >= 1 && beltCol <= 30) {
        // Check if there's already a belt at this position
        const existingBelt = autoBelts.find(b => {
          const beltRowNotation = parseGridNotation(b.gridRow);
          const beltColNotation = parseGridNotation(b.gridColumn);
          return beltRowNotation.start === beltRow && beltColNotation.start === beltCol;
        });
        
        if (!existingBelt) {
          autoBelts.push({
            id: `belt-auto-right-${i}`,
            gridColumn: createGridNotation(beltCol, beltCol + 1),
            gridRow: createGridNotation(beltRow, beltRow + 1),
            direction: 'west' as const,
            type: 'straight' as const,
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
          
          {/* Fine grid overlay with enhanced visibility */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: isEditMode 
                ? 'linear-gradient(to right, rgba(0,0,0,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.08) 1px, transparent 1px)' 
                : 'linear-gradient(to right, rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.03) 1px, transparent 1px)',
              backgroundSize: `${
                cellSize + (parseFloat(String(layoutConfig.grid.gap).replace('px', '')) || 0)
              }px ${
                cellSize + (parseFloat(String(layoutConfig.grid.gap).replace('px', '')) || 0)
              }px`
            }}
          />
          {/* Grid: 25 columns total - Responsive cells that scale with screen */}
          <div 
            className={`grid items-stretch relative w-full mx-auto ${paintMode && isEditMode ? 'cursor-crosshair' : ''}`}
            style={{
              gridTemplateColumns: `repeat(30, ${cellSize}px)`,
              gridAutoRows: `${cellSize}px`,
              gap: layoutConfig.grid.gap
            }}
            onClick={(e) => {
              if (paintMode && isEditMode && !isDragging) {
                e.stopPropagation();
                const rect = gridRef.current?.getBoundingClientRect();
                if (!rect) return;
                
                const relativeX = e.clientX - rect.left;
                const relativeY = e.clientY - rect.top;
                const gapPx = parseFloat(String(layoutConfig.grid.gap).replace('px', '')) || 0;
                const totalRows = getTotalRows();
                
                const totalGapWidth = gapPx * (30 - 1);
                const totalGapHeight = gapPx * (totalRows - 1);
                const cellWidth = (rect.width - totalGapWidth) / 30;
                const cellHeight = (rect.height - totalGapHeight) / totalRows;
                
                const col = Math.max(1, Math.min(30, Math.floor(relativeX / (cellWidth + gapPx)) + 1));
                const row = Math.max(1, Math.min(totalRows, Math.floor(relativeY / (cellHeight + gapPx)) + 1));
                
                // Check if there's already a belt at this position
                const existingBelt = allBelts.find(belt => {
                  const beltCol = parseGridNotation(belt.gridColumn);
                  const beltRow = parseGridNotation(belt.gridRow);
                  return beltCol.start === col && beltRow.start === row;
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
                
                if (!existingBelt && !hasBuilding) {
                  addBeltAtPosition(col, row, 'east', 'straight');
                } else if (existingBelt && existingBelt.id.startsWith('belt-') && !existingBelt.id.startsWith('belt-auto-')) {
                  // Remove belt if clicking on an existing manual belt
                  removeBelt(existingBelt.id);
                }
              }
            }}
          >
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

            {/* HOUSE - Top Center above everything */}
            {!hideBuildings && (
            <div
              className={`flex items-center justify-center relative group ${isEditMode ? 'ring-2 ring-purple-500 ring-offset-2' : ''} ${
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
                      {tempPosition && isDragging && draggedBuilding === 'house' && (
                        <div className="absolute top-1 left-1 bg-yellow-500 text-black text-xs px-2 py-1 rounded font-bold">
                          Mover a: Col {tempPosition.col}, Row {tempPosition.row}
                        </div>
                      )}
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
                  
                </div>
              )}
            </div>
            )}
            
            {/* WAREHOUSE - Top Left: Columns 1-6, Rows 1-3 */}
            {!hideBuildings && (
            <div 
              className={`flex items-center justify-center relative group ${isEditMode ? 'ring-2 ring-blue-500 ring-offset-2' : ''} ${
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
                    {buildings.find(b => b.building_type === 'warehouse')?.level || 1}
                  </div>
                  <img 
                    src={getBuildingImage('warehouse', buildings.find(b => b.building_type === 'warehouse')?.level || 1, 'A')} 
                    alt="Warehouse" 
                    className="w-full h-full object-contain pointer-events-none"
                  />
                  {isEditMode && (
                    <>
                      <div className="absolute top-1 right-1 bg-blue-600 text-white text-xs px-2 py-1 rounded font-mono">
                        {layoutConfig.warehouse.gridColumn} / {layoutConfig.warehouse.gridRow}
                      </div>
                      {tempPosition && isDragging && draggedBuilding === 'warehouse' && (
                        <div className="absolute top-1 left-1 bg-yellow-500 text-black text-xs px-2 py-1 rounded font-bold">
                          Mover a: Col {tempPosition.col}, Row {tempPosition.row}
                        </div>
                      )}
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
              className={`flex items-center justify-center relative group ${isEditMode ? 'ring-2 ring-green-500 ring-offset-2' : ''} ${
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
                    {buildings.find(b => b.building_type === 'market')?.level || 1}
                  </div>
                  <img 
                    src={getBuildingImage('market', buildings.find(b => b.building_type === 'market')?.level || 1, 'A')} 
                    alt="Market" 
                    className="w-full h-full object-contain pointer-events-none"
                  />
                  {isEditMode && (
                    <>
                      <div className="absolute top-1 right-1 bg-green-600 text-white text-xs px-2 py-1 rounded font-mono">
                        {layoutConfig.market.gridColumn} / {layoutConfig.market.gridRow}
                      </div>
                      {tempPosition && isDragging && draggedBuilding === 'market' && (
                        <div className="absolute top-1 left-1 bg-yellow-500 text-black text-xs px-2 py-1 rounded font-bold">
                          Mover a: Col {tempPosition.col}, Row {tempPosition.row}
                        </div>
                      )}
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

            {/* BOXES - Independent from warehouse */}
            {!hideBuildings && (
            <div 
              className={`flex items-center justify-center relative group ${isEditMode ? 'ring-2 ring-amber-500 ring-offset-2' : ''} ${
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
                    {tempPosition && isDragging && draggedBuilding === 'boxes' && (
                      <div className="absolute top-1 left-1 bg-yellow-500 text-black text-xs px-2 py-1 rounded font-bold">
                        Mover a: Col {tempPosition.col}, Row {tempPosition.row}
                      </div>
                    )}
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

            {/* CONVEYOR BELTS - Auto-generated corral belts + manual belts */}
            {allBelts.map((belt, idx) => {
              const isBeltDragging = draggedBelt === belt.id;
              // Auto-generated belts (belt-auto-*) are not editable
              const isAutoBelt = belt.id.startsWith('belt-auto-');
              const isManualBelt = !isAutoBelt && !belt.id.startsWith('belt-center-') && !belt.id.startsWith('belt-left-') && !belt.id.startsWith('belt-right-');
              
              return (
                <ConveyorBelt
                  key={belt.id}
                  belt={belt}
                  idx={idx}
                  isEditMode={isEditMode && isManualBelt}
                  isDragging={isBeltDragging}
                  isSelected={selectedObject?.type === 'belt' && selectedObject?.id === belt.id}
                  tempPosition={beltTempPosition}
                  onMouseDown={(e) => isEditMode && isManualBelt && handleBeltMouseDown(e, belt.id)}
                  onClick={() => isEditMode && isManualBelt && handleBeltClick(belt.id)}
                  onRemove={() => isManualBelt && removeBelt(belt.id)}
                  onRotate={() => isManualBelt && rotateSelected()}
                  onUpdateColumn={(value) => isManualBelt && updateBelt(belt.id, { gridColumn: value })}
                  onUpdateRow={(value) => isManualBelt && updateBelt(belt.id, { gridRow: value })}
                />
              );
            })}

            {/* LEFT CORRALS */}
            {!hideBuildings && Array.from({ length: Math.ceil(TOTAL_SLOTS / 2) }).map((_, index) => {
              const position = index * 2;
              const building = getBuildingAtPosition(position);
              const slotRowSpan = Math.max(1, layoutConfig.leftCorrals.rowSpan ?? 1);
              // Add 1 cell of vertical space between each slot
              const baseRow = (layoutConfig.leftCorrals.startRow ?? 1) + index * (slotRowSpan + 1);
              
              return (
                <div 
                  key={`left-${position}`}
                  className="relative group"
                  style={{ 
                    gridColumn: layoutConfig.leftCorrals.gridColumn,
                    gridRow: `${baseRow} / ${baseRow + slotRowSpan}`,
                  }}
                  data-slot={`left-${position}`}
                >
                  <BuildingSlot
                    position={position}
                    building={building}
                    onBuyClick={handleBuyClick}
                    onBuildingClick={building ? () => handleBuildingClickAction(building.id) : undefined}
                    isLeftColumn={true}
                  />
                  
                  {/* Individual slot edit controls - Always visible in edit mode */}
                  {isEditMode && index === 0 && (
                    <div className="absolute -bottom-32 left-0 right-0 bg-background/95 backdrop-blur-sm border-2 border-yellow-500 rounded-lg p-2 space-y-1 shadow-lg z-50">
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
                  )}
                </div>
              );
            })}

            {/* RIGHT CORRALS */}
            {!hideBuildings && Array.from({ length: Math.ceil(TOTAL_SLOTS / 2) }).map((_, index) => {
              const position = index * 2 + 1;
              const building = getBuildingAtPosition(position);
              const slotRowSpan = Math.max(1, layoutConfig.rightCorrals.rowSpan ?? 1);
              // Add 1 cell of vertical space between each slot
              const baseRow = (layoutConfig.rightCorrals.startRow ?? 1) + index * (slotRowSpan + 1);
              
              return (
                <div 
                  key={`right-${position}`}
                  className="relative group"
                  style={{ 
                    gridColumn: layoutConfig.rightCorrals.gridColumn,
                    gridRow: `${baseRow} / ${baseRow + slotRowSpan}`,
                  }}
                  data-slot={`right-${position}`}
                >
                  <BuildingSlot
                    position={position}
                    building={building}
                    onBuyClick={handleBuyClick}
                    onBuildingClick={building ? () => handleBuildingClickAction(building.id) : undefined}
                    isLeftColumn={false}
                  />
                  
                  {/* Individual slot edit controls - Always visible in edit mode */}
                  {isEditMode && index === 0 && (
                    <div className="absolute -bottom-32 left-0 right-0 bg-background/95 backdrop-blur-sm border-2 border-orange-500 rounded-lg p-2 space-y-1 shadow-lg z-50">
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
                  )}
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
