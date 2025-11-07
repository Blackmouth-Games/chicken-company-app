import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { useState } from "react";
import { useUserBuildings } from "@/hooks/useUserBuildings";
import { useBuildingPrices } from "@/hooks/useBuildingPrices";
import { UpgradeBuildingDialog } from "./UpgradeBuildingDialog";
import { BUILDING_TYPES } from "@/lib/constants";

interface MarketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | undefined;
}

export const MarketDialog = ({ open, onOpenChange, userId }: MarketDialogProps) => {
  const { getBuildingByType, refetch } = useUserBuildings(userId);
  const { getPrice, loading: pricesLoading } = useBuildingPrices();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const market = getBuildingByType(BUILDING_TYPES.MARKET);
  const currentLevel = market?.level || 1;
  const nextLevelPrice = getPrice(BUILDING_TYPES.MARKET, currentLevel + 1);
  const canUpgrade = currentLevel < 5 && nextLevelPrice;

  const handleUpgradeComplete = () => {
    refetch();
    setShowUpgrade(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Market</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Market Image */}
            <div className="flex justify-center">
              <div className="text-9xl">🏪</div>
            </div>

            {/* Current Level */}
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Nivel actual</div>
              <div className="text-3xl font-bold">Nivel {currentLevel}</div>
            </div>

            {/* Stats */}
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm">Capacidad de venta</span>
                <span className="font-semibold">{market?.capacity.toLocaleString() || 0}</span>
              </div>
            </div>

            {/* Upgrade Section */}
            {canUpgrade && (
              <div className="border-t pt-4 space-y-3">
                <div className="text-sm font-medium">Mejorar edificio</div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Nivel {currentLevel}</span>
                  <span className="text-primary">→</span>
                  <span className="text-sm font-semibold">Nivel {currentLevel + 1}</span>
                </div>
                <div className="p-3 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Coste:</span>
                    <span className="font-semibold">{nextLevelPrice?.price_ton} TON</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Nueva capacidad:</span>
                    <span className="font-semibold">{nextLevelPrice?.capacity.toLocaleString()}</span>
                  </div>
                </div>
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => setShowUpgrade(true)}
                  disabled={pricesLoading}
                >
                  Subir de nivel
                </Button>
              </div>
            )}

            {currentLevel >= 5 && (
              <div className="text-center text-sm text-muted-foreground">
                Nivel máximo alcanzado
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {market && nextLevelPrice && (
        <UpgradeBuildingDialog
          open={showUpgrade}
          onOpenChange={setShowUpgrade}
          buildingId={market.id}
          buildingType={BUILDING_TYPES.MARKET}
          currentLevel={currentLevel}
          nextLevel={currentLevel + 1}
          userId={userId || ""}
          upgradePrice={nextLevelPrice.price_ton}
          newCapacity={nextLevelPrice.capacity}
          onUpgradeComplete={handleUpgradeComplete}
        />
      )}
    </>
  );
};
