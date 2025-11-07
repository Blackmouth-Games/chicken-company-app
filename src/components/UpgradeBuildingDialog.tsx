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
        <DialogContent className="max-w-sm sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Subir de nivel</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Building comparison */}
            <div className="flex items-center justify-center gap-4">
              <div className="flex flex-col items-center">
                <div className="text-6xl mb-1">{info.emoji}</div>
                <div className="text-xs text-muted-foreground">Nivel {currentLevel}</div>
              </div>
              
              <div className="text-2xl text-muted-foreground">→</div>
              
              <div className="flex flex-col items-center">
                <div className="text-6xl mb-1">{info.emoji}</div>
                <div className="text-xs text-muted-foreground">Nivel {nextLevel}</div>
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-2 bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-medium">Nivel:</span>
                <span className="text-sm ml-auto">{currentLevel} → {nextLevel}</span>
              </div>

              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-medium">{info.capacityLabel}</span>
                <span className="text-sm ml-auto">
                  {buildingType === 'market' ? '0.000' : newCapacity.toLocaleString()} → {buildingType === 'market' ? '0.000' : newCapacity.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Price button */}
            <Button
              onClick={handleUpgrade}
              disabled={isUpgrading}
              className="w-full bg-green-500 hover:bg-green-600 text-base py-6"
            >
              {isUpgrading ? "Procesando..." : `${upgradePrice.toFixed(3)} $ABCD`}
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
