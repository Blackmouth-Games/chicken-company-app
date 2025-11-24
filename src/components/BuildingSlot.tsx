import { Plus } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { getBuildingDisplay, type BuildingType } from "@/lib/buildingImages";
import { useBuildingSkins } from "@/hooks/useBuildingSkins";
import { useMemo } from "react";
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
  
  // Get skin info from database if selected_skin is set
  const skinInfo = useMemo(() => {
    if (!building?.selected_skin) return null;
    return getSkinByKey(building.selected_skin);
  }, [building?.selected_skin, getSkinByKey]);

  // Get building display (image or emoji)
  // Depend on building.selected_skin and building.level explicitly to ensure updates
  const buildingDisplay = useMemo(() => {
    if (!building) return null;
    return getBuildingDisplay(
      building.building_type as BuildingType,
      building.level,
      building.selected_skin || null, // Explicitly pass null if undefined
      skinInfo || undefined
    );
  }, [building?.selected_skin, building?.level, building?.building_type, skinInfo]);

  if (building) {
    // Calculate visible chickens: floor(current_chickens / 10)
    const visibleChickens = Math.floor(building.current_chickens / 10);
    const fillPercentage = (building.current_chickens / building.capacity) * 100;

    return (
      <div className="relative z-10 h-full">
        <div
          onClick={onBuildingClick}
          className="rounded-xl cursor-pointer transition-all duration-300 hover:scale-105 relative h-full flex flex-col"
          style={{
            backgroundImage: `url(${slotBgCoop})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            overflow: 'visible',
          }}
        >
          {/* Top section: Level badge + Progress bar */}
          <div className="absolute top-0 left-0 right-0 flex items-start">
            {/* Level badge */}
            <div className="bg-green-600 text-white rounded-full w-7 h-7 md:w-8 md:h-8 flex items-center justify-center text-xs md:text-sm font-bold z-50 border-2 border-white">
              {building.level}
            </div>
            {/* Progress bar - right next to level badge, no padding */}
            <div className="flex-1 flex flex-col">
              <div className="w-full h-3 md:h-3.5 bg-green-200/50 overflow-hidden border border-green-400">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                  style={{ width: `${fillPercentage}%` }}
                />
              </div>
              {/* Text below progress bar */}
              <div className="flex justify-between items-center text-sm md:text-base px-1">
                <span className="font-semibold text-green-700">🐔 {building.current_chickens}</span>
                <span className="text-green-600">Max: {building.capacity}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col h-full p-4 md:p-5 pt-7 md:pt-8 pb-4 overflow-visible">
            {/* Building image or emoji - top right, 2x size, no padding, aligned right */}
            <div className="flex justify-end">
              {buildingDisplay?.type === 'image' ? (
                <img 
                  src={buildingDisplay.src} 
                  alt={`${building.building_type} nivel ${building.level}`}
                  className="h-48 w-auto md:h-56 max-w-full object-contain"
                />
              ) : (
                <div className="text-7xl md:text-8xl leading-none">
                  {buildingDisplay?.emoji || '🏚️'}
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
            
            {/* Edit controls inside the corral */}
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
    <div className="relative z-10 h-full">
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
