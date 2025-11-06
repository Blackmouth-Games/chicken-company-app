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
        className="aspect-square border-2 border-dashed border-green-600 rounded-lg bg-green-50/50 p-2 cursor-pointer hover:bg-green-100/50 transition-colors"
      >
        <div className="flex flex-col items-center justify-center h-full">
          <div className="text-4xl mb-1">🏠</div>
          <p className="text-xs font-medium text-green-900">Lvl {building.level}</p>
          <p className="text-xs text-green-700">{building.current_chickens}/{building.capacity}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="aspect-square border-2 border-dashed border-muted-foreground/30 rounded-lg bg-background/50 p-2 flex items-center justify-center">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onBuyClick(position)}
        className={cn(
          "h-12 w-12 rounded-full",
          "bg-background/80 hover:bg-background",
          "border-muted-foreground/50"
        )}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
};
