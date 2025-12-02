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
import { normalizeTonAddress } from "@/lib/ton";
import { useAudio } from "@/contexts/AudioContext";

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
  const { playSound } = useAudio();

  const buildingPrice = getPrice("coop", 1);
  const COOP_PRICE = buildingPrice?.price_ton || 0.1;
  const COOP_CAPACITY = buildingPrice?.capacity || 50;

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
          building_type: "coop",
          level: 1,
          price_ton: COOP_PRICE,
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
        p_event_value: COOP_PRICE,
        p_metadata: {
          building_type: "coop",
          level: 1,
          purchase_id: purchaseRecord.id,
        },
      });

      // Send TON transaction
      const destination = normalizeTonAddress(TON_RECEIVER_WALLET);
      console.log("[PurchaseBuildingDialog] Sending TON transaction", {
        destination,
        amount: COOP_PRICE,
        purchaseId: purchaseRecord.id,
      });
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + TRANSACTION_TIMEOUT,
        messages: [
          {
            address: destination,
            amount: (COOP_PRICE * 1e9).toString(), // Convert TON to nanoTON
          },
        ],
      };
      const result = await tonConnectUI.sendTransaction(transaction);

      // Check if position is already occupied
      const { data: existingBuildingAtPosition } = await supabase
        .from("user_buildings")
        .select("id, position_index")
        .eq("user_id", userId)
        .eq("position_index", position)
        .single();

      let actualPosition = position;
      
      // If position is occupied, find the first available position
      if (existingBuildingAtPosition) {
        console.warn(`[PurchaseBuildingDialog] Position ${position} is occupied, finding available position`);
        
        // Get all occupied positions
        const { data: allBuildings } = await supabase
          .from("user_buildings")
          .select("position_index")
          .eq("user_id", userId)
          .gte("position_index", 0); // Only check non-negative positions
        
        const occupiedPositions = new Set((allBuildings || []).map(b => b.position_index));
        
        // Find first available position (0-19 for coops)
        for (let i = 0; i < 20; i++) {
          if (!occupiedPositions.has(i)) {
            actualPosition = i;
            break;
          }
        }
        
        if (actualPosition === position) {
          // No available position found, this shouldn't happen but handle gracefully
          throw new Error("No hay espacios disponibles para construir");
        }
      }

      // Insert building into database
      const { data: newBuilding, error: buildingError } = await supabase
        .from("user_buildings")
        .insert({
          user_id: userId,
          building_type: "coop",
          level: 1,
          position_index: actualPosition,
          capacity: COOP_CAPACITY,
          current_chickens: 0,
        })
        .select()
        .single();

      if (buildingError) {
        // Check if it's a duplicate key error
        if (buildingError.code === '23505' || buildingError.message?.includes('duplicate key')) {
          throw new Error("Esta posición ya está ocupada. Por favor, intenta en otra posición.");
        }
        throw buildingError;
      }

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

      // Play purchase sound
      const purchaseSound = new Audio("/sounds/purchase.mp3");
      playSound(purchaseSound);

      toast({
        title: "¡Coop comprado!",
        description: "Tu coop nivel 1 ha sido adquirido exitosamente",
      });

      onPurchaseComplete();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error purchasing building:", error);
      
      // Update purchase status to failed/cancelled
      try {
        const purchaseId = purchaseRecord?.id;
        if (purchaseId) {
          const isCancelled = error?.message?.includes("User rejects") || error?.message?.includes("cancelled");
          await supabase
            .from("building_purchases")
            .update({
              status: isCancelled ? "cancelled" : "failed",
            })
            .eq("id", purchaseId);
        }
      } catch (updateError) {
        console.error("Error updating purchase status:", updateError);
      }
      
      // Provide user-friendly error message
      let errorMessage = error?.message || "No se pudo completar la compra. Intenta nuevamente.";
      if (error?.code === '23505' || error?.message?.includes('duplicate key')) {
        errorMessage = "Esta posición ya está ocupada. Por favor, intenta en otra posición.";
      } else if (error?.message?.includes("User rejects")) {
        errorMessage = "Transacción cancelada";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsPurchasing(false);
    }
  };


  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold">
              Adquiere Coop
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
                <span className="font-semibold">Max. Capacity:</span> {COOP_CAPACITY}
              </div>
            </div>

            {/* Price */}
            <div className="bg-accent/50 px-6 py-2 rounded-md">
              <span className="text-sm font-medium">{COOP_PRICE} TON</span>
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
              {isPurchasing ? "Comprando..." : "Comprar Coop"}
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
