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
        className="aspect-square border-2 border-green-500 rounded-lg bg-gradient-to-br from-green-100 to-green-50 p-2 cursor-pointer hover:from-green-200 hover:to-green-100 transition-all shadow-md hover:shadow-lg relative"
      >
        <div className="absolute -top-2 -left-2 bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold shadow-md z-10">
          {building.level}
        </div>
        <div className="flex flex-col items-center justify-center h-full">
          <div className="text-4xl mb-1">🏠</div>
          <p className="text-xs font-medium text-green-900">{building.current_chickens}/{building.capacity} 🐔</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={() => onBuyClick(position)}
      className="aspect-square border-2 border-dashed border-amber-300 rounded-lg bg-gradient-to-br from-amber-50 to-yellow-50 p-2 flex items-center justify-center cursor-pointer hover:from-amber-100 hover:to-yellow-100 transition-all shadow-sm hover:shadow-md"
    >
      <div className="flex items-center justify-center h-12 w-12 rounded-full bg-white/80 border-2 border-amber-400 hover:border-amber-500 transition-colors">
        <Plus className="h-6 w-6 text-amber-600" />
      </div>
    </div>
  );
};
