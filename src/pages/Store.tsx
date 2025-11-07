import { useState, useEffect } from "react";
import { useStoreProducts } from "@/hooks/useStoreProducts";
import { ProductDetailDialog } from "@/components/ProductDetailDialog";
import { StoreProduct } from "@/hooks/useStoreProducts";
import { Loader2 } from "lucide-react";
import { updateStoreProducts } from "@/scripts/updateStoreProducts";

const Store = () => {
  const { products, loading, refetch } = useStoreProducts();
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

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

  return (
    <div className="min-h-screen bg-background p-6 pb-24">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Store</h1>
          <p className="text-muted-foreground">
            Explora nuestros paquetes especiales
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {products.map((product) => (
              <button
                key={product.id}
                onClick={() => handleProductClick(product)}
                className="w-full rounded-lg overflow-hidden hover:scale-[1.02] transition-transform active:scale-[0.98]"
              >
                <img
                  src={product.store_image_url}
                  alt={product.name}
                  className="w-full h-auto object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "https://via.placeholder.com/600x150?text=" + encodeURIComponent(product.name);
                  }}
                />
              </button>
            ))}
          </div>
        )}

        <ProductDetailDialog
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          product={selectedProduct}
        />
      </div>
    </div>
  );
};

export default Store;
