import { Plus } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { getBuildingDisplay, type BuildingType } from "@/lib/buildingImages";
import { useBuildingSkins } from "@/hooks/useBuildingSkins";
import { useMemo, useState, useEffect } from "react";
import slotBgEmpty from "@/assets/bg/slot_bg_empty.png";
import slotBgCoop from "@/assets/bg/slot_bg_coop.png";

interface BuildingSlotProps {
  position: number;
  building?: {
    id: string;
    building_type: string;
    level: number;
    capacity: number;
    current_chickens: number;
    selected_skin?: string | null;
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
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
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

  if (building) {
    // Calculate visible chickens: floor(current_chickens / 10)
    const visibleChickens = Math.floor(building.current_chickens / 10);
    const fillPercentage = (building.current_chickens / building.capacity) * 100;

    return (
      <div className={slotBorderClasses}>
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
          {/* Top section: Level badge + Progress bar */}
          <div className="absolute top-0 left-0 right-0 flex items-start">
            {/* Level badge */}
            <div className="bg-green-600 text-white rounded-full w-7 h-7 md:w-8 md:h-8 flex items-center justify-center text-xs md:text-sm font-bold z-50 border-2 border-white">
              {building.level}
            </div>
            {/* Progress bar - right next to level badge, no padding */}
            <div className="flex-1 flex flex-col gap-0.5 px-2 pt-0.5">
              <div 
                className="w-1/2 bg-green-200/70 overflow-hidden rounded-full shadow-inner"
                style={{ height: isMobile ? '0.45rem' : '0.6rem' }}
              >
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500 rounded-full"
                  style={{ width: `${fillPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Chicken counter - top right */}
          <div className="absolute top-0 right-0 z-50 p-1 md:p-1.5">
            <div className="inline-flex items-center gap-1 text-sm md:text-base font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] bg-black/20 px-2 py-0.5 rounded-full">
              🐔 {building.current_chickens}
            </div>
          </div>

          <div className="flex flex-col h-full overflow-visible">
            {/* Building image or emoji - centered horizontally, can overflow top */}
            <div className="flex justify-center items-center m-0 p-0 w-full h-[150px] md:h-[180px] overflow-visible relative">
              {buildingDisplay?.type === 'image' ? (
                <img 
                  src={buildingDisplay.src} 
                  alt={`${building.building_type} nivel ${building.level}`}
                  className="max-w-full w-auto h-auto object-contain m-0 p-0"
                  style={{ 
                    objectPosition: 'center',
                    display: 'block',
                    maxHeight: '300%', // Allow image to be 3x the container height to overflow
                    position: 'relative',
                    top: '50%', // Center vertically
                    transform: 'translateY(-50%)', // Center vertically
                  }}
                />
              ) : (
                <div className="text-7xl md:text-8xl leading-none m-0 p-0">
                  🏚️
                </div>
              )}
            </div>
            
            {/* Chickens area - show chickens walking around */}
            <div className="flex-1 flex flex-wrap gap-1.5 content-start mb-3 overflow-hidden">
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
