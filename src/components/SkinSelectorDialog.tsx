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
  // Now supports 10 skins per level (A-J or 1-10)
  // Only shows: owned skins, default skins, and empty slots for default skins not owned
  const inventorySlots = useMemo(() => {
    let slots: Array<{ level: number; variant: string; skin: typeof skins[0] | null }> = [];
    
    // Extract all unique levels from skins in database
    const levelSet = new Set<number>();
    
    // Scan all skins to find available levels
    for (const skin of skins) {
      // Support both old format (A, B, C) and new format (1-10 or A-J)
      const levelMatch = skin.skin_key.match(/_(\d+)([A-J]|\d{1,2})/);
      if (levelMatch) {
        const level = parseInt(levelMatch[1], 10);
        levelSet.add(level);
      }
    }
    
    // Get max level from database or use default
    const levels = levelSet.size > 0 ? Array.from(levelSet).sort((a, b) => a - b) : [1, 2, 3, 4, 5];
    const maxLevel = levels.length > 0 ? Math.max(...levels) : 5;
    
    // Generate 10 variants per level (A-J)
    const variants = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    
    // For each level, create slots for all 10 variants
    for (let level = 1; level <= maxLevel; level++) {
      for (const variant of variants) {
        const skinKey = `${buildingType}_${level}${variant}`;
        const skin = skins.find(s => s.skin_key === skinKey) || null;
        
        // Only include slot if:
        // 1. Skin exists and is owned by user
        // 2. Skin exists and is default (is_default = true)
        // 3. Skin doesn't exist but we want to show empty slots for defaults
        if (skin) {
          const isOwned = skin.is_default || hasItem("skin", skin.skin_key);
          const isDefault = skin.is_default;
          
          // Only add if owned or default
          if (isOwned || isDefault) {
            slots.push({ level, variant, skin });
          }
        } else {
          // For empty slots, we'll add them later only for default positions
          // We'll check if there's a default skin for this level that should be shown
          // For now, skip empty slots that don't correspond to defaults
        }
      }
    }
    
    // Now add empty slots for default skins that user doesn't own
    // Find all default skins and add empty slots for those the user doesn't have
    for (let level = 1; level <= maxLevel; level++) {
      for (const variant of variants) {
        const skinKey = `${buildingType}_${level}${variant}`;
        const skin = skins.find(s => s.skin_key === skinKey);
        
        // If it's a default skin but user doesn't own it, add empty slot
        if (skin && skin.is_default && !hasItem("skin", skin.skin_key)) {
          // Check if we already added this slot
          const alreadyAdded = slots.some(s => s.level === level && s.variant === variant);
          if (!alreadyAdded) {
            slots.push({ level, variant, skin: null }); // Empty slot for default skin not owned
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
  }, [skins, buildingType, hasItem]);

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
                          const isOwned = skin ? (skin.is_default || hasItem("skin", skin.skin_key)) : false;
                          const isSelected = skin ? (currentSkin === skin.skin_key || (!currentSkin && skin.is_default)) : false;
                          const isEmpty = !skin;
                          
                          // For empty slots, only show if they represent a default skin the user doesn't own
                          if (isEmpty) {
                            // Check if this empty slot corresponds to a default skin
                            const defaultSkin = skins.find(s => 
                              s.skin_key === `${buildingType}_${slot.level}${slot.variant}` && 
                              s.is_default
                            );
                            // Only show empty slot if it's for a default skin
                            if (!defaultSkin) {
                              return null; // Don't render non-default empty slots
                            }
                          }

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
