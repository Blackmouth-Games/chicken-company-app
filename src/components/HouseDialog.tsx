import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { useState, useMemo } from "react";
import { useUserBuildings } from "@/hooks/useUserBuildings";
import { useBuildingPrices } from "@/hooks/useBuildingPrices";
import { UpgradeBuildingDialog } from "./UpgradeBuildingDialog";
import { BUILDING_TYPES } from "@/lib/constants";
import { getBuildingDisplay } from "@/lib/buildingImages";
import { useBuildingSkins } from "@/hooks/useBuildingSkins";

interface HouseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | undefined;
}

export const HouseDialog = ({ open, onOpenChange, userId }: HouseDialogProps) => {
  const { getBuildingByType, refetch } = useUserBuildings(userId);
  const { getPrice, loading: pricesLoading } = useBuildingPrices();
  const [showUpgrade, setShowUpgrade] = useState<{ type: 'warehouse' | 'market'; open: boolean }>({ type: 'warehouse', open: false });
  
  // House skins (assuming house uses 'house' as building type, or we can use a default)
  const { getSkinByKey: getWarehouseSkinByKey } = useBuildingSkins(BUILDING_TYPES.WAREHOUSE);
  const { getSkinByKey: getMarketSkinByKey } = useBuildingSkins(BUILDING_TYPES.MARKET);

  const warehouse = getBuildingByType(BUILDING_TYPES.WAREHOUSE);
  const market = getBuildingByType(BUILDING_TYPES.MARKET);
  
  const warehouseLevel = warehouse?.level || 1;
  const marketLevel = market?.level || 1;
  
  const warehouseNextPrice = getPrice(BUILDING_TYPES.WAREHOUSE, warehouseLevel + 1);
  const marketNextPrice = getPrice(BUILDING_TYPES.MARKET, marketLevel + 1);
  
  const canUpgradeWarehouse = warehouseLevel < 5 && warehouseNextPrice;
  const canUpgradeMarket = marketLevel < 5 && marketNextPrice;

  // House display (using default house emoji for now, can be extended)
  const houseDisplay = useMemo(() => {
    return getBuildingDisplay('corral', 1, null, undefined); // Using corral as fallback, or we can add 'house' type
  }, []);

  // Warehouse display
  const warehouseSkinInfo = useMemo(() => {
    if (!warehouse?.selected_skin) return null;
    return getWarehouseSkinByKey(warehouse.selected_skin);
  }, [warehouse?.selected_skin, getWarehouseSkinByKey]);

  const warehouseDisplay = useMemo(() => {
    if (!warehouse) return null;
    return getBuildingDisplay(
      'warehouse',
      warehouseLevel,
      warehouse.selected_skin || null,
      warehouseSkinInfo || undefined
    );
  }, [warehouse, warehouseLevel, warehouseSkinInfo]);

  // Market display
  const marketSkinInfo = useMemo(() => {
    if (!market?.selected_skin) return null;
    return getMarketSkinByKey(market.selected_skin);
  }, [market?.selected_skin, getMarketSkinByKey]);

  const marketDisplay = useMemo(() => {
    if (!market) return null;
    return getBuildingDisplay(
      'market',
      marketLevel,
      market.selected_skin || null,
      marketSkinInfo || undefined
    );
  }, [market, marketLevel, marketSkinInfo]);

  const handleUpgradeComplete = () => {
    refetch();
    setShowUpgrade({ type: 'warehouse', open: false });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent hideCloseButton className="w-full h-full md:w-[92vw] md:h-auto md:max-w-3xl p-0 sm:rounded-lg bg-gradient-to-b from-amber-50 to-orange-50 border-2 border-amber-300 max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-amber-200 bg-amber-100/50">
              <h2 className="text-2xl font-bold text-amber-900">🏠 Masía del Granjero</h2>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="hover:bg-amber-200/50">
                ✕
              </Button>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto p-6 space-y-6">
                {/* House Section */}
                <div className="relative border-2 border-amber-300 rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 p-6">
                  <div className="flex flex-col items-center gap-3">
                    {houseDisplay?.type === 'image' ? (
                      <img 
                        src={houseDisplay.src} 
                        alt="Casa" 
                        className="w-32 h-32 object-contain"
                      />
                    ) : (
                      <div className="text-8xl">{houseDisplay?.emoji || '🏠'}</div>
                    )}
                    <div className="text-center">
                      <h3 className="font-bold text-amber-900 text-lg">Casa del Granjero</h3>
                      <p className="text-sm text-amber-700">Centro de gestión</p>
                    </div>
                  </div>
                </div>

                {/* Warehouse Section */}
                <div className="relative border-2 border-blue-300 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 p-6">
                  
                  <div className="flex flex-col items-center gap-3">
                    {warehouseDisplay?.type === 'image' ? (
                      <img 
                        src={warehouseDisplay.src} 
                        alt="Almacén" 
                        className="w-32 h-32 object-contain"
                      />
                    ) : (
                      <div className="text-8xl">{warehouseDisplay?.emoji || '🏭'}</div>
                    )}
                    <div className="text-center">
                      <h3 className="font-bold text-blue-900 text-lg">🏭 Almacén</h3>
                      <p className="text-sm text-blue-700">Lvl {warehouseLevel}</p>
                    </div>
                  </div>

                  {/* Warehouse Stats */}
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between items-center p-2 bg-blue-100 rounded-lg border border-blue-200">
                      <span className="text-sm text-blue-900">Capacidad</span>
                      <span className="font-semibold text-blue-900">{warehouse?.capacity.toLocaleString() || 0}</span>
                    </div>
                  </div>

                  {/* Warehouse Upgrade */}
                  {canUpgradeWarehouse && (
                    <div className="mt-4 border-t border-blue-200 pt-4">
                      <Button 
                        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white" 
                        onClick={() => setShowUpgrade({ type: 'warehouse', open: true })}
                        disabled={pricesLoading}
                      >
                        ⬆️ Subir de nivel - {warehouseNextPrice?.price_ton} TON
                      </Button>
                    </div>
                  )}
                  {warehouseLevel >= 5 && (
                    <div className="mt-4 text-center text-sm text-blue-700 bg-blue-100 p-2 rounded-lg border border-blue-200">
                      🏆 Nivel máximo alcanzado
                    </div>
                  )}
                </div>

                {/* Market Section */}
                <div className="relative border-2 border-green-300 rounded-xl bg-gradient-to-br from-green-100 to-green-50 p-6">
                  
                  <div className="flex flex-col items-center gap-3">
                    {marketDisplay?.type === 'image' ? (
                      <img 
                        src={marketDisplay.src} 
                        alt="Market" 
                        className="w-32 h-32 object-contain"
                      />
                    ) : (
                      <div className="text-8xl">{marketDisplay?.emoji || '🏪'}</div>
                    )}
                    <div className="text-center">
                      <h3 className="font-bold text-green-900 text-lg">🏪 Market</h3>
                      <p className="text-sm text-green-700">Lvl {marketLevel}</p>
                    </div>
                  </div>

                  {/* Market Stats */}
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between items-center p-2 bg-green-100 rounded-lg border border-green-200">
                      <span className="text-sm text-green-900">Capacidad de venta</span>
                      <span className="font-semibold text-green-900">{market?.capacity.toLocaleString() || 0}</span>
                    </div>
                  </div>

                  {/* Market Upgrade */}
                  {canUpgradeMarket && (
                    <div className="mt-4 border-t border-green-200 pt-4">
                      <Button 
                        className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white" 
                        onClick={() => setShowUpgrade({ type: 'market', open: true })}
                        disabled={pricesLoading}
                      >
                        ⬆️ Subir de nivel - {marketNextPrice?.price_ton} TON
                      </Button>
                    </div>
                  )}
                  {marketLevel >= 5 && (
                    <div className="mt-4 text-center text-sm text-green-700 bg-green-100 p-2 rounded-lg border border-green-200">
                      🏆 Nivel máximo alcanzado
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upgrade Dialogs */}
      {warehouse && showUpgrade.type === 'warehouse' && showUpgrade.open && warehouseNextPrice && (
        <UpgradeBuildingDialog
          open={showUpgrade.open}
          onOpenChange={(open) => {
            setShowUpgrade({ type: 'warehouse', open });
            if (!open) {
              onOpenChange(true);
            }
          }}
          buildingId={warehouse.id}
          buildingType={BUILDING_TYPES.WAREHOUSE}
          currentLevel={warehouseLevel}
          nextLevel={warehouseLevel + 1}
          userId={userId || ""}
          upgradePrice={warehouseNextPrice.price_ton}
          newCapacity={warehouseNextPrice.capacity}
          onUpgradeComplete={handleUpgradeComplete}
        />
      )}

      {market && showUpgrade.type === 'market' && showUpgrade.open && marketNextPrice && (
        <UpgradeBuildingDialog
          open={showUpgrade.open}
          onOpenChange={(open) => {
            setShowUpgrade({ type: 'market', open });
            if (!open) {
              onOpenChange(true);
            }
          }}
          buildingId={market.id}
          buildingType={BUILDING_TYPES.MARKET}
          currentLevel={marketLevel}
          nextLevel={marketLevel + 1}
          userId={userId || ""}
          upgradePrice={marketNextPrice.price_ton}
          newCapacity={marketNextPrice.capacity}
          onUpgradeComplete={handleUpgradeComplete}
        />
      )}
    </>
  );
};
