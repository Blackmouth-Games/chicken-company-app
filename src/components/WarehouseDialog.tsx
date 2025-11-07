import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Info } from "lucide-react";
import { Button } from "./ui/button";

interface WarehouseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  level: number;
}

export const WarehouseDialog = ({ open, onOpenChange, level }: WarehouseDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            Almacen
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Building Card */}
          <div className="border-2 rounded-lg p-4 flex items-center gap-4">
            <div className="text-6xl">🏪</div>
            <div>
              <h3 className="text-xl font-bold">Almacen</h3>
              <p className="text-sm text-muted-foreground">Lvl {level}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="border rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              <span className="font-medium">Velocidad in:</span>
              <span className="ml-auto">0.000 $ABCD/day</span>
            </div>
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              <span className="font-medium">Almacenado:</span>
              <span className="ml-auto">0.000 $ABCD</span>
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="font-medium mb-2">Disclaimer:</p>
              <p className="text-sm text-muted-foreground">
                Cuidado, los huevos caducan a las 24h después de haber entrado a la
              </p>
            </div>
          </div>

          {/* Upgrade Section */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              <span className="font-medium">Nivel:</span>
              <span className="ml-auto">{level} -&gt; {level + 1}</span>
            </div>
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              <span className="font-medium">Max. Capacity:</span>
              <span className="ml-auto">0.000 -&gt; 0.000</span>
            </div>
            <Button className="w-full bg-green-500 hover:bg-green-600 text-white">
              Subir de nivel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
