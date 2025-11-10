import { Plus } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { getBuildingImage, type BuildingType } from "@/lib/buildingImages";

interface BuildingSlotProps {
  position: number;
  building?: {
    id: string;
    building_type: string;
    level: number;
    capacity: number;
    current_chickens: number;
  };
  onBuyClick: (position: number) => void;
  onBuildingClick?: () => void;
  isLeftColumn?: boolean; // Para saber de qué lado poner la mini cinta
}

export const BuildingSlot = ({ position, building, onBuyClick, onBuildingClick, isLeftColumn = true }: BuildingSlotProps) => {
  if (building) {
    // Calculate visible chickens: floor(current_chickens / 10)
    const visibleChickens = Math.floor(building.current_chickens / 10);
    const fillPercentage = (building.current_chickens / building.capacity) * 100;

    return (
      <div className="relative z-10 h-full">
        <div
          onClick={onBuildingClick}
          className="border-2 border-green-500 rounded-xl bg-gradient-to-br from-green-100 to-green-50 cursor-pointer hover:from-green-200 hover:to-green-100 transition-all shadow-md hover:shadow-xl relative h-full flex flex-col"
        >
          {/* Level badge - Positioned outside to avoid clipping */}
          <div className="absolute -top-3 -left-3 bg-green-600 text-white rounded-full w-6 h-6 md:w-7 md:h-7 flex items-center justify-center text-xs md:text-sm font-bold shadow-lg z-50 border-2 border-white">
            {building.level}
          </div>

          <div className="flex flex-col h-full p-4 md:p-5 pt-7 md:pt-8 pb-4">
            {/* Building image - top right */}
            <div className="flex justify-end mb-2">
              <img 
                src={getBuildingImage(building.building_type as BuildingType, building.level, 'A')} 
                alt={`${building.building_type} nivel ${building.level}`}
                className="h-24 w-auto md:h-28 max-w-full object-contain"
              />
            </div>
            
            {/* Chickens area - show chickens walking around */}
            <div className="flex-1 flex flex-wrap gap-1.5 content-start mb-3 overflow-hidden">
              {Array.from({ length: visibleChickens }).map((_, i) => (
                <div key={i} className="text-3xl md:text-4xl animate-pulse" style={{ animationDelay: `${i * 0.3}s` }}>
                  🐔
                </div>
              ))}
            </div>

            {/* Progress bar at bottom - more compact */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-sm md:text-base">
                <span className="font-semibold text-green-700">🐔 {building.current_chickens}</span>
                <span className="text-green-600">Max: {building.capacity}</span>
              </div>
              <div className="w-full h-3 md:h-3.5 bg-green-200/50 rounded-full overflow-hidden border border-green-400">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500 rounded-full"
                  style={{ width: `${fillPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 h-full">
      <div 
        onClick={() => onBuyClick(position)}
        className="border-2 border-dashed border-amber-400 rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 p-4 flex items-center justify-center cursor-pointer hover:from-amber-100 hover:to-yellow-100 transition-all shadow-sm hover:shadow-lg h-full"
      >
        <div className="flex items-center justify-center h-20 w-20 md:h-24 md:w-24 rounded-full bg-white/90 border-2 border-amber-500 hover:border-amber-600 transition-colors shadow-md">
          <Plus className="h-10 w-10 md:h-12 md:w-12 text-amber-600" />
        </div>
      </div>
    </div>
  );
};
