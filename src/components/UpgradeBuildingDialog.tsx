import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Info } from "lucide-react";
import { useTonConnectUI } from "@tonconnect/ui-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TON_RECEIVER_WALLET } from "@/lib/constants";
import { normalizeTonAddress } from "@/lib/ton";
import { ConnectWalletDialog } from "./ConnectWalletDialog";
import { useAudio } from "@/contexts/AudioContext";
import { getBuildingImage, BuildingType } from "@/lib/buildingImages";

interface UpgradeBuildingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buildingId: string;
  buildingType: string;
  currentLevel: number;
  nextLevel: number;
  userId: string;
  upgradePrice: number;
  newCapacity: number;
  onUpgradeComplete: () => void;
}

export const UpgradeBuildingDialog = ({
  open,
  onOpenChange,
  buildingId,
  buildingType,
  currentLevel,
  nextLevel,
  userId,
  upgradePrice,
  newCapacity,
  onUpgradeComplete,
}: UpgradeBuildingDialogProps) => {
  const [tonConnectUI] = useTonConnectUI();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [showConnectWallet, setShowConnectWallet] = useState(false);
  const { toast } = useToast();
  const { playSound } = useAudio();

  // Building emojis and labels
  const buildingInfo: Record<string, { emoji: string; label: string; capacityLabel: string }> = {
    corral: { emoji: "🏠", label: "Corral", capacityLabel: "Max. Capacity:" },
    warehouse: { emoji: "🏭", label: "Almacén", capacityLabel: "Max. Capacity:" },
    market: { emoji: "🏪", label: "Market", capacityLabel: "Velocidad in" },
  };

  const info = buildingInfo[buildingType] || buildingInfo.corral;

  const handleUpgrade = async () => {
    if (!tonConnectUI.connected) {
      onOpenChange(false);
      setTimeout(() => setShowConnectWallet(true), 0);
      return;
    }

    setIsUpgrading(true);

    try {
      // Insert pending purchase record
      const { data: purchaseData, error: purchaseError } = await supabase
        .from("building_purchases")
        .insert({
          user_id: userId,
          building_type: buildingType,
          building_id: buildingId,
          level: nextLevel,
          price_ton: upgradePrice,
          status: "pending",
        })
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      // Send TON transaction
      const destination = normalizeTonAddress(TON_RECEIVER_WALLET);
      console.log("[UpgradeBuildingDialog] Sending TON transaction", {
        destination,
        amount: upgradePrice,
        buildingId,
        purchaseId: purchaseData.id,
      });
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 60,
        messages: [
          {
            address: destination,
            amount: (upgradePrice * 1e9).toString(),
          },
        ],
      };
      const result = await tonConnectUI.sendTransaction(transaction);

      // Update building
      const { error: updateError } = await supabase
        .from("user_buildings")
        .update({
          level: nextLevel,
          capacity: newCapacity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", buildingId)
        .eq("user_id", userId);

      if (updateError) throw updateError;

      // Update purchase record as completed
      await supabase
        .from("building_purchases")
        .update({
          status: "completed",
          transaction_hash: result.boc,
          completed_at: new Date().toISOString(),
        })
        .eq("id", purchaseData.id);

      // Play upgrade sound
      const upgradeSound = new Audio("/sounds/upgrade.mp3");
      playSound(upgradeSound);

      toast({
        title: "¡Éxito!",
        description: `${info.label} mejorado a nivel ${nextLevel}`,
      });

      onUpgradeComplete();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error upgrading building:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo mejorar el edificio",
        variant: "destructive",
      });
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm sm:max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              ⬆️ Subir de nivel
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Building comparison with animation */}
            <div className="relative flex items-center justify-center gap-6 p-6 bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl">
              {/* Current Level - Fade out effect */}
              <div className="flex flex-col items-center animate-in fade-in slide-in-from-left-5 duration-500">
                <div className="text-7xl mb-2 transform transition-transform duration-300 hover:scale-110">
                  {getBuildingImage(buildingType as BuildingType, currentLevel)}
                </div>
                <div className="px-3 py-1 bg-muted rounded-full">
                  <span className="text-xs font-semibold text-muted-foreground">Nivel {currentLevel}</span>
                </div>
              </div>
              
              {/* Arrow with pulse animation */}
              <div className="text-3xl animate-pulse text-primary">
                →
              </div>
              
              {/* Next Level - Emphasize with glow */}
              <div className="flex flex-col items-center animate-in fade-in slide-in-from-right-5 duration-500 delay-150">
                <div className="text-7xl mb-2 transform transition-transform duration-300 hover:scale-110 drop-shadow-[0_0_15px_rgba(var(--primary),0.5)]">
                  {getBuildingImage(buildingType as BuildingType, nextLevel)}
                </div>
                <div className="px-3 py-1 bg-primary/20 rounded-full border-2 border-primary/50">
                  <span className="text-xs font-bold text-primary">Nivel {nextLevel}</span>
                </div>
              </div>
            </div>

            {/* Stats Card - Improved design */}
            <div className="space-y-3 bg-gradient-to-br from-accent/50 to-accent/20 rounded-xl p-5 border border-border/50 shadow-inner">
              <div className="flex items-center justify-between p-3 bg-background/80 rounded-lg backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  <span className="text-sm font-medium">Nivel</span>
                </div>
                <span className="text-sm font-bold">
                  {currentLevel} <span className="text-primary">→</span> {nextLevel}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-background/80 rounded-lg backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium">{info.capacityLabel}</span>
                </div>
                <span className="text-sm font-bold text-green-600">
                  {buildingType === 'market' ? '0.000' : newCapacity.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Price button with gradient and animation */}
            <Button
              onClick={handleUpgrade}
              disabled={isUpgrading}
              className="w-full bg-gradient-to-r from-green-500 via-green-600 to-green-500 hover:from-green-600 hover:via-green-700 hover:to-green-600 text-white text-lg py-7 shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
            >
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              
              <span className="relative flex items-center justify-center gap-2 font-bold">
                {isUpgrading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    💎 {upgradePrice.toFixed(3)} TON
                  </>
                )}
              </span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConnectWalletDialog
        open={showConnectWallet}
        onOpenChange={setShowConnectWallet}
      />
    </>
  );
};
