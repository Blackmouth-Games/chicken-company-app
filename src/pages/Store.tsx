import { useState, useEffect } from "react";
import { useStoreProducts } from "@/hooks/useStoreProducts";
import { useStorePurchases } from "@/hooks/useStorePurchases";
import { ProductDetailDialog } from "@/components/ProductDetailDialog";
import { StoreProduct } from "@/hooks/useStoreProducts";
import { Loader2 } from "lucide-react";
import { updateStoreProducts } from "@/scripts/updateStoreProducts";
import { getTelegramUser } from "@/lib/telegram";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

const Store = () => {
  const { products, loading, refetch } = useStoreProducts();
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [userId, setUserId] = useState<string | undefined>();
  const telegramUser = getTelegramUser();
  const { purchases, loading: purchasesLoading } = useStorePurchases(userId);

  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      if (!telegramUser?.id) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("telegram_id", telegramUser.id)
        .single();
      
      if (profile) {
        setUserId(profile.id);
      }
    };
    loadProfile();
  }, [telegramUser]);

  // Update products on mount (run once to fix images)
  useEffect(() => {
    const initProducts = async () => {
      await updateStoreProducts();
      refetch();
    };
    initProducts();
  }, []);

  const handleProductClick = (product: StoreProduct) => {
    setSelectedProduct(product);
    setDetailDialogOpen(true);
  };

  const isProductPurchased = (productId: string) => {
    return purchases.some(
      (p) => p.product_id === productId && p.status === "completed"
    );
  };

  return (
    <div className="min-h-screen bg-background p-6 pb-24">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Store</h1>
          <p className="text-muted-foreground">
            Explora nuestros paquetes especiales
          </p>
        </div>

        {loading || purchasesLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {products.map((product) => {
              const isPurchased = isProductPurchased(product.id);
              return (
                <button
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  className="w-full rounded-lg overflow-hidden hover:scale-[1.02] transition-transform active:scale-[0.98] relative"
                >
                  <img
                    src={product.store_image_url}
                    alt={product.name}
                    className={`w-full h-auto object-cover ${isPurchased ? 'opacity-60' : ''}`}
                    onError={(e) => {
                      e.currentTarget.src = "https://via.placeholder.com/600x150?text=" + encodeURIComponent(product.name);
                    }}
                  />
                  {isPurchased && (
                    <Badge className="absolute top-4 right-4 bg-green-600 hover:bg-green-600 text-white font-bold px-3 py-1 text-sm">
                      ✓ Adquirido
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <ProductDetailDialog
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          product={selectedProduct}
          isPurchased={selectedProduct ? isProductPurchased(selectedProduct.id) : false}
        />
      </div>
    </div>
  );
};

export default Store;
