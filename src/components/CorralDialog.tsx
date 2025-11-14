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

interface CorralDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | undefined;
  buildingId: string | undefined;
}

export const CorralDialog = ({ open, onOpenChange, userId, buildingId }: CorralDialogProps) => {
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showSkinSelector, setShowSkinSelector] = useState(false);
  const [selectedMultiplier, setSelectedMultiplier] = useState<1 | 5 | 10>(1);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [infoModalContent, setInfoModalContent] = useState<{ title: string; message: string } | null>(null);
  const { buildings, refetch } = useUserBuildings(userId);
  const { prices } = useBuildingPrices();
  const { getSkinByKey } = useBuildingSkins('corral');

  const corral = buildings.find(b => b.id === buildingId);
  const nextLevel = corral ? corral.level + 1 : 2;
  const nextLevelPrice = prices.find(p => p.building_type === 'corral' && p.level === nextLevel);
  const upgradePrice = nextLevelPrice?.price_ton || 0;
  const nextLevelCapacity = nextLevelPrice?.capacity || 0;

  // Get skin info from database if selected_skin is set
  const skinInfo = useMemo(() => {
    if (!corral?.selected_skin) return null;
    return getSkinByKey(corral.selected_skin);
  }, [corral?.selected_skin, getSkinByKey]);

  // Get building display (image or emoji)
  const buildingDisplay = useMemo(() => {
    if (!corral) return null;
    return getBuildingDisplay(
      'corral',
      corral.level,
      corral.selected_skin || null,
      skinInfo || undefined
    );
  }, [corral?.selected_skin, corral?.level, skinInfo]);

  if (!corral) return null;

  const efficiency = corral.current_chickens > 0 
    ? Math.min(100, Math.round((corral.current_chickens / corral.capacity) * 100))
    : 0;

  const earnRate = (corral.current_chickens * 0.001).toFixed(3);

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
        <DialogContent className="w-full max-h-[85vh] max-w-full flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Corral
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
                  alt="Corral" 
                  className="w-16 h-16 object-contain"
                />
              ) : (
                <div className="text-6xl">🏠</div>
              )}
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
                    "Valor total de las gallinas actualmente en el corral. Este valor se calcula basándose en el número de gallinas y su valor individual."
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
                    `Número actual de gallinas en el corral: ${corral.current_chickens} de ${corral.capacity} capacidad máxima. Puedes aumentar la capacidad mejorando el nivel del corral.`
                  )}
                >
                  <Info className="h-4 w-4" />
                </button>
                <span className="text-xs md:text-sm text-green-900 font-medium">Gallinas:</span>
              </div>
              <span className="font-semibold text-sm md:text-base text-orange-600 font-bold bg-gray-100 px-3 py-1 rounded">
                {corral.current_chickens} / {corral.capacity}
              </span>
            </div>
            <Progress value={(corral.current_chickens / corral.capacity) * 100} className="h-2" />

            <div className="flex items-center justify-between p-3 bg-white/80 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <button 
                  type="button" 
                  className="text-green-600 hover:text-green-800 transition-colors"
                  onClick={() => handleInfoClick(
                    "Eficiencia",
                    `La eficiencia del corral es ${efficiency}%, calculada como el porcentaje de capacidad utilizada. Una eficiencia alta indica que el corral está siendo utilizado al máximo de su capacidad.`
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
                    "Total de ganancias obtenidas desde que comenzaste a usar este corral. Este valor representa todas las ganancias acumuladas a lo largo del tiempo."
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
                    `Ganancia esperada por día basada en el número actual de gallinas (${corral.current_chickens}). Esta es una estimación de las ganancias diarias que puedes esperar con la configuración actual del corral.`
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
          <div className="bg-muted/50 rounded-lg p-4 border border-border space-y-3">
            <div className="text-sm font-medium text-green-900">Mejorar edificio</div>
            
            <div className="flex items-center justify-between p-3 bg-white/80 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <button 
                  type="button" 
                  className="text-green-600 hover:text-green-800 transition-colors"
                  onClick={() => handleInfoClick(
                    "Nivel",
                    "El nivel del corral determina su capacidad máxima. Al subir de nivel, el corral puede albergar más gallinas, lo que aumenta tus ganancias potenciales."
                  )}
                >
                  <Info className="h-4 w-4" />
                </button>
                <span className="text-xs md:text-sm text-green-900 font-medium">Nivel:</span>
              </div>
              <span className="font-semibold text-sm md:text-base text-green-900 bg-gray-100 px-3 py-1 rounded">
                {corral.level} → {nextLevel}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-white/80 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <button 
                  type="button" 
                  className="text-green-600 hover:text-green-800 transition-colors"
                  onClick={() => handleInfoClick(
                    "Max. Capacity",
                    `La capacidad máxima aumentará de ${corral.capacity} a ${nextLevelCapacity} gallinas al subir de nivel. Esto te permitirá tener más gallinas y generar más ganancias.`
                  )}
                >
                  <Info className="h-4 w-4" />
                </button>
                <span className="text-xs md:text-sm text-green-900 font-medium">Max. Capacity:</span>
              </div>
              <span className="font-semibold text-sm md:text-base text-green-900 bg-gray-100 px-3 py-1 rounded">
                {corral.capacity} → {nextLevelCapacity}
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

      {corral && (
        <UpgradeBuildingDialog
          open={showUpgrade}
          onOpenChange={(open) => {
            setShowUpgrade(open);
            if (!open) {
              // Keep corral dialog open when upgrade dialog closes
              onOpenChange(true);
            }
          }}
          buildingId={buildingId || ''}
          buildingType="corral"
          currentLevel={corral?.level || 1}
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
        buildingType={BUILDING_TYPES.CORRAL}
        buildingLevel={corral?.level}
        userId={userId}
        currentSkin={corral?.selected_skin || null}
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
