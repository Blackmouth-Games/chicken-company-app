import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { X } from "lucide-react";
import { StoreProduct } from "@/hooks/useStoreProducts";
import { useState } from "react";
import { useTonWallet, useTonConnectUI } from "@tonconnect/ui-react";
import { ConnectWalletDialog } from "./ConnectWalletDialog";
import { toast } from "@/hooks/use-toast";

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

  if (!product) return null;

  const handlePurchase = async () => {
    if (!wallet) {
      setShowConnectWallet(true);
      return;
    }

    setIsPurchasing(true);
    try {
      // TODO: Implement actual TON purchase flow with Supabase
      toast({
        title: "Próximamente",
        description: "La compra con TON estará disponible pronto",
      });
    } catch (error) {
      console.error("Purchase error:", error);
      toast({
        title: "Error",
        description: "No se pudo completar la compra",
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

            {/* Price and Purchase Button */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Precio</p>
              <p className="text-xl font-bold text-green-600 mb-3">
                {product.price_ton} $ABCD
              </p>
            </div>

            {/* Purchase Button with TON payment */}
            <Button 
              className="w-full" 
              size="lg" 
              onClick={handlePurchase}
              disabled={isPurchasing}
            >
              {isPurchasing ? "Procesando..." : `Comprar - ${product.price_ton} TON`}
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
