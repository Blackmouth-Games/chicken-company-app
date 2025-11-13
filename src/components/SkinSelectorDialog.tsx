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
  const { hasItem, loading: itemsLoading, items: userItems, refetch: refetchUserItems } = useUserItems(userId);
  const { toast } = useToast();

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

        // Verify user owns the skin or it's the default for the building's level
        // AND verify it's for the building's current level
        const skin = skins.find(s => s.skin_key === skinKey);
        if (skin) {
          const userOwnsSkin = hasItem("skin", skinKey);
          const isDefault = skin.is_default;
          const skinLevelMatch = skinKey.match(/_(\d+)([A-J]|\d{1,2})/);
          const skinLevel = skinLevelMatch ? parseInt(skinLevelMatch[1], 10) : null;
          const skinVariant = skinLevelMatch ? skinLevelMatch[2] : null;
          const isVariantA = skinVariant === 'A';
          
          // Check if skin is for the building's current level
          if (buildingLevel && skinLevel !== buildingLevel) {
            const errorMsg = `Esta skin es del nivel ${skinLevel}, pero el edificio es nivel ${buildingLevel}`;
            console.error("Error selecting skin:", errorMsg);
            window.dispatchEvent(new CustomEvent('skinSelectorError', { 
              detail: { message: errorMsg, error: new Error(errorMsg) } 
            }));
            toast({
              title: "Error",
              description: `Solo puedes seleccionar skins del nivel ${buildingLevel}`,
              variant: "destructive",
            });
            return;
          }
          
          // Check if user has any skins at all
          const userHasAnySkins = userItems?.some((item: any) => item.item_type === 'skin') || false;
          
          // Can only select if:
          // 1. User owns it, OR
          // 2. It's default for the building's level, OR
          // 3. User has no skins at all AND it's variant A (allow default A skins)
          const canUse = userOwnsSkin || (isDefault && skinLevel === buildingLevel) || (!userHasAnySkins && isVariantA && skinLevel === buildingLevel);
          
          if (!canUse) {
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
        // For corral, use "coop_" format (as that's what's in the database and assets)
        // For other buildings, use the buildingType directly
        const skinKey = buildingType === 'corral' 
          ? `coop_${level}${variant}` 
          : `${buildingType}_${level}${variant}`;
        
        // Check if image exists locally
        const localImage = localImages.find(img => img.level === level && img.variant === variant);
        
        // Check if skin exists in database
        const dbSkin = skins.find(s => s.skin_key === skinKey);
        
        // If we have a local image or a database skin, create a slot
        if (localImage || dbSkin) {
          if (dbSkin) {
            // Database skin exists - check if owned
            const isOwned = hasItem("skin", dbSkin.skin_key);
            const isDefault = dbSkin.is_default === true; // Explicitly check for true
            const isVariantA = variant === 'A';
            
            // Check if user has any skins at all
            const userHasAnySkins = itemsLoading ? false : (userItems?.some((item: any) => item.item_type === 'skin') || false);
            
            // Debug log for default skins
            if (isDefault) {
              console.log(`[SkinSelector] Found default skin: ${skinKey}`, {
                level,
                variant,
                buildingLevel,
                isDefault: dbSkin.is_default,
                canUse: isOwned || isDefault || (!userHasAnySkins && isVariantA)
              });
            }
            
            // Always show skins if:
            // 1. User owns it (in user_items), OR
            // 2. It's default (always show default skins), OR
            // 3. User has no skins at all AND it's variant A (show default A skins), OR
            // 4. It's for the building's current level (to show as locked if not owned)
            const canUse = isOwned || isDefault || (!userHasAnySkins && isVariantA);
            const isCurrentLevel = buildingLevel ? level === buildingLevel : true;
            
            // ALWAYS show default skins, regardless of other conditions
            // Also show if user can use it, or if it's for the current level
            if (isDefault || canUse || isCurrentLevel) {
              slots.push({ level, variant, skin: dbSkin, isLocal: false });
            } else {
              // Debug: why wasn't this skin added?
              console.log(`[SkinSelector] Skin NOT added: ${skinKey}`, {
                isOwned,
                isDefault,
                isVariantA,
                userHasAnySkins,
                canUse,
                isCurrentLevel,
                buildingLevel,
                level
              });
            }
          } else if (localImage) {
            // Only local image exists - show it but it's not available (user doesn't own it)
            // Don't add it as available, only show if there's a database entry
            // For now, we won't show local-only images as they're not in the database
          }
        }
      }
    }
    
    // Sort slots by level, then by variant
    slots.sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      return a.variant.localeCompare(b.variant);
    });

    // Debug: Log slots for default skins
    const defaultSlots = slots.filter(s => s.skin?.is_default === true);
    const allDefaultSkinsInDB = skins.filter(s => s.is_default === true);
    console.log("🔍 [SkinSelector] Slot generation complete", {
      totalSlots: slots.length,
      defaultSlotsInSlots: defaultSlots.length,
      defaultSkinsInDBCount: allDefaultSkinsInDB.length,
      defaultSkinsInDBList: allDefaultSkinsInDB.map(s => ({
        skin_key: s.skin_key,
        building_type: s.building_type,
        is_default: s.is_default
      })),
      defaultSlots: defaultSlots.map(s => ({
        level: s.level,
        variant: s.variant,
        skinKey: s.skin?.skin_key,
        isDefault: s.skin?.is_default
      })),
      buildingType,
      buildingLevel
    });
    
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
                          
                          // Check if user actually owns this skin
                          const userOwnsSkin = skin ? hasItem("skin", skin.skin_key) : false;
                          const isDefault = skin ? skin.is_default : false;
                          const isVariantA = slot.variant === 'A';
                          
                          // Check if user has any skins at all
                          const userHasAnySkins = itemsLoading ? false : (userItems?.some((item: any) => item.item_type === 'skin') || false);
                          
                          // Can only use if:
                          // 1. User owns it, OR
                          // 2. It's default (always allow default skins), OR
                          // 3. User has no skins at all AND it's variant A (show default A skins)
                          const canUse = userOwnsSkin || isDefault || (!userHasAnySkins && isVariantA);
                          
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
                          
                          // Show select button ONLY if:
                          // - It's for the building's current level AND user can use it
                          // No skins from other levels can be selected, even if they're default
                          const isCurrentLevel = buildingLevel ? slot.level === buildingLevel : true;
                          const canSelect = isCurrentLevel && canUse;
                          
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
                                  : canUse
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
                                  <div className="text-6xl">{skin?.image_url || '🏚️'}</div>
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

                                {/* Action Button - Only show for current level AND if user can use it */}
                                {canSelect && skin && (
                                  <Button
                                    onClick={() => {
                                      handleSelectSkin(skin.skin_key);
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
                                
                                {/* Locked message if can't use */}
                                {isCurrentLevel && skin && !canUse && (
                                  <div className="text-center text-xs text-muted-foreground py-2">
                                    <Lock className="w-4 h-4 mx-auto mb-1 opacity-50" />
                                    No disponible
                                  </div>
                                )}
                                
                                {/* Info text for other levels */}
                                {!isCurrentLevel && skin && (
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

                              {/* Lock Badge for unowned/unavailable skins */}
                              {skin && !canUse && (
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
