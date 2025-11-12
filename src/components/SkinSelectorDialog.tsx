import { useEffect, useMemo } from "react";
import { Dialog, DialogContent } from "./ui/dialog";
import { Button } from "./ui/button";
import { useBuildingSkins } from "@/hooks/useBuildingSkins";
import { useUserItems } from "@/hooks/useUserItems";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, Check } from "lucide-react";
import { getBuildingDisplay, type BuildingType } from "@/lib/buildingImages";
import { BUILDING_TYPES, type BuildingType as ConstantsBuildingType } from "@/lib/constants";

interface SkinSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buildingId: string | undefined;
  buildingType: ConstantsBuildingType;
  userId: string | undefined;
  currentSkin: string | null;
  onSkinSelected: () => void;
}

export const SkinSelectorDialog = ({
  open,
  onOpenChange,
  buildingId,
  buildingType,
  userId,
  currentSkin,
  onSkinSelected,
}: SkinSelectorDialogProps) => {
  const { skins, loading: skinsLoading } = useBuildingSkins(buildingType);
  const { hasItem, loading: itemsLoading } = useUserItems(userId);
  const { toast } = useToast();

  // Log when dialog opens/closes
  useEffect(() => {
    if (open) {
      console.log("SkinSelectorDialog opened", { buildingId, buildingType, userId, currentSkin });
      
      // House doesn't have a buildingId in database, so this is expected
      if (!buildingId && buildingType !== BUILDING_TYPES.HOUSE) {
        const errorMsg = `SkinSelectorDialog opened without buildingId for ${buildingType}`;
        console.warn(errorMsg);
        window.dispatchEvent(new CustomEvent('skinSelectorError', { 
          detail: { message: errorMsg, error: new Error(errorMsg), level: 'warning' } 
        }));
      }
      
      if (!userId) {
        const errorMsg = `SkinSelectorDialog opened without userId for ${buildingType}`;
        console.warn(errorMsg);
        window.dispatchEvent(new CustomEvent('skinSelectorError', { 
          detail: { message: errorMsg, error: new Error(errorMsg), level: 'warning' } 
        }));
      }
    }
  }, [open, buildingId, buildingType, userId, currentSkin]);

  const handleSelectSkin = async (skinKey: string) => {
    if (!userId) {
      const errorMsg = "No user ID provided";
      console.error("Error selecting skin:", errorMsg);
      window.dispatchEvent(new CustomEvent('skinSelectorError', { 
        detail: { message: errorMsg, error: new Error(errorMsg) } 
      }));
      toast({
        title: "Error",
        description: "No se pudo identificar al usuario",
        variant: "destructive",
      });
      return;
    }

    if (!buildingId) {
      const errorMsg = "No building ID provided";
      console.error("Error selecting skin:", errorMsg);
      window.dispatchEvent(new CustomEvent('skinSelectorError', { 
        detail: { message: errorMsg, error: new Error(errorMsg) } 
      }));
      toast({
        title: "Error",
        description: "Este edificio no tiene ID en la base de datos",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("user_buildings")
        .update({ selected_skin: skinKey })
        .eq("id", buildingId)
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "¡Éxito!",
        description: "Skin aplicada correctamente",
      });

      onSkinSelected();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error selecting skin:", error);
      window.dispatchEvent(new CustomEvent('skinSelectorError', { 
        detail: { message: error.message || "No se pudo aplicar la skin", error } 
      }));
      toast({
        title: "Error",
        description: error.message || "No se pudo aplicar la skin",
        variant: "destructive",
      });
    }
  };

  const loading = skinsLoading || itemsLoading;

  // Create inventory slots organized by level and variant
  // Structure is now determined dynamically from available skins in database
  const inventorySlots = useMemo(() => {
    const slots: Array<{ level: number; variant: string; skin: typeof skins[0] | null }> = [];
    
    // Extract all unique levels and variants from skins in database
    const levelSet = new Set<number>();
    const variantMap = new Map<number, Set<string>>();
    
    // Scan all skins to find available levels and variants
    for (const skin of skins) {
      const levelMatch = skin.skin_key.match(/_(\d+)([ABC])/);
      if (levelMatch) {
        const level = parseInt(levelMatch[1], 10);
        const variant = levelMatch[2];
        levelSet.add(level);
        if (!variantMap.has(level)) {
          variantMap.set(level, new Set());
        }
        variantMap.get(level)!.add(variant);
      }
    }
    
    // If no skins found, use default structure
    if (levelSet.size === 0) {
      const defaultStructure: Record<string, { maxLevel: number; variants: string[] }> = {
        corral: { maxLevel: 5, variants: ['A', 'B'] },
        warehouse: { maxLevel: 5, variants: ['A', 'B'] },
        market: { maxLevel: 5, variants: ['A', 'B'] },
        house: { maxLevel: 1, variants: ['A', 'B', 'C'] },
      };
      const config = defaultStructure[buildingType] || { maxLevel: 5, variants: ['A', 'B'] };
      
      for (let level = 1; level <= config.maxLevel; level++) {
        for (const variant of config.variants) {
          if (buildingType === 'warehouse' && level > 1 && variant === 'B') {
            continue;
          }
          const skinKey = `${buildingType}_${level}${variant}`;
          const skin = skins.find(s => s.skin_key === skinKey) || null;
          slots.push({ level, variant, skin });
        }
      }
    } else {
      // Use dynamic structure from database
      const levels = Array.from(levelSet).sort((a, b) => a - b);
      const maxLevel = Math.max(...levels);
      
      // Create slots for all levels up to maxLevel
      for (let level = 1; level <= maxLevel; level++) {
        // Get variants for this level, or use default variants
        const levelVariants = variantMap.get(level);
        const variants = levelVariants ? Array.from(levelVariants).sort() : ['A', 'B'];
        
        // For warehouse, only level 1 has variant B
        if (buildingType === 'warehouse' && level > 1) {
          const filteredVariants = variants.filter(v => v !== 'B');
          for (const variant of filteredVariants.length > 0 ? filteredVariants : ['A']) {
            const skinKey = `${buildingType}_${level}${variant}`;
            const skin = skins.find(s => s.skin_key === skinKey) || null;
            slots.push({ level, variant, skin });
          }
        } else {
          for (const variant of variants) {
            const skinKey = `${buildingType}_${level}${variant}`;
            const skin = skins.find(s => s.skin_key === skinKey) || null;
            slots.push({ level, variant, skin });
          }
        }
      }
    }

    return slots;
  }, [skins, buildingType]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] max-w-4xl p-0 sm:rounded-lg max-h-[85vh]">
        <div className="flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-2xl font-bold">Inventario de Skins</h2>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              ✕
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Group by level */}
                {[1, 2, 3, 4, 5].map(level => {
                  const levelSlots = inventorySlots.filter(slot => slot.level === level);
                  if (levelSlots.length === 0) return null;

                  return (
                    <div key={level} className="space-y-2">
                      <h3 className="text-lg font-semibold text-muted-foreground">
                        Nivel {level}
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {levelSlots.map((slot, index) => {
                          const skin = slot.skin;
                          const isOwned = skin ? (skin.is_default || hasItem("skin", skin.skin_key)) : false;
                          const isSelected = skin ? (currentSkin === skin.skin_key || (!currentSkin && skin.is_default)) : false;
                          const isEmpty = !skin;

                          // Get building display for owned skins
                          const skinDisplay = skin ? getBuildingDisplay(
                            buildingType as BuildingType,
                            level,
                            skin.skin_key,
                            skin
                          ) : null;

                          return (
                            <div
                              key={`${level}-${slot.variant}-${index}`}
                              className={`relative p-3 rounded-lg border-2 transition-all ${
                                isEmpty
                                  ? "border-muted/30 bg-muted/10 opacity-50"
                                  : isSelected
                                  ? "border-primary bg-primary/10"
                                  : isOwned
                                  ? "border-border hover:border-primary/50 cursor-pointer"
                                  : "border-muted/50 bg-muted/5 opacity-60"
                              }`}
                            >
                              {/* Skin Image or Empty Slot */}
                              <div className="flex items-center justify-center mb-2 min-h-[100px]">
                                {isEmpty ? (
                                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                                    <Lock className="w-8 h-8 mb-2 opacity-50" />
                                    <span className="text-xs">Nivel {level}{slot.variant}</span>
                                  </div>
                                ) : skinDisplay?.type === 'image' ? (
                                  <img 
                                    src={skinDisplay.src} 
                                    alt={skin.name}
                                    className="w-24 h-24 object-contain"
                                  />
                                ) : (
                                  <div className="text-6xl">{skinDisplay?.emoji || skin.image_url || '🏚️'}</div>
                                )}
                              </div>

                              {/* Skin Name */}
                              <div className="text-center">
                                <div className="font-semibold text-sm mb-1">
                                  {skin ? skin.name : `Nivel ${level}${slot.variant}`}
                                </div>
                                {skin && (
                                  <div className="text-xs text-muted-foreground capitalize mb-2">
                                    {skin.rarity}
                                  </div>
                                )}

                                {/* Action Button */}
                                {skin && (
                                  <Button
                                    onClick={() => handleSelectSkin(skin.skin_key)}
                                    disabled={isSelected || !buildingId}
                                    className="w-full"
                                    size="sm"
                                    variant={isSelected ? "default" : "outline"}
                                    title={!buildingId ? "Este edificio no tiene ID en la base de datos" : undefined}
                                  >
                                    {isSelected ? (
                                      <>
                                        <Check className="w-4 h-4 mr-1" />
                                        En uso
                                      </>
                                    ) : !buildingId ? (
                                      <>
                                        <Lock className="w-4 h-4 mr-1" />
                                        No disponible
                                      </>
                                    ) : (
                                      "Seleccionar"
                                    )}
                                  </Button>
                                )}
                              </div>

                              {/* Selected Badge */}
                              {isSelected && (
                                <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                                  ✓
                                </div>
                              )}

                              {/* Lock Badge for unowned skins */}
                              {skin && !isOwned && (
                                <div className="absolute top-2 right-2 bg-muted text-muted-foreground text-xs px-2 py-1 rounded-full">
                                  <Lock className="w-3 h-3" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
