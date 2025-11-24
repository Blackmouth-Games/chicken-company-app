import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Info, X } from "lucide-react";
import buildingCorral from "@/assets/buildings/coop/coop_1A.png";

interface BuyBuildingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPurchase: () => void;
  isPurchasing?: boolean;
}

export const BuyBuildingDialog = ({
  open,
  onOpenChange,
  onPurchase,
  isPurchasing = false,
}: BuyBuildingDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-2">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 rounded-full"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4" />
        </Button>

        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">
            Adquiere Corral
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          <div className="w-32 h-32 flex items-center justify-center">
            <img 
              src={buildingCorral} 
              alt="Corral" 
              className="w-full h-full object-contain"
            />
          </div>

          <p className="text-lg font-semibold">Lvl 1</p>

          <div className="flex items-center gap-2 text-sm">
            <Info className="h-4 w-4" />
            <span className="font-medium">Max. Capacity:</span>
            <span>50</span>
          </div>

          <div className="w-full px-4">
            <div className="bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg p-3 text-center">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                0.000 $TON
              </p>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 w-full">
            <p className="text-sm font-medium mb-1">info:</p>
            <p className="text-xs text-muted-foreground">
              Este edificio sirve para almacenar gallinas.
            </p>
          </div>

          <Button
            onClick={onPurchase}
            disabled={isPurchasing}
            className="w-full mt-2"
            size="lg"
          >
            {isPurchasing ? "Comprando..." : "Comprar Corral"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
