import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Info, Edit } from "lucide-react";
import { useState, useMemo } from "react";
import { UpgradeBuildingDialog } from "./UpgradeBuildingDialog";
import { SkinSelectorDialog } from "./SkinSelectorDialog";
import { useUserBuildings } from "@/hooks/useUserBuildings";
import { useBuildingPrices } from "@/hooks/useBuildingPrices";
import { useBuildingSkins } from "@/hooks/useBuildingSkins";
import { getBuildingDisplay } from "@/lib/buildingImages";
import { BUILDING_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface CoopDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | undefined;
  buildingId: string | undefined;
}

export const CoopDialog = ({ open, onOpenChange, userId, buildingId }: CoopDialogProps) => {
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showSkinSelector, setShowSkinSelector] = useState(false);
  const [selectedMultiplier, setSelectedMultiplier] = useState<1 | 5 | 10>(1);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [infoModalContent, setInfoModalContent] = useState<{ title: string; message: string } | null>(null);
  const { buildings, refetch } = useUserBuildings(userId);
  const { prices } = useBuildingPrices();
  const { getSkinByKey } = useBuildingSkins('coop');

  const coop = buildings.find(b => b.id === buildingId);
  const currentLevel = coop?.level ?? 1;
  const nextLevel = coop ? coop.level + 1 : 2;
  const nextLevelPrice = prices.find(p => p.building_type === 'coop' && p.level === nextLevel);
  const upgradePrice = nextLevelPrice?.price_ton || 0;
  const nextLevelCapacity = nextLevelPrice?.capacity || 0;
  const canUpgrade = currentLevel < 5 && nextLevelPrice;

  // Get skin info from database if selected_skin is set
  const skinInfo = useMemo(() => {
    if (!coop?.selected_skin) return null;
    return getSkinByKey(coop.selected_skin);
  }, [coop?.selected_skin, getSkinByKey]);

  // Get building display (image or emoji)
  const buildingDisplay = useMemo(() => {
    if (!coop) return null;
    return getBuildingDisplay(
      'coop',
      coop.level,
      coop.selected_skin || null,
      skinInfo || undefined
    );
  }, [coop?.selected_skin, coop?.level, skinInfo]);

  if (!coop) return null;

  const efficiency = coop.current_chickens > 0 
    ? Math.min(100, Math.round((coop.current_chickens / coop.capacity) * 100))
    : 0;

  const earnRate = (coop.current_chickens * 0.001).toFixed(3);

  const handleUpgradeComplete = () => {
    refetch();
    setShowUpgrade(false);
    // Keep dialog open after upgrade (same as warehouse and market)
  };

  const handleStakeChickens = () => {
    // TODO: Implement staking logic with selectedMultiplier
    console.log(`Staking chickens with multiplier: x${selectedMultiplier}`);
  };

  const handleInfoClick = (title: string, message: string) => {
    setInfoModalContent({ title, message });
    setInfoModalOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Coop
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-4 md:p-6 space-y-4 md:space-y-6 pb-6">
          {/* Building Card */}
          <div className="bg-gradient-to-br from-green-100 to-green-50 rounded-lg p-4 border-2 border-green-400 relative">
            <button
              onClick={() => setShowSkinSelector(true)}
              className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-md hover:bg-white transition-colors"
            >
              <Edit className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3">
              {buildingDisplay && buildingDisplay.type === 'image' ? (
                <img 
                  src={buildingDisplay.src} 
                  alt="Coop" 
                  className="w-32 h-32 object-contain"
                />
              ) : (
                <div className="text-6xl">🏠</div>
              )}
              <div className="flex-1">
                <h3 className="font-bold text-lg">Coop</h3>
                <p className="text-sm text-muted-foreground">Lvl {coop.level}</p>
              </div>
            </div>
          </div>

          {/* Chicken Info */}
          <div className="bg-white rounded-lg p-4 border-2 border-border space-y-3">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-4xl">🐔</div>
              <div className="flex gap-2 items-center flex-wrap">
                <button 
                  onClick={() => setSelectedMultiplier(1)}
                  className={cn(
                    "px-3 py-1 border rounded text-sm transition-colors",
                    selectedMultiplier === 1 
                      ? "border-green-500 bg-green-100 text-green-700 font-bold" 
                      : "border-border hover:border-green-300"
                  )}
                >
                  x1
                </button>
                <button 
                  onClick={() => setSelectedMultiplier(5)}
                  className={cn(
                    "px-3 py-1 border rounded text-sm transition-colors",
                    selectedMultiplier === 5 
                      ? "border-green-500 bg-green-100 text-green-700 font-bold" 
                      : "border-border hover:border-green-300"
                  )}
                >
                  x5
                </button>
                <button 
                  onClick={() => setSelectedMultiplier(10)}
                  className={cn(
                    "px-3 py-1 border rounded text-sm transition-colors",
                    selectedMultiplier === 10 
                      ? "border-green-500 bg-green-100 text-green-700 font-bold" 
                      : "border-border hover:border-green-300"
                  )}
                >
                  x10
                </button>
                <Button 
                  size="sm" 
                  className="bg-green-500 hover:bg-green-600"
                  onClick={handleStakeChickens}
                >
                  stake gallinas
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-white/80 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <button 
                  type="button" 
                  className="text-green-600 hover:text-green-800 transition-colors"
                  onClick={() => handleInfoClick(
                    "Valor",
                    "Valor total de las gallinas actualmente en el coop. Este valor se calcula basándose en el número de gallinas y su valor individual."
                  )}
                >
                  <Info className="h-4 w-4" />
                </button>
                <span className="text-xs md:text-sm text-green-900 font-medium">Valor:</span>
              </div>
              <span className="font-semibold text-sm md:text-base text-green-900 bg-gray-100 px-3 py-1 rounded">
                0.000 $TON
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-white/80 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <button 
                  type="button" 
                  className="text-green-600 hover:text-green-800 transition-colors"
                  onClick={() => handleInfoClick(
                    "Gallinas",
                    `Número actual de gallinas en el coop: ${coop.current_chickens} de ${coop.capacity} capacidad máxima. Puedes aumentar la capacidad mejorando el nivel del coop.`
                  )}
                >
                  <Info className="h-4 w-4" />
                </button>
                <span className="text-xs md:text-sm text-green-900 font-medium">Gallinas:</span>
              </div>
              <span className="font-semibold text-sm md:text-base text-orange-600 font-bold bg-gray-100 px-3 py-1 rounded">
                {coop.current_chickens} / {coop.capacity}
              </span>
            </div>
            <Progress value={(coop.current_chickens / coop.capacity) * 100} className="h-2" />

            <div className="flex items-center justify-between p-3 bg-white/80 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <button 
                  type="button" 
                  className="text-green-600 hover:text-green-800 transition-colors"
                  onClick={() => handleInfoClick(
                    "Eficiencia",
                    `La eficiencia del coop es ${efficiency}%, calculada como el porcentaje de capacidad utilizada. Una eficiencia alta indica que el coop está siendo utilizado al máximo de su capacidad.`
                  )}
                >
                  <Info className="h-4 w-4" />
                </button>
                <span className="text-xs md:text-sm text-green-900 font-medium">Eficiencia:</span>
              </div>
              <span className="font-semibold text-sm md:text-base text-green-900 bg-gray-100 px-3 py-1 rounded">
                {efficiency}%
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-white/80 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <button 
                  type="button" 
                  className="text-green-600 hover:text-green-800 transition-colors"
                  onClick={() => handleInfoClick(
                    "Total Obtenido",
                    "Total de ganancias obtenidas desde que comenzaste a usar este coop. Este valor representa todas las ganancias acumuladas a lo largo del tiempo."
                  )}
                >
                  <Info className="h-4 w-4" />
                </button>
                <span className="text-xs md:text-sm text-green-900 font-medium">Total Obtenido:</span>
              </div>
              <span className="font-semibold text-sm md:text-base text-green-900 bg-gray-100 px-3 py-1 rounded">
                0.000 $TON
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-white/80 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <button 
                  type="button" 
                  className="text-green-600 hover:text-green-800 transition-colors"
                  onClick={() => handleInfoClick(
                    "Earn esperado",
                    `Ganancia esperada por día basada en el número actual de gallinas (${coop.current_chickens}). Esta es una estimación de las ganancias diarias que puedes esperar con la configuración actual del coop.`
                  )}
                >
                  <Info className="h-4 w-4" />
                </button>
                <span className="text-xs md:text-sm text-green-900 font-medium">Earn esperado:</span>
              </div>
              <span className="font-semibold text-sm md:text-base text-green-900 bg-gray-100 px-3 py-1 rounded">
                {earnRate} $TON / Day
              </span>
            </div>
          </div>

          {/* Upgrade Section */}
          {canUpgrade && (
            <div className="bg-muted/50 rounded-lg p-4 border border-border space-y-3">
              <div className="text-sm font-medium text-green-900">Mejorar edificio</div>
              
              <div className="flex items-center justify-between p-3 bg-white/80 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <button 
                    type="button" 
                    className="text-green-600 hover:text-green-800 transition-colors"
                    onClick={() => handleInfoClick(
                      "Nivel",
                      "El nivel del coop determina su capacidad máxima. Al subir de nivel, el coop puede albergar más gallinas, lo que aumenta tus ganancias potenciales."
                    )}
                  >
                    <Info className="h-4 w-4" />
                  </button>
                  <span className="text-xs md:text-sm text-green-900 font-medium">Nivel:</span>
                </div>
                <span className="font-semibold text-sm md:text-base text-green-900 bg-gray-100 px-3 py-1 rounded">
                  {coop.level} → {nextLevel}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-white/80 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <button 
                    type="button" 
                    className="text-green-600 hover:text-green-800 transition-colors"
                    onClick={() => handleInfoClick(
                      "Max. Capacity",
                      `La capacidad máxima aumentará de ${coop.capacity} a ${nextLevelCapacity} gallinas al subir de nivel. Esto te permitirá tener más gallinas y generar más ganancias.`
                    )}
                  >
                    <Info className="h-4 w-4" />
                  </button>
                  <span className="text-xs md:text-sm text-green-900 font-medium">Max. Capacity:</span>
                </div>
                <span className="font-semibold text-sm md:text-base text-green-900 bg-gray-100 px-3 py-1 rounded">
                  {coop.capacity} → {nextLevelCapacity}
                </span>
              </div>

              <Button 
                onClick={() => setShowUpgrade(true)}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl text-sm md:text-base"
                size="lg"
              >
                <span className="font-bold">⬆️ Subir de nivel</span>
              </Button>
            </div>
          )}
          
          {!canUpgrade && currentLevel >= 5 && (
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <div className="text-sm font-medium text-green-900 mb-2">Nivel máximo alcanzado</div>
              <p className="text-xs text-muted-foreground">
                Este coop ha alcanzado el nivel máximo (5). No se puede mejorar más.
              </p>
            </div>
          )}

          {/* Withdraw Section */}
          <div className="flex gap-2">
            <div className="flex-1 bg-muted/50 rounded-lg p-3 border border-border text-center">
              <div className="text-sm">0.000 $TON</div>
            </div>
            <Button variant="outline" className="px-6">
              WithDraw
            </Button>
          </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {coop && (
        <UpgradeBuildingDialog
          open={showUpgrade}
          onOpenChange={(open) => {
            setShowUpgrade(open);
            if (!open) {
              // Keep coop dialog open when upgrade dialog closes
              onOpenChange(true);
            }
          }}
          buildingId={buildingId || ''}
          buildingType="coop"
          currentLevel={coop?.level || 1}
          nextLevel={nextLevel}
          userId={userId || ''}
          upgradePrice={upgradePrice}
          newCapacity={nextLevelCapacity}
          onUpgradeComplete={handleUpgradeComplete}
        />
      )}

      <SkinSelectorDialog
        open={showSkinSelector}
        onOpenChange={setShowSkinSelector}
        buildingId={buildingId}
        buildingType={BUILDING_TYPES.COOP}
        buildingLevel={coop?.level}
        userId={userId}
        currentSkin={coop?.selected_skin || null}
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
              <Info className="h-5 w-5 text-green-600" />
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

