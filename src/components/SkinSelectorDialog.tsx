import { useEffect, useMemo } from "react";
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
    
    // Generate 8 variants per level (A-H) - 4 columns x 2 rows = 8 slots per level
    const variants = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    
    // For each level to show, create slots for ALL 8 variants (A-H)
    // This ensures we always show empty slots for future skins
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
        
        // Always create a slot (even if empty) to show future availability
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
            // Still add as empty slot to show it exists but is not available
            slots.push({ level, variant, skin: null, isLocal: false });
          }
        } else if (localImage) {
          // Only local image exists - add as empty slot (not available)
          slots.push({ level, variant, skin: null, isLocal: false });
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
                {/* Group by level - Always show 8 slots (4 columns x 2 rows) per level */}
                {[1, 2, 3, 4, 5].map(level => {
                  const variants = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
                  
                  return (
                    <div key={level} className="space-y-2">
                      <h3 className="text-lg font-semibold text-muted-foreground">
                        Nivel {level}
                      </h3>
                      <div className="grid grid-cols-4 gap-2">
                        {variants.map((variant, index) => {
                          // Find the slot for this level and variant
                          const slot = inventorySlots.find(s => s.level === level && s.variant === variant);
                          // If no slot exists, create an empty one
                          const emptySlot: typeof inventorySlots[0] = { level, variant, skin: null, isLocal: false };
                          const currentSlot = slot || emptySlot;
                          const skin = currentSlot.skin;
                          const isLocal = currentSlot.isLocal || false;
                          const skinKey = buildingType === 'corral' 
                            ? `coop_${currentSlot.level}${currentSlot.variant}` 
                            : `${buildingType}_${currentSlot.level}${currentSlot.variant}`;
                          
                          // Check if user actually owns this skin
                          const userOwnsSkin = skin ? hasItem("skin", skin.skin_key) : false;
                          const isDefault = skin ? skin.is_default : false;
                          const isVariantA = currentSlot.variant === 'A';
                          
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
                            (!currentSkin && skin.is_default && currentSlot.level === buildingLevel) ||
                            (!currentSkin && !defaultSkinForLevel && currentSlot.level === buildingLevel && currentSlot.variant === 'A')
                          ) : (
                            currentSkin === null && currentSlot.level === buildingLevel && currentSlot.variant === 'A'
                          );
                          
                          // Show select button ONLY if:
                          // - It's for the building's current level AND user can use it
                          // No skins from other levels can be selected, even if they're default
                          const isCurrentLevel = buildingLevel ? currentSlot.level === buildingLevel : true;
                          const canSelect = isCurrentLevel && canUse;
                          
                          const isEmpty = !skin && !isLocal;
                          
                          // Get building display - use local image if available, otherwise use skin from database
                          const skinDisplay = isLocal ? getBuildingDisplay(
                            buildingType as BuildingType,
                            currentSlot.level,
                            skinKey,
                            null
                          ) : skin ? getBuildingDisplay(
                            buildingType as BuildingType,
                            currentSlot.level,
                            skin.skin_key,
                            skin
                          ) : null;

                          return (
                            <div
                              key={`${level}-${currentSlot.variant}-${index}`}
                              className={`relative p-1.5 rounded-lg border-2 transition-all aspect-square ${
                                isEmpty
                                  ? "border-muted/30 bg-muted/10 opacity-50"
                                  : isSelected
                                  ? "border-primary bg-primary/10"
                                  : canUse
                                  ? "border-border hover:border-primary/50 cursor-pointer"
                                  : "border-muted/50 bg-muted/5 opacity-60"
                              }`}
                              onClick={() => {
                                if (canSelect && skin && buildingId) {
                                  handleSelectSkin(skin.skin_key);
                                }
                              }}
                            >
                              {/* Skin Image or Empty Slot */}
                              <div className="flex items-center justify-center h-full">
                                {isEmpty ? (
                                  <div className="w-full h-full rounded-md bg-muted/20" />
                                ) : skinDisplay?.type === 'image' ? (
                                  <img 
                                    src={skinDisplay.src} 
                                    alt={skin?.name || `Nivel ${slot.level}${slot.variant}`}
                                    className="w-full h-full object-contain p-1"
                                  />
                                ) : (
                                  <div className="text-2xl">{skin?.image_url || '🏚️'}</div>
                                )}
                              </div>

                              {/* Selected Badge */}
                              {isSelected && (
                                <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                                  <Check className="w-3 h-3" />
                                </div>
                              )}

                              {/* Lock Badge for unowned/unavailable skins */}
                              {skin && !canUse && !isSelected && (
                                <div className="absolute top-1 right-1 bg-muted text-muted-foreground rounded-full p-0.5">
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
      </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
};
