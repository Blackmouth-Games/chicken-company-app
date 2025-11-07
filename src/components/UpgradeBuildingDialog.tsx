import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { useTonConnectUI } from "@tonconnect/ui-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TON_RECEIVER_WALLET } from "@/lib/constants";
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

  const handleUpgrade = async () => {
    if (!tonConnectUI.connected) {
      // Cierra este modal antes de abrir el de conectar wallet para evitar capas que bloqueen clics
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
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 60,
        messages: [
          {
            address: TON_RECEIVER_WALLET,
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
        description: `${buildingType === "warehouse" ? "Almacén" : "Market"} mejorado a nivel ${nextLevel}`,
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Mejorar {buildingType === "warehouse" ? "Almacén" : "Market"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Nivel actual:</span>
                <span className="font-semibold">Nivel {currentLevel}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Nuevo nivel:</span>
                <span className="font-semibold text-primary">Nivel {nextLevel}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Nueva capacidad:</span>
                <span className="font-semibold">{newCapacity.toLocaleString()}</span>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <span className="font-semibold">Precio:</span>
                <span className="text-2xl font-bold text-primary">
                  {upgradePrice} TON
                </span>
              </div>

              <Button
                onClick={handleUpgrade}
                disabled={isUpgrading}
                className="w-full"
                size="lg"
              >
                {isUpgrading ? "Procesando..." : "Mejorar Edificio"}
              </Button>
            </div>
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
