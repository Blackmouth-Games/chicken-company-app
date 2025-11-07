import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Info, Edit } from "lucide-react";
import { useState } from "react";
import { UpgradeBuildingDialog } from "./UpgradeBuildingDialog";
import { SkinSelectorDialog } from "./SkinSelectorDialog";
import { useUserBuildings } from "@/hooks/useUserBuildings";
import { useBuildingPrices } from "@/hooks/useBuildingPrices";

interface CorralDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | undefined;
  buildingId: string | undefined;
}

export const CorralDialog = ({ open, onOpenChange, userId, buildingId }: CorralDialogProps) => {
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showSkinSelector, setShowSkinSelector] = useState(false);
  const { buildings, refetch } = useUserBuildings(userId);
  const { prices } = useBuildingPrices();

  const corral = buildings.find(b => b.id === buildingId);
  const nextLevel = corral ? corral.level + 1 : 2;
  const nextLevelPrice = prices.find(p => p.building_type === 'corral' && p.level === nextLevel);
  const upgradePrice = nextLevelPrice?.price_ton || 0;
  const nextLevelCapacity = nextLevelPrice?.capacity || 0;

  if (!corral) return null;

  const efficiency = corral.current_chickens > 0 
    ? Math.min(100, Math.round((corral.current_chickens / corral.capacity) * 100))
    : 0;

  const earnRate = (corral.current_chickens * 0.001).toFixed(3);

  const handleUpgradeComplete = () => {
    refetch();
    setShowUpgrade(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Corral
            </DialogTitle>
          </DialogHeader>

          {/* Building Card */}
          <div className="bg-gradient-to-br from-green-100 to-green-50 rounded-lg p-4 border-2 border-green-400 relative">
            <button
              onClick={() => setShowSkinSelector(true)}
              className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-md hover:bg-white transition-colors"
            >
              <Edit className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3">
              <div className="text-6xl">🏠</div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">Corral</h3>
                <p className="text-sm text-muted-foreground">Lvl {corral.level}</p>
              </div>
            </div>
          </div>

          {/* Chicken Info */}
          <div className="bg-white rounded-lg p-4 border-2 border-border space-y-3">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-4xl">🐔</div>
              <div className="flex gap-2 items-center">
                <button className="px-3 py-1 border border-border rounded text-sm">x1</button>
                <button className="px-3 py-1 border border-border rounded text-sm">x5</button>
                <button className="px-3 py-1 border border-border rounded text-sm">x10</button>
                <Button size="sm" className="bg-green-500 hover:bg-green-600">
                  stake gallinas
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Valor:</span>
              <span className="text-sm ml-auto">0.000 $ABCD</span>
            </div>

            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Gallinas:</span>
              <span className="text-sm ml-auto text-orange-600 font-bold">
                {corral.current_chickens} / {corral.capacity}
              </span>
            </div>
            <Progress value={(corral.current_chickens / corral.capacity) * 100} className="h-2" />

            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Eficiencia:</span>
              <span className="text-sm ml-auto">{efficiency}%</span>
            </div>

            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Total Obtenido:</span>
              <span className="text-sm ml-auto">0.000 $ABCD</span>
            </div>

            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Earn esperado:</span>
              <span className="text-sm ml-auto">{earnRate} $ABCD / Day</span>
            </div>
          </div>

          {/* Upgrade Section */}
          <div className="bg-muted/50 rounded-lg p-4 border border-border space-y-2">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Nivel:</span>
              <span className="text-sm ml-auto">{corral.level} → {nextLevel}</span>
            </div>

            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Max. Capacity:</span>
              <span className="text-sm ml-auto">{corral.capacity} → {nextLevelCapacity}</span>
            </div>

            <Button 
              onClick={() => setShowUpgrade(true)}
              className="w-full bg-green-500 hover:bg-green-600"
            >
              Subir de nivel
            </Button>
          </div>

          {/* Withdraw Section */}
          <div className="flex gap-2">
            <div className="flex-1 bg-muted/50 rounded-lg p-3 border border-border text-center">
              <div className="text-sm">0.000 $ABCD</div>
            </div>
            <Button variant="outline" className="px-6">
              WithDraw
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <UpgradeBuildingDialog
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        buildingId={buildingId || ''}
        buildingType="corral"
        currentLevel={corral?.level || 1}
        nextLevel={nextLevel}
        userId={userId || ''}
        upgradePrice={upgradePrice}
        newCapacity={nextLevelCapacity}
        onUpgradeComplete={handleUpgradeComplete}
      />

      <SkinSelectorDialog
        open={showSkinSelector}
        onOpenChange={setShowSkinSelector}
        buildingId={buildingId || ''}
        buildingType="corral"
        userId={userId}
        currentSkin={corral?.selected_skin || null}
        onSkinSelected={() => {
          refetch();
          setShowSkinSelector(false);
        }}
      />
    </>
  );
};
