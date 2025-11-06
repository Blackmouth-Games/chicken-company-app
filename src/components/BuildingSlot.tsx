import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BuildingSlotProps {
  position: number;
  building?: {
    id: string;
    type: string;
    level: number;
  } | null;
  onBuyClick: (position: number) => void;
}

export const BuildingSlot = ({ position, building, onBuyClick }: BuildingSlotProps) => {
  if (building) {
    return (
      <div className="relative border-2 border-dashed border-primary/40 rounded-lg p-4 bg-card/50 backdrop-blur-sm aspect-square flex items-center justify-center">
        <div className="text-center">
          <div className="text-sm font-semibold text-card-foreground">
            {building.type === 'corral' ? '🐔 Corral' : building.type}
          </div>
          <div className="text-xs text-muted-foreground">Lvl {building.level}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative border-2 border-dashed border-border rounded-lg p-4 bg-background/50 backdrop-blur-sm aspect-square flex items-center justify-center">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onBuyClick(position)}
        className="h-12 w-12 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
};
