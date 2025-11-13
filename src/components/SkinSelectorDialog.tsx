import { useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogOverlay, DialogPortal } from "./ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { useBuildingSkins } from "@/hooks/useBuildingSkins";
import { useUserItems } from "@/hooks/useUserItems";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, Check, X } from "lucide-react";
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
  const { hasItem, loading: itemsLoading } = useUserItems(userId);
  const { toast } = useToast();

  // Get all local images for this building type
  const localImages = useMemo(() => {
    return getParsedImagesForType(buildingType);
  }, [buildingType]);

  // Log when dialog opens/closes
  useEffect(() => {
    if (open) {
      console.log("SkinSelectorDialog opened", { 
        buildingId, 
        buildingType, 
        userId, 
        currentSkin,
        skinsCount: skins.length,
        localImagesCount: localImages.length,
        localImages: localImages.map(img => `${img.level}${img.variant}`)
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

    try {
      if (buildingType === BUILDING_TYPES.HOUSE) {
        // House skin is stored in user profile, not in user_buildings
        const { error } = await supabase
          .from("users")
          .update({ selected_house_skin: skinKey })
          .eq("id", userId);

        if (error) throw error;
      } else {
        // Other buildings store skin in user_buildings
        const { error } = await supabase
          .from("user_buildings")
          .update({ selected_skin: skinKey })
          .eq("id", buildingId)
          .eq("user_id", userId);

        if (error) throw error;
      }

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
  // Now supports 10 skins per level (A-J or 1-10)
  // Shows: all local images + database skins (owned/default)
  // If buildingLevel is provided, only show skins for that level
  const inventorySlots = useMemo(() => {
    let slots: Array<{ level: number; variant: string; skin: typeof skins[0] | null; isLocal?: boolean }> = [];
    
    // Determine which levels to show
    // Show all levels, but only allow selection for the building's current level
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
    
    // Generate 10 variants per level (A-J)
    const variants = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    
    // For each level to show, create slots for all variants that exist locally or in database
    for (const level of levelsToShow) {
      for (const variant of variants) {
        const skinKey = `${buildingType}_${level}${variant}`;
        
        // Check if image exists locally
        const localImage = localImages.find(img => img.level === level && img.variant === variant);
        
        // Check if skin exists in database
        const dbSkin = skins.find(s => s.skin_key === skinKey);
        
        // If we have a local image or a database skin, create a slot
        if (localImage || dbSkin) {
          if (dbSkin) {
            // Database skin exists - check if owned or default
            const isOwned = dbSkin.is_default || hasItem("skin", dbSkin.skin_key);
            const isDefault = dbSkin.is_default;
            
            // Add if owned or default
            if (isOwned || isDefault) {
              slots.push({ level, variant, skin: dbSkin, isLocal: false });
            } else if (localImage) {
              // Database skin exists but not owned, but we have local image - show as local
              slots.push({ level, variant, skin: null, isLocal: true });
            }
          } else if (localImage) {
            // Only local image exists - show it (treat as available)
            slots.push({ level, variant, skin: null, isLocal: true });
          }
        }
      }
    }
    
    // Sort slots by level, then by variant
    slots.sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      return a.variant.localeCompare(b.variant);
    });

    return slots;
  }, [skins, buildingType, buildingLevel, hasItem, localImages]);

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
            ) : inventorySlots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <p className="text-muted-foreground text-center">
                  No hay skins disponibles para este edificio
                </p>
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
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {levelSlots.map((slot, index) => {
                          const skin = slot.skin;
                          const isLocal = slot.isLocal || false;
                          const skinKey = `${buildingType}_${slot.level}${slot.variant}`;
                          const isOwned = skin ? (skin.is_default || hasItem("skin", skin.skin_key)) : isLocal; // Local images are always "owned"
                          
                          // Determine if this skin is selected:
                          // 1. If currentSkin matches this skin's key
                          // 2. If no currentSkin and this is the default skin for the building's level
                          // 3. If no currentSkin and no default found, and this is the first variant (A) of the building's level
                          const isSelected = skin ? (
                            currentSkin === skin.skin_key || 
                            (!currentSkin && skin.is_default && slot.level === buildingLevel) ||
                            (!currentSkin && !defaultSkinForLevel && slot.level === buildingLevel && slot.variant === 'A')
                          ) : (
                            currentSkin === null && slot.level === buildingLevel && slot.variant === 'A'
                          );
                          
                          // Only show select button for skins of the building's current level
                          const isCurrentLevel = buildingLevel ? slot.level === buildingLevel : true;
                          
                          const isEmpty = !skin && !isLocal;
                          
                          // Get building display - use local image if available, otherwise use skin from database
                          const skinDisplay = isLocal ? getBuildingDisplay(
                            buildingType as BuildingType,
                            slot.level,
                            skinKey,
                            null
                          ) : skin ? getBuildingDisplay(
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
                                    alt={skin?.name || `Nivel ${slot.level}${slot.variant}`}
                                    className="w-24 h-24 object-contain"
                                  />
                                ) : (
                                  <div className="text-6xl">{skinDisplay?.emoji || skin?.image_url || '🏚️'}</div>
                                )}
                              </div>

                              {/* Skin Name */}
                              <div className="text-center">
                                <div className="font-semibold text-sm mb-1">
                                  {skin ? skin.name : `Nivel ${slot.level}${slot.variant}`}
                                </div>
                                {skin && (
                                  <div className="text-xs text-muted-foreground capitalize mb-2">
                                    {skin.rarity}
                                  </div>
                                )}

                                {/* Action Button - Only show for current level */}
                                {isCurrentLevel && (skin || isLocal) && (
                                  <Button
                                    onClick={() => {
                                      if (skin) {
                                        handleSelectSkin(skin.skin_key);
                                      } else if (isLocal) {
                                        // For local images, set selected_skin to null to use default
                                        handleSelectSkin(skinKey);
                                      }
                                    }}
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
                                
                                {/* Info text for other levels */}
                                {!isCurrentLevel && (skin || isLocal) && (
                                  <div className="text-center text-xs text-muted-foreground py-2">
                                    Nivel {slot.level}
                                  </div>
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
        {/* Close button */}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none z-10">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
};
