import { Dialog, DialogContent } from "./ui/dialog";
import { Button } from "./ui/button";
import { useState, useEffect, useMemo } from "react";
import { useUserBuildings } from "@/hooks/useUserBuildings";
import { useBuildingPrices } from "@/hooks/useBuildingPrices";
import { UpgradeBuildingDialog } from "./UpgradeBuildingDialog";
import { SkinSelectorDialog } from "./SkinSelectorDialog";
import { BUILDING_TYPES } from "@/lib/constants";
import { Palette, Edit } from "lucide-react";
import { getBuildingDisplay } from "@/lib/buildingImages";
import { useBuildingSkins } from "@/hooks/useBuildingSkins";

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
  const { getSkinByKey } = useBuildingSkins(BUILDING_TYPES.MARKET);

  const market = getBuildingByType(BUILDING_TYPES.MARKET);
  const currentLevel = market?.level || 1;
  const nextLevelPrice = getPrice(BUILDING_TYPES.MARKET, currentLevel + 1);
  const canUpgrade = currentLevel < 5 && nextLevelPrice;

  // Refetch market data when modal opens to ensure we have the latest selected_skin
  useEffect(() => {
    if (open) {
      refetch();
    }
  }, [open, refetch]);

  // Get skin info from database if selected_skin is set
  const skinInfo = useMemo(() => {
    if (!market?.selected_skin) return null;
    return getSkinByKey(market.selected_skin);
  }, [market?.selected_skin, getSkinByKey]);

  // Get building display (image or emoji)
  // Use the same pattern as WarehouseDialog for consistency
  // Always return an image - use market skin if available, otherwise default to level 1
  const buildingDisplay = useMemo(() => {
    if (!market) {
      // If no market, use default level 1 image
      return getBuildingDisplay(
        'market',
        1,
        null,
        undefined
      );
    }
    try {
      return getBuildingDisplay(
        'market',
        market.level,
        market.selected_skin || null,
        skinInfo || undefined
      );
    } catch (error) {
      console.error('[MarketDialog] Error getting building display:', error);
      // Fallback to level 1 if there's an error
      return getBuildingDisplay(
        'market',
        1,
        null,
        undefined
      );
    }
  }, [market?.selected_skin, market?.level, skinInfo]);

  const handleUpgradeComplete = () => {
    refetch();
    setShowUpgrade(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent hideCloseButton className="w-[95vw] max-w-2xl max-h-[90vh] p-0 sm:rounded-lg bg-gradient-to-b from-green-50 to-emerald-50 border-2 border-green-300 flex flex-col overflow-hidden">
          {/* Header - Fixed */}
          <div className="flex items-center justify-between p-4 border-b border-green-200 bg-green-100/50 flex-shrink-0">
            <h2 className="text-xl md:text-2xl font-bold text-green-900">Market</h2>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="hover:bg-green-200/50 flex-shrink-0">
              ✕
            </Button>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-4 md:p-6 space-y-4 md:space-y-6 pb-6">
              {/* Market Card with Edit Button */}
              <div className="relative border-2 border-green-300 rounded-xl bg-gradient-to-br from-green-100 to-green-50 p-4 md:p-6">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    console.log('[MarketDialog] Edit button clicked, opening skin selector', { 
                      market: market?.id, 
                      userId,
                      showSkinSelector: false 
                    });
                    setShowSkinSelector(true);
                  }}
                  className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-md hover:bg-white transition-colors z-10"
                  type="button"
                >
                  <Edit className="h-4 w-4" />
                </button>
                
                <div className="flex flex-col items-center gap-3">
                  {buildingDisplay && buildingDisplay.src ? (
                    <img 
                      src={buildingDisplay.src} 
                      alt="Market" 
                      className="w-24 h-24 md:w-32 md:h-32 object-contain"
                      onError={(e) => {
                        console.error('[MarketDialog] Image failed to load:', buildingDisplay.src);
                        console.error('[MarketDialog] This should not happen - image should always be available');
                      }}
                    />
                  ) : (
                    <div className="w-24 h-24 md:w-32 md:h-32 flex items-center justify-center text-3xl md:text-4xl">
                      🏪
                    </div>
                  )}
                  <div className="text-center">
                    <h3 className="font-bold text-green-900 text-base md:text-lg">Market</h3>
                    <p className="text-sm text-green-700">Lvl {currentLevel}</p>
                  </div>
                </div>
              </div>

              {/* Current Level */}
              <div className="text-center">
                <div className="text-xs md:text-sm text-green-700">Nivel actual</div>
                <div className="text-2xl md:text-3xl font-bold text-green-900">Nivel {currentLevel}</div>
              </div>

              {/* Stats */}
              <div className="space-y-2 md:space-y-3">
                <div className="flex justify-between items-center p-3 bg-green-100 rounded-lg border border-green-200">
                  <span className="text-xs md:text-sm text-green-900">Capacidad de venta</span>
                  <span className="font-semibold text-sm md:text-base text-green-900">{market?.capacity.toLocaleString() || 0}</span>
                </div>
              </div>

              {/* Upgrade Section */}
              {canUpgrade && (
                <div className="border-t border-green-200 pt-4 space-y-3">
                  <div className="text-sm font-medium text-green-900">Mejorar edificio</div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs md:text-sm text-green-700">Nivel {currentLevel}</span>
                    <span className="text-green-600">→</span>
                    <span className="text-xs md:text-sm font-semibold text-green-900">Nivel {currentLevel + 1}</span>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg space-y-2 border border-green-200">
                    <div className="flex justify-between text-xs md:text-sm">
                      <span className="text-green-800">Nueva capacidad:</span>
                      <span className="font-semibold text-green-900">{nextLevelPrice?.capacity.toLocaleString()}</span>
                    </div>
                  </div>
                  <Button 
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl text-sm md:text-base"
                    size="lg"
                    onClick={() => {
                      setShowUpgrade(true);
                    }}
                    disabled={pricesLoading}
                  >
                    <span className="font-bold">⬆️ Subir de nivel - {nextLevelPrice?.price_ton} TON</span>
                  </Button>
                </div>
              )}

              {currentLevel >= 5 && (
                <div className="text-center text-xs md:text-sm text-green-700 bg-green-100 p-3 rounded-lg border border-green-200">
                  🏆 Nivel máximo alcanzado
                </div>
              )}
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

      <SkinSelectorDialog
        open={showSkinSelector}
        onOpenChange={setShowSkinSelector}
        buildingId={market?.id}
        buildingType={BUILDING_TYPES.MARKET}
        buildingLevel={currentLevel}
        userId={userId}
        currentSkin={market?.selected_skin || null}
        onSkinSelected={() => {
          refetch();
          setShowSkinSelector(false);
        }}
      />
    </>
  );
};
