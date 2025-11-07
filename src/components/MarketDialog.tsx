import { Dialog, DialogContent } from "./ui/dialog";
import { Button } from "./ui/button";
import { useState } from "react";
import { useUserBuildings } from "@/hooks/useUserBuildings";
import { useBuildingPrices } from "@/hooks/useBuildingPrices";
import { UpgradeBuildingDialog } from "./UpgradeBuildingDialog";
import { SkinSelectorDialog } from "./SkinSelectorDialog";
import { BUILDING_TYPES } from "@/lib/constants";
import { Palette } from "lucide-react";
import { getBuildingImage } from "@/lib/buildingImages";

interface MarketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | undefined;
}

export const MarketDialog = ({ open, onOpenChange, userId }: MarketDialogProps) => {
  const { getBuildingByType, refetch } = useUserBuildings(userId);
  const { getPrice, loading: pricesLoading } = useBuildingPrices();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showSkinSelector, setShowSkinSelector] = useState(false);

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
        <DialogContent hideCloseButton className="w-full h-full md:w-[92vw] md:h-auto md:max-w-2xl p-0 sm:rounded-lg bg-gradient-to-b from-amber-50 to-orange-50 border-2 border-amber-300">
          <div className="flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-amber-200 bg-amber-100/50">
              <h2 className="text-2xl font-bold text-amber-900">🏪 Market</h2>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="hover:bg-amber-200/50">
                ✕
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto p-6 space-y-6">
                {/* Market Image */}
                <div className="flex flex-col items-center gap-3">
                  <div className="text-9xl">{market?.selected_skin || getBuildingImage('market', currentLevel)}</div>
                  
                  {/* Edit Skin Button */}
                  {market && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSkinSelector(true)}
                      className="border-amber-300 hover:bg-amber-100"
                    >
                      <Palette className="w-4 h-4 mr-2" />
                      Cambiar apariencia
                    </Button>
                  )}
                </div>

                {/* Current Level */}
                <div className="text-center">
                  <div className="text-sm text-amber-700">Nivel actual</div>
                  <div className="text-3xl font-bold text-amber-900">Nivel {currentLevel}</div>
                </div>

                {/* Stats */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-amber-100 rounded-lg border border-amber-200">
                    <span className="text-sm text-amber-900">Capacidad de venta</span>
                    <span className="font-semibold text-amber-900">{market?.capacity.toLocaleString() || 0}</span>
                  </div>
                </div>

                {/* Upgrade Section */}
                {canUpgrade && (
                  <div className="border-t border-amber-200 pt-4 space-y-3">
                    <div className="text-sm font-medium text-amber-900">Mejorar edificio</div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-amber-700">Nivel {currentLevel}</span>
                      <span className="text-amber-600">→</span>
                      <span className="text-sm font-semibold text-amber-900">Nivel {currentLevel + 1}</span>
                    </div>
                    <div className="p-3 bg-amber-100 rounded-lg space-y-2 border border-amber-200">
                      <div className="flex justify-between text-sm">
                        <span className="text-amber-800">Nueva capacidad:</span>
                        <span className="font-semibold text-amber-900">{nextLevelPrice?.capacity.toLocaleString()}</span>
                      </div>
                    </div>
                    <Button 
                      className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg" 
                      size="lg"
                      onClick={() => {
                        onOpenChange(false);
                        setShowUpgrade(true);
                      }}
                      disabled={pricesLoading}
                    >
                      Subir de nivel - {nextLevelPrice?.price_ton} TON
                    </Button>
                  </div>
                )}

                {currentLevel >= 5 && (
                  <div className="text-center text-sm text-amber-700 bg-amber-100 p-3 rounded-lg border border-amber-200">
                    🏆 Nivel máximo alcanzado
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {market && showUpgrade && nextLevelPrice && (
        <UpgradeBuildingDialog
          open={showUpgrade}
          onOpenChange={(open) => {
            setShowUpgrade(open);
            if (!open) {
              onOpenChange(true);
            }
          }}
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

      {market && (
        <SkinSelectorDialog
          open={showSkinSelector}
          onOpenChange={setShowSkinSelector}
          buildingId={market.id}
          buildingType={BUILDING_TYPES.MARKET}
          userId={userId}
          currentSkin={market.selected_skin}
          onSkinSelected={refetch}
        />
      )}
    </>
  );
};
