import { Plus } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

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
}

export const BuildingSlot = ({ position, building, onBuyClick, onBuildingClick }: BuildingSlotProps) => {
  if (building) {
    // Calculate visible chickens: floor(current_chickens / 10)
    const visibleChickens = Math.floor(building.current_chickens / 10);
    const fillPercentage = (building.current_chickens / building.capacity) * 100;

    return (
      <div
        onClick={onBuildingClick}
        className="border-2 border-green-500 rounded-xl bg-gradient-to-br from-green-100 to-green-50 cursor-pointer hover:from-green-200 hover:to-green-100 transition-all shadow-md hover:shadow-xl relative min-h-[160px] overflow-hidden"
      >
        {/* Level badge */}
        <div className="absolute -top-3 -left-3 bg-green-600 text-white rounded-full w-10 h-10 flex items-center justify-center text-base font-bold shadow-lg z-10">
          {building.level}
        </div>

        {/* Vertical capacity bar - outside and attached to left, below level badge */}
        <div className="absolute -left-3 top-12 bottom-2 flex flex-col items-center gap-1 z-20">
          <div className="flex-1 w-6 bg-gray-200 rounded-full relative overflow-hidden border-2 border-gray-300 shadow-md">
            {/* Fill indicator */}
            <div 
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-red-500 to-red-400 transition-all duration-300"
              style={{ height: `${fillPercentage}%` }}
            />
          </div>
          {/* Chicken count */}
          <div className="text-xs font-bold text-center whitespace-nowrap bg-white/90 px-1 rounded">
            {building.current_chickens}/{building.capacity}
          </div>
        </div>

        <div className="flex h-full p-3">
          {/* Building and chickens */}
          <div className="flex-1 flex flex-col">
            {/* Building image - top right */}
            <div className="flex justify-end mb-2">
              <div className="text-5xl">🏠</div>
            </div>
            
            {/* Chickens area - show chickens walking around */}
            <div className="flex-1 flex flex-wrap gap-1 content-start">
              {Array.from({ length: visibleChickens }).map((_, i) => (
                <div key={i} className="text-2xl animate-pulse" style={{ animationDelay: `${i * 0.3}s` }}>
                  🐔
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={() => onBuyClick(position)}
      className="border-2 border-dashed border-amber-400 rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 p-4 flex items-center justify-center cursor-pointer hover:from-amber-100 hover:to-yellow-100 transition-all shadow-sm hover:shadow-lg min-h-[160px]"
    >
      <div className="flex items-center justify-center h-16 w-16 rounded-full bg-white/90 border-2 border-amber-500 hover:border-amber-600 transition-colors shadow-md">
        <Plus className="h-8 w-8 text-amber-600" />
      </div>
    </div>
  );
};
