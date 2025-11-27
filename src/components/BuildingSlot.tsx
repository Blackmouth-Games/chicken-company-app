import { Plus } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { getBuildingDisplay, type BuildingType } from "@/lib/buildingImages";
import { useBuildingSkins } from "@/hooks/useBuildingSkins";
import { useMemo, useState, useEffect } from "react";
import slotBgEmpty from "@/assets/bg/slot_bg_empty.png";
import slotBgCoop from "@/assets/bg/slot_bg_coop.png";

type EggDebugStatus = 'ready' | 'waiting' | 'no-belt';

interface EggDebugDetails {
  beltId?: string | null;
  beltSlotPosition?: number | null;
  hasBelt: boolean;
  status: EggDebugStatus;
  timeUntilSpawn: number;
  nextSpawnAt?: number | null;
  positionIndex?: number;
}

interface BuildingSlotProps {
  position: number;
  building?: {
    id: string;
    building_type: string;
    level: number;
    capacity: number;
    current_chickens: number;
    selected_skin?: string | null;
    position_index?: number;
  };
  onBuyClick: (position: number) => void;
  onBuildingClick?: () => void;
  isLeftColumn?: boolean; // Para saber de qué lado poner la mini cinta
  isEditMode?: boolean;
  editControls?: React.ReactNode;
}

export const BuildingSlot = ({ position, building, onBuyClick, onBuildingClick, isLeftColumn = true, isEditMode = false, editControls }: BuildingSlotProps) => {
  const { getSkinByKey } = useBuildingSkins(building?.building_type);
  const [isMobile, setIsMobile] = useState(false);
  const [eggDebugMode, setEggDebugMode] = useState(false);
  const [eggDebugDetails, setEggDebugDetails] = useState<EggDebugDetails | null>(null);
  const [countdownMs, setCountdownMs] = useState<number | null>(null);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleEggDebugModeChange = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      const enabled = typeof detail === 'object' && detail !== null
        ? !!(detail.enabled ?? detail.active ?? detail)
        : !!detail;
      setEggDebugMode(enabled);
      if (!enabled) {
        setEggDebugDetails(null);
        setCountdownMs(null);
      }
    };

    window.addEventListener('eggDebugModeChange', handleEggDebugModeChange as EventListener);
    return () => {
      window.removeEventListener('eggDebugModeChange', handleEggDebugModeChange as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!eggDebugMode || !building) return;

    const handleEggDebugInfo = (event: Event) => {
      if (!building) return;
      const detail = (event as CustomEvent).detail;
      const spawnPoints = detail?.spawnPoints || [];
      const slotPosition = building.position_index ?? position;
      const match = spawnPoints.find(
        (spawn: any) =>
          spawn?.coopId === building.id ||
          (spawn?.positionIndex !== undefined && spawn.positionIndex === slotPosition)
      );

      if (match) {
        const nextSpawnAt = typeof match.timeUntilSpawn === 'number'
          ? Date.now() + match.timeUntilSpawn
          : null;

        setEggDebugDetails({
          beltId: match.assignedBeltId || null,
          beltSlotPosition: match.beltSlotPosition ?? null,
          hasBelt: !!match.hasBelt,
          status: match.status as EggDebugStatus,
          timeUntilSpawn: match.timeUntilSpawn ?? 0,
          nextSpawnAt,
          positionIndex: match.positionIndex,
        });
        setCountdownMs(match.timeUntilSpawn ?? null);
      } else {
        setEggDebugDetails(null);
        setCountdownMs(null);
      }
    };

    window.addEventListener('eggDebugInfo', handleEggDebugInfo as EventListener);
    return () => {
      window.removeEventListener('eggDebugInfo', handleEggDebugInfo as EventListener);
    };
  }, [eggDebugMode, building, position]);

  useEffect(() => {
    if (!eggDebugMode || !eggDebugDetails?.nextSpawnAt) {
      setCountdownMs(eggDebugDetails?.timeUntilSpawn ?? null);
      return;
    }

    const updateCountdown = () => {
      setCountdownMs(Math.max(0, eggDebugDetails.nextSpawnAt! - Date.now()));
    };

    updateCountdown();
    const interval = window.setInterval(updateCountdown, 200);
    return () => window.clearInterval(interval);
  }, [eggDebugMode, eggDebugDetails?.nextSpawnAt, eggDebugDetails?.timeUntilSpawn]);
  
  // Get skin info from database if selected_skin is set
  const skinInfo = useMemo(() => {
    if (!building?.selected_skin) return null;
    return getSkinByKey(building.selected_skin);
  }, [building?.selected_skin, getSkinByKey]);

  // Get building display (image or emoji)
  // Depend on building.selected_skin and building.level explicitly to ensure updates
  const buildingDisplay = useMemo(() => {
    if (!building) return null;
    const buildingType = building.building_type;
    return getBuildingDisplay(
      buildingType as BuildingType,
      building.level,
      building.selected_skin || null, // Explicitly pass null if undefined
      skinInfo || undefined
    );
  }, [building?.selected_skin, building?.level, building?.building_type, skinInfo]);

  const slotBorderClasses = "relative z-10 h-full rounded-2xl border-2 border-white/60 shadow-[0_4px_12px_rgba(0,0,0,0.2)] bg-white/5 backdrop-blur";
  const debugRingClass = eggDebugMode && building
    ? eggDebugDetails?.hasBelt
      ? "ring-2 ring-green-400/70 ring-offset-2 ring-offset-white/60"
      : "ring-2 ring-red-400/70 ring-offset-2 ring-offset-white/60"
    : "";

  if (building) {
    // Calculate visible chickens: floor(current_chickens / 10)
    const visibleChickens = Math.floor(building.current_chickens / 10);
    const fillPercentage = (building.current_chickens / building.capacity) * 100;

    const effectiveCountdownSeconds = countdownMs != null ? (countdownMs / 1000) : eggDebugDetails?.timeUntilSpawn ? eggDebugDetails.timeUntilSpawn / 1000 : null;
    const slotIndex = building.position_index ?? position;
    const slotNumberLabel = slotIndex !== undefined && slotIndex !== null ? slotIndex + 1 : position + 1;
    const beltNumberLabel = typeof eggDebugDetails?.beltSlotPosition === 'number'
      ? eggDebugDetails.beltSlotPosition + 1
      : undefined;
    const statusLabelMap: Record<EggDebugStatus, string> = {
      ready: 'LISTO',
      waiting: 'EN COLA',
      'no-belt': 'SIN CINTA',
    };
    const statusColorMap: Record<EggDebugStatus, string> = {
      ready: 'text-emerald-300',
      waiting: 'text-amber-300',
      'no-belt': 'text-rose-300',
    };
    const currentStatus = eggDebugDetails?.status ?? 'no-belt';

    return (
      <div className={cn(slotBorderClasses, debugRingClass)} style={{ overflow: 'hidden' }}>
        <div
          onClick={onBuildingClick}
          className="rounded-xl cursor-pointer transition-all duration-300 hover:scale-105 relative h-full flex flex-col"
          style={{
            backgroundImage: `url(${slotBgCoop})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            overflow: 'hidden',
          }}
        >
          {/* Top section: level badge */}
          <div className="absolute top-1 left-1 z-50">
            {/* Level badge */}
            <div className="bg-green-600 text-white rounded-full w-7 h-7 md:w-8 md:h-8 flex items-center justify-center text-xs md:text-sm font-bold border-2 border-white shadow">
              {building.level}
            </div>
          </div>
          {/* Egg debug overlay (slot correlation) */}
          {eggDebugMode && building && (
            <div className="absolute inset-x-2 bottom-2 z-50 pointer-events-none">
              <div className="bg-slate-900/90 text-white rounded-xl border border-white/10 shadow-xl px-3 py-2 flex flex-col gap-1 text-[11px] md:text-xs">
                <div className="flex items-center justify-between gap-2 font-semibold text-xs">
                  <span>Slot #{slotNumberLabel}</span>
                  <span className="text-slate-200">
                    {beltNumberLabel ? `Cinta #${beltNumberLabel}` : 'Sin cinta'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className={statusColorMap[currentStatus]}>
                    Estado: {statusLabelMap[currentStatus]}
                  </span>
                  <span className="text-slate-200 flex items-center gap-1">
                    ⏱ {effectiveCountdownSeconds != null ? `${effectiveCountdownSeconds.toFixed(1)}s` : '—'}
                  </span>
                </div>
                {eggDebugDetails?.beltId && (
                  <div className="text-[10px] text-slate-400 font-mono truncate">
                    {eggDebugDetails.beltId}
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Chicken counter - top-right, distinct style */}
          <div className="absolute top-1 right-1 z-40">
            <div className="bg-amber-500 text-white rounded-lg px-2 py-1 md:px-2.5 md:py-1.5 flex items-center gap-1 text-xs md:text-sm font-semibold border-2 border-white shadow-md">
              🐔 {building.current_chickens}
            </div>
          </div>

          {/* Vertical progress bar - right side of slot */}
          <div className="absolute top-0 right-0 bottom-0 w-2 md:w-3 z-40 p-1">
            <div 
              className="w-full bg-green-200/70 overflow-hidden rounded-full shadow-inner"
              style={{ height: '100%' }}
            >
              <div 
                className="w-full bg-gradient-to-t from-green-500 to-green-600 transition-all duration-500 rounded-full"
                style={{ height: `${fillPercentage}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col h-full overflow-hidden relative">
            {/* Building image o emoji - anclado al fondo del slot */}
            <div className="absolute inset-0 flex justify-center items-end m-0 p-0 overflow-hidden pointer-events-none">
              {buildingDisplay?.type === 'image' ? (
                <img 
                  src={buildingDisplay.src} 
                  alt={`${building.building_type} nivel ${building.level}`}
                  className="max-w-full w-auto h-auto object-contain m-0 p-0"
                  style={{ 
                    objectPosition: 'center bottom',
                    display: 'block',
                    maxHeight: '100%',
                    width: 'auto',
                    height: 'auto',
                    transform: 'scale(0.88)',
                  }}
                />
              ) : (
                <div className="text-7xl md:text-8xl leading-none m-0 p-0">
                  🏚️
                </div>
              )}
            </div>
            
            {/* Chickens area - show chickens walking around */}
            <div className="flex-1 flex flex-wrap gap-1.5 content-start mb-3 overflow-hidden relative z-10">
              {Array.from({ length: visibleChickens }).map((_, i) => (
                <div key={i} className="text-3xl md:text-4xl animate-pulse" style={{ animationDelay: `${i * 0.3}s` }}>
                  🐔
                </div>
              ))}
            </div>
            
            {/* Edit controls inside the coop */}
            {isEditMode && editControls && (
              <div className="mt-2 pt-2 border-t border-green-300 relative z-[100]">
                {editControls}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={slotBorderClasses}>
      <div 
        onClick={() => onBuyClick(position)}
        className="rounded-xl p-4 flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105 h-full overflow-visible"
        style={{
          backgroundImage: `url(${slotBgEmpty})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="flex items-center justify-center h-12 w-12 md:h-14 md:w-14 rounded-full bg-white/90 border-2 border-amber-500 hover:border-amber-600 transition-colors">
          <Plus className="h-6 w-6 md:h-7 md:w-7 text-amber-600" />
        </div>
      </div>
    </div>
  );
};
