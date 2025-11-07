import { Dialog, DialogContent } from "./ui/dialog";
import { Button } from "./ui/button";
import { useState } from "react";
import { useUserBuildings } from "@/hooks/useUserBuildings";
import { useBuildingPrices } from "@/hooks/useBuildingPrices";
import { UpgradeBuildingDialog } from "./UpgradeBuildingDialog";
import { SkinSelectorDialog } from "./SkinSelectorDialog";
import { BUILDING_TYPES } from "@/lib/constants";
import { Pencil } from "lucide-react";

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
        <DialogContent className="fixed inset-0 max-w-none w-full h-full m-0 p-0 rounded-none border-0 bg-background z-[100]">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold">Almacén</h2>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                ✕
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto p-6 space-y-6">
                {/* Warehouse Image */}
                <div className="flex justify-center">
                  <div className="text-9xl">{warehouse?.selected_skin ? "🏢" : "🏭"}</div>
                </div>

                {/* Edit Skin Button */}
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setShowSkinSelector(true)}
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Editar Skin
                  </Button>
                </div>

                {/* Current Level */}
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Nivel actual</div>
                  <div className="text-3xl font-bold">Nivel {currentLevel}</div>
                </div>

                {/* Stats */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="text-sm">Capacidad de almacenamiento</span>
                    <span className="font-semibold">{warehouse?.capacity.toLocaleString() || 0}</span>
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
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {warehouse && nextLevelPrice && (
        <UpgradeBuildingDialog
          open={showUpgrade}
          onOpenChange={setShowUpgrade}
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
