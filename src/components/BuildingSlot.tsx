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
  isLeftColumn?: boolean; // Para saber de qué lado poner la mini cinta
}

export const BuildingSlot = ({ position, building, onBuyClick, onBuildingClick, isLeftColumn = true }: BuildingSlotProps) => {
  if (building) {
    // Calculate visible chickens: floor(current_chickens / 10)
    const visibleChickens = Math.floor(building.current_chickens / 10);
    const fillPercentage = (building.current_chickens / building.capacity) * 100;

    return (
      <div className="relative z-10">
        <div
          onClick={onBuildingClick}
          className="border-2 border-green-500 rounded-xl bg-gradient-to-br from-green-100 to-green-50 cursor-pointer hover:from-green-200 hover:to-green-100 transition-all shadow-md hover:shadow-xl relative min-h-[160px] overflow-visible"
        >
          {/* Level badge - Positioned outside to avoid clipping */}
          <div className="absolute -top-4 -left-4 bg-green-600 text-white rounded-full w-11 h-11 flex items-center justify-center text-base font-bold shadow-lg z-20 border-2 border-white">
            {building.level}
          </div>

          <div className="flex flex-col h-full p-4 pt-6">
            {/* Building image - top right */}
            <div className="flex justify-end mb-2">
              <div className="text-5xl">🏠</div>
            </div>
            
            {/* Chickens area - show chickens walking around */}
            <div className="flex-1 flex flex-wrap gap-1 content-start mb-3">
              {Array.from({ length: visibleChickens }).map((_, i) => (
                <div key={i} className="text-2xl animate-pulse" style={{ animationDelay: `${i * 0.3}s` }}>
                  🐔
                </div>
              ))}
            </div>

            {/* Progress bar at bottom */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-green-700">🐔 {building.current_chickens}</span>
                <span className="text-green-600">Max: {building.capacity}</span>
              </div>
              <div className="w-full h-3 bg-green-200/50 rounded-full overflow-hidden border border-green-400">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500 rounded-full"
                  style={{ width: `${fillPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mini horizontal conveyor belt to connect to vertical belt - improved visual */}
        <div 
          className={cn(
            "absolute top-1/2 -translate-y-1/2 h-8 bg-gradient-to-r from-amber-800 via-amber-900 to-amber-800 shadow-lg z-30 flex items-center justify-center border-2 border-amber-700 overflow-hidden",
            isLeftColumn ? "-right-10 w-10 rounded-r-lg" : "-left-10 w-10 rounded-l-lg"
          )}
        >
          {/* Animated conveyor pattern */}
          <div 
            className="absolute inset-0 opacity-20" 
            style={{
              backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(0,0,0,0.3) 10px, rgba(0,0,0,0.3) 20px)',
              animation: isLeftColumn ? 'conveyor-right 2s linear infinite' : 'conveyor-left 2s linear infinite'
            }}
          />
          {/* Egg moving on belt */}
          {building.current_chickens > 0 && (
            <div 
              className="text-base z-10 relative"
              style={{
                animation: 'egg-bounce 1.5s ease-in-out infinite'
              }}
            >
              🥚
            </div>
          )}
        </div>

        <style>{`
          @keyframes egg-bounce {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-3px); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="relative z-10">
      <div 
        onClick={() => onBuyClick(position)}
        className="border-2 border-dashed border-amber-400 rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 p-4 flex items-center justify-center cursor-pointer hover:from-amber-100 hover:to-yellow-100 transition-all shadow-sm hover:shadow-lg min-h-[160px]"
      >
        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-white/90 border-2 border-amber-500 hover:border-amber-600 transition-colors shadow-md">
          <Plus className="h-8 w-8 text-amber-600" />
        </div>
      </div>
    </div>
  );
};
