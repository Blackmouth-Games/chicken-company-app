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
    return (
      <div
        onClick={onBuildingClick}
        className="aspect-square border-2 border-green-500 rounded-xl bg-gradient-to-br from-green-100 to-green-50 p-4 cursor-pointer hover:from-green-200 hover:to-green-100 transition-all shadow-md hover:shadow-xl relative min-h-[160px]"
      >
        <div className="absolute -top-3 -left-3 bg-green-600 text-white rounded-full w-10 h-10 flex items-center justify-center text-base font-bold shadow-lg z-10">
          {building.level}
        </div>
        <div className="flex flex-col items-center justify-center h-full">
          <div className="text-6xl mb-2">🏠</div>
          <p className="text-sm font-bold text-green-900">{building.current_chickens}/{building.capacity} 🐔</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={() => onBuyClick(position)}
      className="aspect-square border-2 border-dashed border-amber-400 rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 p-4 flex items-center justify-center cursor-pointer hover:from-amber-100 hover:to-yellow-100 transition-all shadow-sm hover:shadow-lg min-h-[160px]"
    >
      <div className="flex items-center justify-center h-16 w-16 rounded-full bg-white/90 border-2 border-amber-500 hover:border-amber-600 transition-colors shadow-md">
        <Plus className="h-8 w-8 text-amber-600" />
      </div>
    </div>
  );
};
