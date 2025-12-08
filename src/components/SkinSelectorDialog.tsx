import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogOverlay, DialogPortal } from "./ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { useBuildingSkins } from "@/hooks/useBuildingSkins";
import { useUserItems } from "@/hooks/useUserItems";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, Check } from "lucide-react";
import { getBuildingDisplay, type BuildingType } from "@/lib/buildingImages";
import { BUILDING_TYPES, type BuildingType as ConstantsBuildingType } from "@/lib/constants";
import { getParsedImagesForType } from "@/lib/buildingImagesDynamic";

interface SkinSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buildingId: string | undefined;
  buildingType: ConstantsBuildingType;
  buildingLevel?: number; // Level of the building - only show skins for this level
  userId: string | undefined;
  currentSkin: string | null;
  onSkinSelected: () => void;
}

export const SkinSelectorDialog = ({
  open,
  onOpenChange,
  buildingId,
  buildingType,
  buildingLevel,
  userId,
  currentSkin,
  onSkinSelected,
}: SkinSelectorDialogProps) => {
  const { skins, loading: skinsLoading } = useBuildingSkins(buildingType);
  const { hasItem, loading: itemsLoading, items: userItems, refetch: refetchUserItems } = useUserItems(userId);
  const { toast } = useToast();
  const [selectedFilter, setSelectedFilter] = useState<number | 'all'>('all');

  // Get all local images for this building type
  const localImages = useMemo(() => {
    return getParsedImagesForType(buildingType);
  }, [buildingType]);

  // Log when dialog opens/closes
  useEffect(() => {
    if (open) {
      const defaultSkins = skins.filter(s => s.is_default === true);
      console.log("🔍 SkinSelectorDialog opened - DEBUG INFO", { 
        buildingId, 
        buildingType, 
        buildingLevel,
        userId, 
        currentSkin,
        skinsCount: skins.length,
        defaultSkinsCount: defaultSkins.length,
        defaultSkins: defaultSkins.map(s => ({
          skin_key: s.skin_key,
          is_default: s.is_default,
          building_type: s.building_type
        })),
        allSkins: skins.map(s => ({
          skin_key: s.skin_key,
          is_default: s.is_default,
          building_type: s.building_type
        })),
        localImagesCount: localImages.length,
        localImages: localImages.map(img => `${img.level}${img.variant}`),
        userItemsCount: userItems?.length || 0,
        userItems: userItems?.map((item: any) => item.item_key) || [],
        itemsLoading
      });
      
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
  }, [open, buildingId, buildingType, userId, currentSkin, skins.length, localImages.length]);

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

    // For house, we don't need buildingId - it's stored in user profile
    if (!buildingId && buildingType !== BUILDING_TYPES.HOUSE) {
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

        // Verify user owns the skin OR it's a default skin
        // Permitir seleccionar skins de niveles <= nivel actual del edificio
        const skin = skins.find(s => s.skin_key === skinKey);
        if (skin) {
          const userOwnsSkin = hasItem("skin", skinKey);
          const isDefault = skin.is_default === true;
          const skinLevelMatch = skinKey.match(/_(\d+)([A-J]|\d{1,2})/);
          const skinLevel = skinLevelMatch ? parseInt(skinLevelMatch[1], 10) : null;
          
          // Verificar que la skin sea de un nivel <= al nivel actual del edificio
          if (buildingLevel && skinLevel && skinLevel > buildingLevel) {
            const errorMsg = `Esta skin es del nivel ${skinLevel}, pero el edificio es nivel ${buildingLevel}`;
            console.error("Error selecting skin:", errorMsg);
            window.dispatchEvent(new CustomEvent('skinSelectorError', { 
              detail: { message: errorMsg, error: new Error(errorMsg) } 
            }));
            toast({
              title: "Error",
              description: `Solo puedes seleccionar skins del nivel ${buildingLevel} o inferior`,
              variant: "destructive",
            });
            return;
          }
          
          // Permitir seleccionar si el usuario tiene la skin O si es por defecto
          if (!userOwnsSkin && !isDefault) {
            const errorMsg = "No tienes esta skin";
            console.error("Error selecting skin:", errorMsg);
            window.dispatchEvent(new CustomEvent('skinSelectorError', { 
              detail: { message: errorMsg, error: new Error(errorMsg) } 
            }));
            toast({
              title: "Error",
              description: "No tienes esta skin en tu inventario",
              variant: "destructive",
            });
            return;
          }
        } else {
          // Si no está en la BD, verificar si el usuario la tiene en su inventario
          const userOwnsSkin = hasItem("skin", skinKey);
          if (!userOwnsSkin) {
            const errorMsg = "No tienes esta skin";
            console.error("Error selecting skin:", errorMsg);
            window.dispatchEvent(new CustomEvent('skinSelectorError', { 
              detail: { message: errorMsg, error: new Error(errorMsg) } 
            }));
            toast({
              title: "Error",
              description: "No tienes esta skin en tu inventario",
              variant: "destructive",
            });
            return;
          }
          
          // Verificar nivel si es una skin local
          const skinLevelMatch = skinKey.match(/_(\d+)([A-J]|\d{1,2})/);
          const skinLevel = skinLevelMatch ? parseInt(skinLevelMatch[1], 10) : null;
          if (buildingLevel && skinLevel && skinLevel > buildingLevel) {
            const errorMsg = `Esta skin es del nivel ${skinLevel}, pero el edificio es nivel ${buildingLevel}`;
            console.error("Error selecting skin:", errorMsg);
            window.dispatchEvent(new CustomEvent('skinSelectorError', { 
              detail: { message: errorMsg, error: new Error(errorMsg) } 
            }));
            toast({
              title: "Error",
              description: `Solo puedes seleccionar skins del nivel ${buildingLevel} o inferior`,
              variant: "destructive",
            });
            return;
          }
        }

    try {
      // All buildings (including house) store skin in user_buildings
      if (!buildingId) {
        throw new Error("Building ID is required");
      }
      
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

      // Refresh user items in case they were updated (though selecting a skin doesn't change items)
      await refetchUserItems();

      // Emit event to notify all components that a skin was selected
      window.dispatchEvent(new CustomEvent('skinSelected', { 
        detail: { 
          buildingId, 
          buildingType, 
          skinKey,
          userId 
        } 
      }));

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

  // Get available levels
  const availableLevels = useMemo(() => {
    const levelSet = new Set<number>();
    for (const img of localImages) {
      levelSet.add(img.level);
    }
    for (const skin of skins) {
      const levelMatch = skin.skin_key.match(/_(\d+)([A-J]|\d{1,2})/);
      if (levelMatch) {
        const level = parseInt(levelMatch[1], 10);
        levelSet.add(level);
      }
    }
    return Array.from(levelSet).sort((a, b) => a - b);
  }, [localImages, skins]);

  // Filter skins based on user ownership and level rules
  // - Niveles <= nivel actual: Solo mostrar skins desbloqueadas (que el usuario tiene)
  // - Niveles > nivel actual: Solo mostrar la skin default con lock
  const filteredSkinsByLevel = useMemo(() => {
    if (!buildingLevel) return {};
    
    const result: Record<number, Array<{ level: number; variant: string; skin: typeof skins[0] | null; isLocal?: boolean; isLocked?: boolean }>> = {};
    
    for (const level of availableLevels) {
      const levelSkins: Array<{ level: number; variant: string; skin: typeof skins[0] | null; isLocal?: boolean; isLocked?: boolean }> = [];
      
      if (level <= buildingLevel) {
        // Niveles <= actual: Mostrar skins desbloqueadas Y skins por defecto
        const variants = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        for (const variant of variants) {
          const skinKey = buildingType === 'coop' 
            ? `coop_${level}${variant}` 
            : `${buildingType}_${level}${variant}`;
          
          const dbSkin = skins.find(s => s.skin_key === skinKey);
          const localImage = localImages.find(img => img.level === level && img.variant === variant);
          
          if (dbSkin) {
            const userOwnsSkin = hasItem("skin", dbSkin.skin_key);
            const isDefault = dbSkin.is_default === true;
            
            // Mostrar si el usuario la tiene O si es por defecto
            if (userOwnsSkin || isDefault) {
              levelSkins.push({ level, variant, skin: dbSkin, isLocal: false });
            }
          } else if (localImage) {
            const userOwnsSkin = hasItem("skin", skinKey);
            
            // Para skins locales, solo mostrar si el usuario las tiene
            // (las skins por defecto deberían estar en la BD)
            if (userOwnsSkin) {
              const virtualSkin = {
                id: `local-${skinKey}`,
                skin_key: skinKey,
                building_type: buildingType,
                name: `${buildingType} Level ${level}${variant}`,
                is_default: false,
                rarity: 'common',
              };
              levelSkins.push({ level, variant, skin: virtualSkin as any, isLocal: true });
            }
          }
        }
      } else {
        // Niveles > actual: Solo mostrar la skin default con lock
        const defaultSkin = skins.find(s => {
          const levelMatch = s.skin_key.match(/_(\d+)([A-J]|\d{1,2})/);
          if (levelMatch) {
            const skinLevel = parseInt(levelMatch[1], 10);
            return skinLevel === level && s.is_default;
          }
          return false;
        });
        
        if (defaultSkin) {
          levelSkins.push({ 
            level, 
            variant: defaultSkin.skin_key.match(/_(\d+)([A-J]|\d{1,2})/)?.[2] || 'A', 
            skin: defaultSkin, 
            isLocal: false,
            isLocked: true 
          });
        }
      }
      
      if (levelSkins.length > 0) {
        result[level] = levelSkins;
      }
    }
    
    return result;
  }, [buildingLevel, availableLevels, skins, buildingType, hasItem, localImages]);

  // Create inventory slots organized by level and variant (legacy - keeping for compatibility)
  const inventorySlots = useMemo(() => {
    let slots: Array<{ level: number; variant: string; skin: typeof skins[0] | null; isLocal?: boolean }> = [];
    
    // Determine which levels to show
    // Show all levels. Only allow selection for current level, lock higher levels.
    const levelSet = new Set<number>();
    for (const img of localImages) {
      levelSet.add(img.level);
    }
    for (const skin of skins) {
      const levelMatch = skin.skin_key.match(/_(\d+)([A-J]|\d{1,2})/);
      if (levelMatch) {
        const level = parseInt(levelMatch[1], 10);
        levelSet.add(level);
      }
    }
    const levelsToShow = levelSet.size > 0 ? Array.from(levelSet).sort((a, b) => a - b) : [1, 2, 3, 4, 5];
    
    // Generate 8 variants per level (A-H) - 4 columns x 2 rows = 8 slots per level
    const variants = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    
    // For each level to show, create slots for ALL 8 variants (A-H)
    // This ensures we always show empty slots for future skins
    for (const level of levelsToShow) {
      for (const variant of variants) {
        // For coop, use "coop_" format (as that's what's in the database and assets)
        // For other buildings, use the buildingType directly
        const skinKey = buildingType === 'coop' 
          ? `coop_${level}${variant}` 
          : `${buildingType}_${level}${variant}`;
        
        // Check if image exists locally
        const localImage = localImages.find(img => img.level === level && img.variant === variant);
        
        // Check if skin exists in database
        const dbSkin = skins.find(s => s.skin_key === skinKey);
        
        // Always create a slot (even if empty) to show future availability
        if (dbSkin) {
          // Database skin exists - ALWAYS show it, even if locked
          // The UI will handle showing it as locked if the user can't use it
          slots.push({ level, variant, skin: dbSkin, isLocal: false });
        } else if (localImage) {
          // Only local image exists - create a virtual skin entry to show it
          // Check if user owns this skin (by item_key matching the skinKey)
          const isOwned = hasItem("skin", skinKey);
          const isCurrentLevel = buildingLevel ? level === buildingLevel : true;
          
          // Show ALL local images that exist, regardless of ownership or level
          // This ensures users can see all available skins
          // Create a virtual skin object for local images
          const virtualSkin = {
            id: `local-${skinKey}`,
            skin_key: skinKey,
            building_type: buildingType,
            name: `${buildingType} Level ${level}${variant}`,
            is_default: false,
            rarity: 'common',
          };
          
          // Always show local images - they exist as assets
          slots.push({ level, variant, skin: virtualSkin as any, isLocal: true });
          
          // Debug log for local images
          if (isOwned) {
            console.log(`[SkinSelector] Found local image with owned skin: ${skinKey}`, {
              level,
              variant,
              buildingLevel,
              isOwned,
              isCurrentLevel
            });
          }
        } else {
          // No skin exists - add empty slot to show future availability
          slots.push({ level, variant, skin: null, isLocal: false });
        }
      }
    }
    
    // Sort slots by level, then by variant
    slots.sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      return a.variant.localeCompare(b.variant);
    });

    // Debug: Check for missing default skins (only log errors)
    const defaultSlots = slots.filter(s => s.skin?.is_default === true);
    const allDefaultSkinsInDB = skins.filter(s => s.is_default === true);
    
    if (defaultSlots.length === 0 && allDefaultSkinsInDB.length > 0) {
      console.error("❌ [SkinSelector] Default skins exist in DB but not in slots!", {
        buildingType,
        buildingLevel,
        defaultSkinsInDB: allDefaultSkinsInDB.map(s => s.skin_key),
        totalSlots: slots.length,
        slots: slots.map(s => ({
          level: s.level,
          variant: s.variant,
          skinKey: s.skin?.skin_key,
          isDefault: s.skin?.is_default
        }))
      });
    }

    return slots;
  }, [skins, buildingType, buildingLevel, hasItem, localImages, userItems, itemsLoading]);

  // Get levels to display based on filter
  const levelsToDisplay = useMemo(() => {
    const allLevels = Object.keys(filteredSkinsByLevel).map(Number).sort((a, b) => {
      // Priorizar el nivel actual primero
      if (buildingLevel) {
        if (a === buildingLevel) return -1;
        if (b === buildingLevel) return 1;
      }
      return a - b;
    });
    
    if (selectedFilter === 'all') {
      return allLevels;
    }
    return allLevels.filter(level => level === selectedFilter);
  }, [filteredSkinsByLevel, selectedFilter, buildingLevel]);

  // Find the default skin for the building's level
  const defaultSkinForLevel = useMemo(() => {
    if (!buildingLevel) return null;
    // Find the default skin (is_default = true) for this level
    return skins.find(s => {
      const levelMatch = s.skin_key.match(/_(\d+)([A-J]|\d{1,2})/);
      if (levelMatch) {
        const level = parseInt(levelMatch[1], 10);
        return level === buildingLevel && s.is_default;
      }
      return false;
    });
  }, [skins, buildingLevel]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        {/* Custom overlay with higher z-index to appear above MarketDialog */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-[102] bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        {/* Custom content with higher z-index */}
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-[103] grid w-[92vw] max-w-4xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-0 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg max-h-[85vh]"
          )}
        >
          <div className="flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-2xl font-bold">Inventario de Skins</h2>
              {buildingLevel && (
                <p className="text-sm text-muted-foreground mt-1">
                  Nivel actual: {buildingLevel}
                </p>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              ✕
            </Button>
          </div>

          {/* Filters */}
          {buildingLevel && availableLevels.length > 0 && (
            <div className="px-6 pb-4 border-b">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedFilter('all')}
                >
                  Todos
                </Button>
                {availableLevels.map(level => (
                  <Button
                    key={level}
                    variant={selectedFilter === level ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedFilter(level)}
                    className={cn(
                      buildingLevel === level && "ring-2 ring-primary ring-offset-2"
                    )}
                  >
                    Nivel {level}
                    {buildingLevel === level && (
                      <span className="ml-1 text-xs">(Actual)</span>
                    )}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : levelsToDisplay.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <p className="text-muted-foreground text-center">
                  {selectedFilter === 'all' 
                    ? "No hay skins desbloqueadas para este edificio"
                    : `No hay skins desbloqueadas para el nivel ${selectedFilter}`
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Lista jerárquica por nivel */}
                {levelsToDisplay.map(level => {
                  const levelSkins = filteredSkinsByLevel[level] || [];
                  const isCurrentLevel = buildingLevel === level;
                  const isLockedLevel = !!buildingLevel && level > buildingLevel;
                  
                  return (
                    <div key={level} className="space-y-3">
                      {/* Header del nivel */}
                      <div className="flex items-center gap-3">
                        <h3 className={cn(
                          "text-xl font-bold",
                          isCurrentLevel ? "text-primary" : "text-muted-foreground"
                        )}>
                          Nivel {level}
                        </h3>
                        {isCurrentLevel && (
                          <span className="text-xs font-semibold text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-1">
                            Nivel Actual
                          </span>
                        )}
                        {isLockedLevel && (
                          <span className="text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 rounded-full px-2 py-1">
                            Requiere nivel {level}
                          </span>
                        )}
                        <span className="text-sm text-muted-foreground">
                          ({levelSkins.length} {levelSkins.length === 1 ? 'skin' : 'skins'})
                        </span>
                      </div>
                      
                      {/* Grid de skins para este nivel */}
                      {levelSkins.length > 0 ? (
                        <div className={cn(
                          "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3",
                          isLockedLevel && "opacity-60"
                        )}>
                          {levelSkins.map((slot) => {
                            const skin = slot.skin;
                            const isLocal = slot.isLocal || false;
                            const skinKey = skin?.skin_key || (buildingType === 'coop' 
                              ? `coop_${slot.level}${slot.variant}` 
                              : `${buildingType}_${slot.level}${slot.variant}`);
                            
                            const isSelected = skin ? currentSkin === skin.skin_key : false;
                            // Verificar si el usuario puede usar esta skin
                            const userOwnsSkin = skin ? hasItem("skin", skin.skin_key) : false;
                            const isDefault = skin ? skin.is_default === true : false;
                            // Permitir seleccionar si:
                            // - No está bloqueada
                            // - El nivel es <= al nivel actual
                            // - El usuario la tiene O es por defecto
                            const canSelect = !slot.isLocked && buildingLevel && level <= buildingLevel && skin && buildingId && (userOwnsSkin || isDefault);
                            
                            // Get building display
                            const skinDisplay = isLocal ? getBuildingDisplay(
                              buildingType as BuildingType,
                              slot.level,
                              skinKey,
                              null
                            ) : skin ? getBuildingDisplay(
                              buildingType as BuildingType,
                              slot.level,
                              skin.skin_key,
                              skin
                            ) : null;

                            return (
                              <div
                                key={`${slot.level}-${slot.variant}`}
                                className={cn(
                                  "relative p-3 rounded-lg border-2 transition-all aspect-square cursor-pointer",
                                  isSelected
                                    ? "border-primary bg-primary/10 shadow-md"
                                    : slot.isLocked
                                    ? "border-muted/50 bg-muted/5 opacity-60 cursor-not-allowed"
                                    : canSelect
                                    ? "border-border hover:border-primary/50 hover:shadow-md"
                                    : "border-muted/50 bg-muted/5 opacity-60 cursor-not-allowed"
                                )}
                                onClick={() => {
                                  if (canSelect && skin) {
                                    handleSelectSkin(skin.skin_key);
                                  }
                                }}
                              >
                                {/* Skin Image */}
                                <div className="flex items-center justify-center h-full">
                                  {skinDisplay?.type === 'image' ? (
                                    <img 
                                      src={skinDisplay.src} 
                                      alt={skin?.name || `Nivel ${slot.level}${slot.variant}`}
                                      className="w-full h-full object-contain p-1"
                                    />
                                  ) : (
                                    <div className="text-3xl">{skin?.image_url || '🏚️'}</div>
                                  )}
                                </div>

                                {/* Selected Badge */}
                                {isSelected && (
                                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                                    <Check className="w-4 h-4" />
                                  </div>
                                )}

                                {/* Lock Badge */}
                                {slot.isLocked && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
                                    <div className="flex flex-col items-center gap-1">
                                      <Lock className="w-6 h-6 text-muted-foreground" />
                                      <span className="text-xs font-semibold text-muted-foreground">
                                        Nivel {level}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground py-4">
                          No hay skins desbloqueadas para este nivel
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
};
