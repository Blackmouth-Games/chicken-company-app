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

interface WarehouseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | undefined;
}

export const WarehouseDialog = ({ open, onOpenChange, userId }: WarehouseDialogProps) => {
  const { getBuildingByType, refetch } = useUserBuildings(userId);
  const { getPrice, loading: pricesLoading } = useBuildingPrices();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showSkinSelector, setShowSkinSelector] = useState(false);

  const warehouse = getBuildingByType(BUILDING_TYPES.WAREHOUSE);
  const currentLevel = warehouse?.level || 1;
  const nextLevelPrice = getPrice(BUILDING_TYPES.WAREHOUSE, currentLevel + 1);
  const canUpgrade = currentLevel < 5 && nextLevelPrice;

  const handleUpgradeComplete = () => {
    refetch();
    setShowUpgrade(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent hideCloseButton className="w-full h-full md:w-[92vw] md:h-auto md:max-w-2xl p-0 sm:rounded-lg bg-gradient-to-b from-blue-50 to-slate-50 border-2 border-blue-300">
          <div className="flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-blue-200 bg-blue-100/50">
              <h2 className="text-2xl font-bold text-blue-900">🏭 Almacén</h2>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="hover:bg-blue-200/50">
                ✕
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto p-6 space-y-6">
                {/* Warehouse Image */}
                <div className="flex flex-col items-center gap-3">
                  <div className="text-9xl">{warehouse?.selected_skin || getBuildingImage('warehouse', currentLevel)}</div>
                  
                  {/* Edit Skin Button */}
                  {warehouse && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSkinSelector(true)}
                      className="border-blue-300 hover:bg-blue-100"
                    >
                      <Palette className="w-4 h-4 mr-2" />
                      Cambiar apariencia
                    </Button>
                  )}
                </div>

                {/* Current Level */}
                <div className="text-center">
                  <div className="text-sm text-blue-700">Nivel actual</div>
                  <div className="text-3xl font-bold text-blue-900">Nivel {currentLevel}</div>
                </div>

                {/* Stats */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-blue-100 rounded-lg border border-blue-200">
                    <span className="text-sm text-blue-900">Capacidad de almacenamiento</span>
                    <span className="font-semibold text-blue-900">{warehouse?.capacity.toLocaleString() || 0}</span>
                  </div>
                </div>

                {/* Upgrade Section */}
                {canUpgrade && (
                  <div className="border-t border-blue-200 pt-4 space-y-3">
                    <div className="text-sm font-medium text-blue-900">Mejorar edificio</div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-700">Nivel {currentLevel}</span>
                      <span className="text-blue-600">→</span>
                      <span className="text-sm font-semibold text-blue-900">Nivel {currentLevel + 1}</span>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg space-y-2 border border-blue-200">
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-800">Nueva capacidad:</span>
                        <span className="font-semibold text-blue-900">{nextLevelPrice?.capacity.toLocaleString()}</span>
                      </div>
                    </div>
                    <Button 
                      className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl" 
                      size="lg"
                      onClick={() => {
                        setShowUpgrade(true);
                        setTimeout(() => onOpenChange(false), 100);
                      }}
                      disabled={pricesLoading}
                    >
                      <span className="text-base font-bold">⬆️ Subir de nivel - {nextLevelPrice?.price_ton} TON</span>
                    </Button>
                  </div>
                )}

                {currentLevel >= 5 && (
                  <div className="text-center text-sm text-blue-700 bg-blue-100 p-3 rounded-lg border border-blue-200">
                    🏆 Nivel máximo alcanzado
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {warehouse && showUpgrade && nextLevelPrice && (
        <UpgradeBuildingDialog
          open={showUpgrade}
          onOpenChange={(open) => {
            setShowUpgrade(open);
            if (!open) {
              onOpenChange(true);
            }
          }}
          buildingId={warehouse.id}
          buildingType={BUILDING_TYPES.WAREHOUSE}
          currentLevel={currentLevel}
          nextLevel={currentLevel + 1}
          userId={userId || ""}
          upgradePrice={nextLevelPrice.price_ton}
          newCapacity={nextLevelPrice.capacity}
          onUpgradeComplete={handleUpgradeComplete}
        />
      )}

      {warehouse && (
        <SkinSelectorDialog
          open={showSkinSelector}
          onOpenChange={setShowSkinSelector}
          buildingId={warehouse.id}
          buildingType={BUILDING_TYPES.WAREHOUSE}
          userId={userId}
          currentSkin={warehouse.selected_skin}
          onSkinSelected={refetch}
        />
      )}
    </>
  );
};
