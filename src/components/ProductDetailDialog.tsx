import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { X } from "lucide-react";
import { StoreProduct } from "@/hooks/useStoreProducts";

interface ProductDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: StoreProduct | null;
}

export const ProductDetailDialog = ({ open, onOpenChange, product }: ProductDetailDialogProps) => {
  if (!product) return null;

  return (
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
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Precio</p>
            <p className="text-2xl font-bold text-green-600">
              {product.price_ton} $ABCD
            </p>
          </div>

          {/* Purchase Button (Coming Soon) */}
          <Button className="w-full" size="lg" disabled>
            Comprar - Coming Soon
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
