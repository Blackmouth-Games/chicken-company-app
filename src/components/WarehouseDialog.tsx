import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { useState, useEffect, useMemo } from "react";
import { useUserBuildings } from "@/hooks/useUserBuildings";
import { useBuildingPrices } from "@/hooks/useBuildingPrices";
import { UpgradeBuildingDialog } from "./UpgradeBuildingDialog";
import { SkinSelectorDialog } from "./SkinSelectorDialog";
import { BUILDING_TYPES } from "@/lib/constants";
import { Palette, Edit, Info } from "lucide-react";
import { getBuildingDisplay } from "@/lib/buildingImages";
import { useBuildingSkins } from "@/hooks/useBuildingSkins";

interface WarehouseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | undefined;
}

export const WarehouseDialog = ({ open, onOpenChange, userId }: WarehouseDialogProps) => {
  const { getBuildingByType, refetch, buildings } = useUserBuildings(userId);
  const { getPrice, loading: pricesLoading } = useBuildingPrices();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showSkinSelector, setShowSkinSelector] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [infoModalContent, setInfoModalContent] = useState<{ title: string; message: string } | null>(null);
  const { getSkinByKey } = useBuildingSkins(BUILDING_TYPES.WAREHOUSE);

  const warehouse = getBuildingByType(BUILDING_TYPES.WAREHOUSE);
  // If warehouse doesn't exist, treat it as level 1 (default building)
  const currentLevel = warehouse?.level ?? 1;
  const nextLevelPrice = getPrice(BUILDING_TYPES.WAREHOUSE, currentLevel + 1);
  const canUpgrade = currentLevel < 5 && nextLevelPrice;
  
  // Create a virtual warehouse object if it doesn't exist
  const warehouseData = warehouse || {
    id: '', // Will be created when upgrading
    level: 1,
    capacity: 100, // Default capacity for level 1
    selected_skin: null,
  };

  // Debug: Log warehouse status
  useEffect(() => {
    if (open) {
      console.log("[WarehouseDialog] Warehouse status:", {
        warehouse,
        warehouseId: warehouse?.id,
        currentLevel,
        nextLevelPrice,
        canUpgrade,
        userId,
        buildingsCount: buildings.length,
        allBuildings: buildings.map(b => ({ type: b.building_type, id: b.id, level: b.level }))
      });
    }
  }, [open, warehouse, currentLevel, nextLevelPrice, canUpgrade, userId, buildings]);

  // Refetch warehouse data when modal opens to ensure we have the latest selected_skin
  useEffect(() => {
    if (open) {
      refetch();
    }
  }, [open, refetch]);

  // Get skin info from database if selected_skin is set
  const skinInfo = useMemo(() => {
    if (!warehouseData?.selected_skin) return null;
    return getSkinByKey(warehouseData.selected_skin);
  }, [warehouseData?.selected_skin, getSkinByKey]);

  // Get building display (image or emoji)
  // Use the same pattern as CorralDialog for consistency
  // Always return an image - use warehouse skin if available, otherwise default to level 1
  const buildingDisplay = useMemo(() => {
    try {
      return getBuildingDisplay(
        'warehouse',
        warehouseData.level,
        warehouseData.selected_skin || null,
        skinInfo || undefined
      );
    } catch (error) {
      console.error('[WarehouseDialog] Error getting building display:', error);
      // Fallback to level 1 if there's an error
      return getBuildingDisplay(
        'warehouse',
        1,
        null,
        undefined
      );
    }
  }, [warehouseData?.selected_skin, warehouseData?.level, skinInfo]);

  const handleUpgradeComplete = () => {
    refetch();
    setShowUpgrade(false);
  };

  const handleInfoClick = (title: string, message: string) => {
    setInfoModalContent({ title, message });
    setInfoModalOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent hideCloseButton className="w-[95vw] max-w-2xl max-h-[90vh] p-0 sm:rounded-lg bg-gradient-to-b from-blue-50 to-slate-50 border-2 border-blue-300 flex flex-col overflow-hidden">
          {/* Header - Fixed */}
          <div className="flex items-center justify-between p-4 border-b border-blue-200 bg-blue-100/50 flex-shrink-0">
            <div className="flex items-center gap-3">
              <Info className="h-5 w-5 text-blue-900" />
              <h2 className="text-xl md:text-2xl font-bold text-blue-900">Almacén</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="hover:bg-blue-200/50 flex-shrink-0">
              ✕
            </Button>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-4 md:p-6 space-y-4 md:space-y-6 pb-6">
              {/* Warehouse Card with Edit Button */}
              <div className="relative border-2 border-blue-300 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 p-4 md:p-6">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    console.log("Edit button clicked, opening skin selector", { warehouse: warehouse?.id, userId });
                    setShowSkinSelector(true);
                  }}
                  className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-md hover:bg-white transition-colors z-10"
                  type="button"
                >
                  <Edit className="h-4 w-4" />
                </button>
                
                <div className="flex flex-col items-center gap-3">
                  {buildingDisplay && (
                    <img 
                      src={buildingDisplay.src} 
                      alt="Warehouse" 
                      className="w-24 h-24 md:w-32 md:h-32 object-contain"
                      onError={(e) => {
                        console.error('[WarehouseDialog] Image failed to load:', buildingDisplay.src);
                        console.error('[WarehouseDialog] This should not happen - image should always be available');
                      }}
                    />
                  )}
                  <div className="text-center">
                    <h3 className="font-bold text-blue-900 text-base md:text-lg">Almacén</h3>
                    <p className="text-sm text-blue-700">Lvl {currentLevel}</p>
                  </div>
                </div>
              </div>

              {/* Storage Data Section */}
              <div className="space-y-3 border-2 border-blue-300 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 p-4 md:p-6">
                {/* Almacenado (Stored) */}
                <div className="flex items-center justify-between p-3 bg-white/80 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2">
                    <button 
                      type="button" 
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                      onClick={() => handleInfoClick(
                        "Almacenado",
                        "Cantidad total de huevos almacenados actualmente en el almacén. Este valor representa el total de huevos que has producido y que están guardados en el almacén."
                      )}
                    >
                      <Info className="h-4 w-4" />
                    </button>
                    <span className="text-xs md:text-sm text-blue-900 font-medium">Almacenado:</span>
                  </div>
                  <span className="font-semibold text-sm md:text-base text-blue-900 bg-gray-100 px-3 py-1 rounded">
                    0.000 $TON
                  </span>
                </div>

                {/* Max Capacity */}
                <div className="flex items-center justify-between p-3 bg-white/80 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2">
                    <button 
                      type="button" 
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                      onClick={() => handleInfoClick(
                        "Max. Capacity",
                        "Capacidad máxima de almacenamiento del almacén. Puedes aumentar esta capacidad mejorando el nivel del edificio. Cada nivel aumenta significativamente la capacidad de almacenamiento."
                      )}
                    >
                      <Info className="h-4 w-4" />
                    </button>
                    <span className="text-xs md:text-sm text-blue-900 font-medium">Max. Capacity:</span>
                  </div>
                  <span className="font-semibold text-sm md:text-base text-blue-900 bg-gray-100 px-3 py-1 rounded">
                    {warehouseData.capacity.toLocaleString()} $TON
                  </span>
                </div>

                {/* Disclaimer */}
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <div>
                    <h4 className="text-sm font-semibold text-blue-900 mb-1">Disclaimer:</h4>
                    <p className="text-xs md:text-sm text-blue-700">
                      Cuidado, los huevos caducan a las 24h después de haber entrado a la almacén. Asegúrate de venderlos o procesarlos antes de que caduquen.
                    </p>
                  </div>
                </div>
              </div>

              {/* Upgrade Section */}
              {canUpgrade && (
                <div className="border-t border-blue-200 pt-4 space-y-3">
                  <div className="text-sm font-medium text-blue-900">Mejorar edificio</div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs md:text-sm text-blue-700">Nivel {currentLevel}</span>
                    <span className="text-blue-600">→</span>
                    <span className="text-xs md:text-sm font-semibold text-blue-900">Nivel {currentLevel + 1}</span>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg space-y-2 border border-blue-200">
                    <div className="flex justify-between text-xs md:text-sm">
                      <span className="text-blue-800">Nueva capacidad:</span>
                      <span className="font-semibold text-blue-900">{nextLevelPrice?.capacity.toLocaleString()}</span>
                    </div>
                  </div>
                  <Button 
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl text-sm md:text-base" 
                    size="lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      console.log("[WarehouseDialog] Upgrade button clicked", { 
                        warehouse: warehouse?.id, 
                        warehouseExists: !!warehouse,
                        currentLevel, 
                        nextLevelPrice,
                        nextLevelPriceExists: !!nextLevelPrice,
                        canUpgrade,
                        userId
                      });
                      if (warehouse && nextLevelPrice) {
                        console.log("[WarehouseDialog] Opening upgrade dialog");
                        setShowUpgrade(true);
                      } else {
                        console.error("[WarehouseDialog] Cannot upgrade: missing warehouse or nextLevelPrice", {
                          warehouse: !!warehouse,
                          warehouseId: warehouse?.id,
                          nextLevelPrice: !!nextLevelPrice,
                          userId
                        });
                      }
                    }}
                    disabled={pricesLoading || !nextLevelPrice}
                  >
                    <span className="font-bold">⬆️ Subir de nivel</span>
                  </Button>
                </div>
              )}

              {currentLevel >= 5 && (
                <div className="text-center text-xs md:text-sm text-blue-700 bg-blue-100 p-3 rounded-lg border border-blue-200">
                  🏆 Nivel máximo alcanzado
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <UpgradeBuildingDialog
        open={showUpgrade && !!nextLevelPrice}
        onOpenChange={(open) => {
          setShowUpgrade(open);
          if (!open) {
            // Keep warehouse dialog open when upgrade dialog closes
            onOpenChange(true);
          }
        }}
        buildingId={warehouseData.id || ""}
        buildingType={BUILDING_TYPES.WAREHOUSE}
        currentLevel={currentLevel}
        nextLevel={currentLevel + 1}
        userId={userId || ""}
        upgradePrice={nextLevelPrice?.price_ton || 0}
        newCapacity={nextLevelPrice?.capacity || 0}
        onUpgradeComplete={handleUpgradeComplete}
      />

      <SkinSelectorDialog
        open={showSkinSelector}
        onOpenChange={setShowSkinSelector}
        buildingId={warehouseData.id || undefined}
        buildingType={BUILDING_TYPES.WAREHOUSE}
        buildingLevel={currentLevel}
        userId={userId}
        currentSkin={warehouseData.selected_skin || null}
        onSkinSelected={() => {
          refetch();
          setShowSkinSelector(false);
        }}
      />

      {/* Information Modal */}
      <Dialog open={infoModalOpen} onOpenChange={setInfoModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600" />
              {infoModalContent?.title || "Información"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              {infoModalContent?.message || ""}
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setInfoModalOpen(false)}>
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
