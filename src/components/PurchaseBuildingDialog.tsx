import { useState, useEffect } from "react";
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
import { ConnectWalletDialog } from "./ConnectWalletDialog";
import { useBuildingPrices } from "@/hooks/useBuildingPrices";
import { TON_RECEIVER_WALLET, TRANSACTION_TIMEOUT } from "@/lib/constants";

interface PurchaseBuildingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position: number;
  userId: string | null;
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
  const [showConnectWallet, setShowConnectWallet] = useState(false);
  const { toast } = useToast();
  const [tonConnectUI] = useTonConnectUI();
  const { getPrice } = useBuildingPrices();

  const buildingPrice = getPrice("corral", 1);
  const CORRAL_PRICE = buildingPrice?.price_ton || 0.1;
  const CORRAL_CAPACITY = buildingPrice?.capacity || 50;

  const handlePurchase = async () => {
    try {
      setIsPurchasing(true);

      // Show connect dialog only if wallet is NOT connected
      if (!tonConnectUI.connected) {
        // Cierra este modal antes de abrir el de conectar wallet para evitar capas que bloqueen clics
        onOpenChange(false);
        setTimeout(() => setShowConnectWallet(true), 0);
        setIsPurchasing(false);
        return;
      }

      // Create purchase record first
      const { data: purchaseRecord, error: purchaseError } = await supabase
        .from("building_purchases")
        .insert({
          user_id: userId,
          building_type: "corral",
          level: 1,
          price_ton: CORRAL_PRICE,
          wallet_address: tonConnectUI.wallet?.account.address,
          status: "pending",
        })
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      // Record metric: payment initiated
      await supabase.rpc("record_metric_event", {
        p_user_id: userId,
        p_event_type: "building_purchased",
        p_event_value: CORRAL_PRICE,
        p_metadata: {
          building_type: "corral",
          level: 1,
          purchase_id: purchaseRecord.id,
        },
      });

      // Send TON transaction
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + TRANSACTION_TIMEOUT,
        messages: [
          {
            address: TON_RECEIVER_WALLET,
            amount: (CORRAL_PRICE * 1e9).toString(), // Convert TON to nanoTON
          },
        ],
      };

      const result = await tonConnectUI.sendTransaction(transaction);

      // Insert building into database
      const { data: newBuilding, error: buildingError } = await supabase
        .from("user_buildings")
        .insert({
          user_id: userId,
          building_type: "corral",
          level: 1,
          position_index: position,
          capacity: CORRAL_CAPACITY,
          current_chickens: 0,
        })
        .select()
        .single();

      if (buildingError) throw buildingError;

      // Update purchase record as completed
      await supabase
        .from("building_purchases")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          building_id: newBuilding.id,
          transaction_hash: result.boc,
        })
        .eq("id", purchaseRecord.id);

      toast({
        title: "¡Corral comprado!",
        description: "Tu corral nivel 1 ha sido adquirido exitosamente",
      });

      onPurchaseComplete();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error purchasing building:", error);
      
      toast({
        title: "Error",
        description: error?.message || "No se pudo completar la compra. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsPurchasing(false);
    }
  };


  return (
    <>
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

      <ConnectWalletDialog 
        open={showConnectWallet} 
        onOpenChange={setShowConnectWallet}
      />
    </>
  );
};
