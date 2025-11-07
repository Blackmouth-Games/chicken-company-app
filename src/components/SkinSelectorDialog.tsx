import { Dialog, DialogContent } from "./ui/dialog";
import { Button } from "./ui/button";
import { useBuildingSkins } from "@/hooks/useBuildingSkins";
import { useUserItems } from "@/hooks/useUserItems";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, Check } from "lucide-react";

interface SkinSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buildingId: string;
  buildingType: string;
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

  const handleSelectSkin = async (skinKey: string) => {
    if (!userId) return;

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
      toast({
        title: "Error",
        description: error.message || "No se pudo aplicar la skin",
        variant: "destructive",
      });
    }
  };

  const loading = skinsLoading || itemsLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] max-w-2xl p-0 sm:rounded-lg max-h-[85vh]">
        <div className="flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-2xl font-bold">Seleccionar Skin</h2>
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
              <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
                {skins
                  .filter((skin) => skin.is_default || hasItem("skin", skin.skin_key))
                  .map((skin) => {
                  const isOwned = skin.is_default || hasItem("skin", skin.skin_key);
                  const isSelected = currentSkin === skin.skin_key || (!currentSkin && skin.is_default);

                  return (
                    <div
                      key={skin.id}
                      className={`relative p-4 rounded-lg border-2 transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10"
                          : isOwned
                          ? "border-border hover:border-primary/50"
                          : "border-muted opacity-60"
                      }`}
                    >
                      {/* Skin Image */}
                      <div className="text-7xl text-center mb-3">{skin.image_url}</div>

                      {/* Skin Name */}
                      <div className="text-center">
                        <div className="font-semibold mb-1">{skin.name}</div>
                        <div className="text-xs text-muted-foreground capitalize mb-3">
                          {skin.rarity}
                        </div>

                        {/* Action Button */}
                        <Button
                          onClick={() => handleSelectSkin(skin.skin_key)}
                          disabled={isSelected}
                          className="w-full"
                          size="sm"
                        >
                          {isSelected ? (
                            <>
                              <Check className="w-4 h-4 mr-1" />
                              Seleccionada
                            </>
                          ) : (
                            "Seleccionar"
                          )}
                        </Button>
                      </div>

                      {/* Selected Badge */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                          En uso
                        </div>
                      )}
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
