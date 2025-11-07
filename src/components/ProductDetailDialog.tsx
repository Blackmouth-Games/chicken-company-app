import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { X } from "lucide-react";
import { StoreProduct } from "@/hooks/useStoreProducts";
import { useState } from "react";
import { useTonConnectUI } from "@tonconnect/ui-react";
import { ConnectWalletDialog } from "./ConnectWalletDialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getTelegramUser } from "@/lib/telegram";
import { useAudio } from "@/contexts/AudioContext";
import { TON_RECEIVER_WALLET } from "@/lib/constants";
import { normalizeTonAddress } from "@/lib/ton";

interface ProductDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: StoreProduct | null;
}

export const ProductDetailDialog = ({ open, onOpenChange, product }: ProductDetailDialogProps) => {
  const [tonConnectUI] = useTonConnectUI();
  const [showConnectWallet, setShowConnectWallet] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const { toast } = useToast();
  const telegramUser = getTelegramUser();
  const { playSound } = useAudio();

  if (!product) return null;

  const handlePurchase = async () => {
    // Check wallet connection
    if (!tonConnectUI.connected) {
      onOpenChange(false);
      setTimeout(() => setShowConnectWallet(true), 0);
      return;
    }

    // Get user profile
    if (!telegramUser?.id) {
      toast({
        title: "Error",
        description: "No se pudo identificar el usuario",
        variant: "destructive",
      });
      return;
    }

    setIsPurchasing(true);
    try {
      // 1. Get user profile ID
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("telegram_id", telegramUser.id)
        .single();

      if (!profile) {
        throw new Error("Profile not found");
      }

      const userId = profile.id;

      // 2. Create pending purchase record
      const { data: purchase, error: purchaseError } = await supabase
        .from("store_purchases")
        .insert({
          user_id: userId,
          product_id: product.id,
          product_key: product.product_key,
          price_ton: product.price_ton,
          status: "pending",
          wallet_address: tonConnectUI.account?.address || null,
        })
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      console.log("Purchase record created:", purchase.id);

      // 3. Send TON transaction
      const destination = normalizeTonAddress(TON_RECEIVER_WALLET);
      console.log("[ProductDetailDialog] Sending TON transaction", {
        destination,
        amount: parseFloat(product.price_ton.toString()),
        purchaseId: purchase.id,
      });
      
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 600, // 10 minutes
        messages: [
          {
            address: destination,
            amount: (parseFloat(product.price_ton.toString()) * 1e9).toString(), // Convert TON to nanotons
          },
        ],
      };

      const result = await tonConnectUI.sendTransaction(transaction);
      console.log("Transaction sent:", result);

      // 4. Parse content items and add to user inventory
      if (product.content_items && product.content_items.length > 0) {
        const itemsToInsert = product.content_items.map((itemDesc: string) => {
          // Parse item description to extract type and quantity
          // Format examples: "Subida de nivel de Maria la Pollera a nivel 2", "Nuevo corral", "Nuevo Granjero Juan"
          let itemType = "pack_item";
          let itemKey = product.product_key;
          
          if (itemDesc.toLowerCase().includes("corral")) {
            itemType = "building";
            itemKey = "corral";
          } else if (itemDesc.toLowerCase().includes("granjero")) {
            itemType = "character";
            itemKey = "farmer";
          } else if (itemDesc.toLowerCase().includes("nivel")) {
            itemType = "upgrade";
            itemKey = "level_boost";
          }

          return {
            user_id: userId,
            item_type: itemType,
            item_key: itemKey,
            quantity: 1,
          };
        });

        const { error: itemsError } = await supabase
          .from("user_items")
          .insert(itemsToInsert);

        if (itemsError) {
          console.error("Error adding items to inventory:", itemsError);
        }
      }

      // 5. Update purchase as completed
      const { error: updateError } = await supabase
        .from("store_purchases")
        .update({
          status: "completed",
          transaction_hash: result.boc,
          completed_at: new Date().toISOString(),
        })
        .eq("id", purchase.id);

      if (updateError) throw updateError;

      // 6. Play success sound
      const purchaseSound = new Audio("/sounds/purchase.mp3");
      playSound(purchaseSound);

      // 7. Show success message
      toast({
        title: "¡Compra exitosa! 🎉",
        description: `Has adquirido ${product.name}. Los artículos se han añadido a tu inventario.`,
      });

      // 8. Close dialog
      onOpenChange(false);

    } catch (error: any) {
      console.error("Purchase error:", error);
      
      let errorMessage = "No se pudo completar la compra";
      if (error?.message?.includes("User rejects")) {
        errorMessage = "Transacción cancelada";
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error en la compra",
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
            <DialogTitle className="flex items-center justify-between">
              Adquire
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Product Detail Image */}
            <div className="w-full aspect-video rounded-lg overflow-hidden bg-muted flex items-center justify-center">
              <img
                src={product.detail_image_url}
                alt={product.name}
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.src = "https://via.placeholder.com/400x300?text=" + encodeURIComponent(product.name);
                }}
              />
            </div>

            {/* Content Items */}
            {product.content_items && product.content_items.length > 0 && (
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">Contenido</h3>
                <ul className="space-y-1">
                  {product.content_items.map((item, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      - {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Price Display */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Precio</p>
              <p className="text-xl font-bold text-green-600">
                {product.price_ton} $ABCD
              </p>
            </div>

            {/* Purchase Button with TON payment */}
            <Button 
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700" 
              size="lg" 
              onClick={handlePurchase}
              disabled={isPurchasing}
            >
              {isPurchasing ? "Procesando compra..." : `Comprar - ${product.price_ton} TON`}
            </Button>

            {!tonConnectUI.connected && (
              <p className="text-xs text-center text-muted-foreground">
                Necesitas conectar tu wallet TON para realizar la compra
              </p>
            )}
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
