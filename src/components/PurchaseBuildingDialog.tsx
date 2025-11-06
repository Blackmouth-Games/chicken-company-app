import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTonConnectUI } from "@tonconnect/ui-react";

interface PurchaseBuildingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position: number;
  userId: string;
  onPurchaseComplete: () => void;
}

export const PurchaseBuildingDialog = ({
  open,
  onOpenChange,
  position,
  userId,
  onPurchaseComplete,
}: PurchaseBuildingDialogProps) => {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const { toast } = useToast();
  const [tonConnectUI] = useTonConnectUI();

  const CORRAL_PRICE = 0.1; // TON price for level 1 corral
  const CORRAL_CAPACITY = 50;

  const handlePurchase = async () => {
    try {
      setIsPurchasing(true);

      // Check if wallet is connected
      if (!tonConnectUI.connected) {
        toast({
          title: "Wallet no conectada",
          description: "Por favor conecta tu wallet en la pestaña Wallet",
          variant: "destructive",
        });
        return;
      }

      // Send TON transaction
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 60, // 60 seconds
        messages: [
          {
            address: "UQD5D_QOx3KxNVGcXPLp15j_pJvA2Z5BCjJWIYVHHPLvQ3K8", // Replace with your wallet
            amount: (CORRAL_PRICE * 1e9).toString(), // Convert TON to nanoTON
          },
        ],
      };

      await tonConnectUI.sendTransaction(transaction);

      // Insert building into database
      const { error } = await supabase.from("user_buildings").insert({
        user_id: userId,
        building_type: "corral",
        level: 1,
        position_index: position,
        capacity: CORRAL_CAPACITY,
        current_chickens: 0,
      });

      if (error) throw error;

      toast({
        title: "¡Corral comprado!",
        description: "Tu corral nivel 1 ha sido adquirido exitosamente",
      });

      onPurchaseComplete();
      onOpenChange(false);
    } catch (error) {
      console.error("Error purchasing building:", error);
      toast({
        title: "Error",
        description: "No se pudo completar la compra. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold">
            Adquiere Corral
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {/* Building Image */}
          <div className="w-32 h-32 flex items-center justify-center">
            <div className="text-7xl">🏠</div>
          </div>

          {/* Level */}
          <div className="text-lg font-semibold text-muted-foreground">Lvl 1</div>

          {/* Capacity */}
          <div className="flex items-center gap-2 w-full px-4">
            <Info className="h-5 w-5 text-muted-foreground" />
            <div className="text-sm">
              <span className="font-semibold">Max. Capacity:</span> {CORRAL_CAPACITY}
            </div>
          </div>

          {/* Price */}
          <div className="bg-accent/50 px-6 py-2 rounded-md">
            <span className="text-sm font-medium">{CORRAL_PRICE} TON</span>
          </div>

          {/* Info */}
          <div className="bg-muted/50 p-4 rounded-lg w-full">
            <div className="text-sm font-semibold mb-1">info:</div>
            <div className="text-sm text-muted-foreground">
              Este edificio sirve para almacenar gallinas.
            </div>
          </div>

          {/* Purchase Button */}
          <Button
            onClick={handlePurchase}
            disabled={isPurchasing}
            className="w-full"
            size="lg"
          >
            {isPurchasing ? "Comprando..." : "Comprar Corral"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
