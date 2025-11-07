import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { X } from "lucide-react";
import { StoreProduct } from "@/hooks/useStoreProducts";
import { useState } from "react";
import { useTonWallet, useTonConnectUI } from "@tonconnect/ui-react";
import { ConnectWalletDialog } from "./ConnectWalletDialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getTelegramUser } from "@/lib/telegram";
import { useAudio } from "@/contexts/AudioContext";

interface ProductDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: StoreProduct | null;
}

export const ProductDetailDialog = ({ open, onOpenChange, product }: ProductDetailDialogProps) => {
  const wallet = useTonWallet();
  const [tonConnectUI] = useTonConnectUI();
  const [showConnectWallet, setShowConnectWallet] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const telegramUser = getTelegramUser();
  const { playSound } = useAudio();

  if (!product) return null;

  const handlePurchase = async () => {
    // Check wallet connection
    if (!wallet) {
      setShowConnectWallet(true);
      return;
    }

    // Check telegram user
    if (!telegramUser?.id) {
      toast({
        title: "Error",
        description: "No se pudo identificar al usuario de Telegram",
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
        throw new Error("Perfil de usuario no encontrado");
      }

      const userId = profile.id;
      const walletAddress = wallet.account.address;

      // 2. Create pending purchase record
      const { data: purchase, error: purchaseError } = await supabase
        .from("store_purchases")
        .insert({
          user_id: userId,
          product_id: product.id,
          product_key: product.product_key,
          price_ton: product.price_ton,
          status: 'pending',
          wallet_address: walletAddress,
          metadata: {
            product_name: product.name,
            content_items: product.content_items,
          }
        })
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      console.log('Purchase record created:', purchase);

      // 3. Send TON transaction
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 600, // 10 minutes
        messages: [
          {
            address: "UQBvRWKNrLLS9xG_YW2Qxn41lQS7k5fTfJcvahKmgjy3nYvT", // Company wallet
            amount: String(Math.floor(Number(product.price_ton) * 1000000000)), // Convert to nanotons
            payload: btoa(JSON.stringify({
              type: 'store_purchase',
              purchase_id: purchase.id,
              product_key: product.product_key,
            })),
          },
        ],
      };

      console.log('Sending transaction:', transaction);
      const result = await tonConnectUI.sendTransaction(transaction);
      console.log('Transaction result:', result);

      // 4. Update purchase with transaction hash
      const { error: updateError } = await supabase
        .from("store_purchases")
        .update({
          status: 'completed',
          transaction_hash: result.boc || 'unknown',
          completed_at: new Date().toISOString(),
        })
        .eq('id', purchase.id);

      if (updateError) throw updateError;

      // 5. Add items to user inventory if product has content
      if (product.content_items && product.content_items.length > 0) {
        const itemsToInsert = product.content_items.map(item => ({
          user_id: userId,
          item_type: 'store_product',
          item_key: `${product.product_key}_${Date.now()}`,
          quantity: 1,
          metadata: {
            product_id: product.id,
            product_name: product.name,
            content_item: item,
            purchase_id: purchase.id,
          }
        }));

        const { error: itemsError } = await supabase
          .from("user_items")
          .insert(itemsToInsert);

        if (itemsError) {
          console.error('Error adding items to inventory:', itemsError);
          // Don't throw - purchase was successful even if items failed
        }
      }

      // 6. Play success sound and show confirmation
      const purchaseSound = new Audio("/sounds/purchase.mp3");
      playSound(purchaseSound);

      toast({
        title: "¡Compra exitosa!",
        description: `Has adquirido ${product.name}`,
      });

      // Close dialog after success
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);

    } catch (error: any) {
      console.error("Purchase error:", error);
      
      // Handle user rejection
      if (error?.message?.includes('reject') || error?.message?.includes('cancel')) {
        toast({
          title: "Compra cancelada",
          description: "Has cancelado la transacción",
        });
      } else {
        toast({
          title: "Error en la compra",
          description: error?.message || "No se pudo completar la compra. Intenta de nuevo.",
          variant: "destructive",
        });
      }
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
                {product.price_ton} TON
              </p>
            </div>

            {/* Purchase Button with TON payment */}
            <Button 
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700" 
              size="lg" 
              onClick={handlePurchase}
              disabled={isPurchasing}
            >
              {isPurchasing ? "Procesando..." : `Comprar - ${product.price_ton} TON`}
            </Button>

            {/* Wallet status indicator */}
            {!wallet && (
              <p className="text-xs text-center text-muted-foreground">
                Necesitas conectar tu wallet TON para comprar
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
