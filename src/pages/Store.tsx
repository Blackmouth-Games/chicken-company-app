import { useState, useEffect } from "react";
import { useStoreProducts } from "@/hooks/useStoreProducts";
import { useStorePurchases } from "@/hooks/useStorePurchases";
import { ProductDetailDialog } from "@/components/ProductDetailDialog";
import { StoreProduct } from "@/hooks/useStoreProducts";
import { Loader2 } from "lucide-react";
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

  // All product data including image URLs are managed in the database via migrations
  // No need to update products from the client side

  // Run migration on mount (one-time execution)
  useEffect(() => {
    const runMigration = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('run-migration', {
          body: {}
        });

        if (error) {
          // If function not deployed, try direct execution
          if (error.message?.includes('not found') || error.message?.includes('404')) {
            console.log('Edge Function not deployed, executing migration directly...');
            await executeMigrationDirect();
          } else {
            console.error('Migration error:', error);
          }
        } else {
          console.log('Migration completed via Edge Function:', data);
        }
      } catch (err) {
        console.error('Error running migration:', err);
      }
    };

    // Only run once on mount
    runMigration();
  }, []);

  const executeMigrationDirect = async () => {
    // Update basic_skins_pack
    const { data: existingSkinsPack } = await supabase
      .from('store_products')
      .select('content_items')
      .eq('product_key', 'basic_skins_pack')
      .single();

    if (existingSkinsPack) {
      const contentItems = existingSkinsPack.content_items as string[] | null;
      const hasOldFormat = contentItems && (
        contentItems.includes('skin_corral_red') ||
        contentItems.includes('skin_corral_blue') ||
        contentItems.includes('skin_corral_green') ||
        contentItems.includes('skin_warehouse_premium') ||
        contentItems.includes('skin_market_deluxe')
      );

      if (hasOldFormat) {
        await supabase
          .from('store_products')
          .update({
            content_items: ['corral_1B', 'corral_2B', 'corral_3B', 'warehouse_1B', 'market_1B']
          })
          .eq('product_key', 'basic_skins_pack');
      }
    }

    // Insert or update all products
    const products = [
      {
        product_key: 'starter_pack',
        name: 'Starter Pack',
        description: 'Paquete inicial para comenzar tu granja',
        price_ton: 15,
        content_items: ['Subida de nivel de Maria la Pollera a nivel 2', 'Nuevo corral', 'Nuevo Granjero Juan'],
        store_image_url: '/images/store/starter-pack.png',
        detail_image_url: '/images/store/starter-pack-detail.png',
        is_active: true,
        sort_order: 1
      },
      {
        product_key: 'christmas_pack',
        name: 'Christmas Pack',
        description: 'Edición especial de Navidad',
        price_ton: 2.5,
        content_items: ['Decoraciones navideñas', 'Market especial', 'Bonus de temporada'],
        store_image_url: '/images/store/christmas-pack.png',
        detail_image_url: '/images/store/christmas-pack-detail.png',
        is_active: true,
        sort_order: 2
      },
      {
        product_key: 'winter_chickens',
        name: 'Winter Chickens',
        description: 'Pack de 200 gallinas de invierno',
        price_ton: 202,
        content_items: ['200 gallinas de invierno', 'Resistentes al frío'],
        store_image_url: '/images/store/winter-chickens.png',
        detail_image_url: '/images/store/winter-chickens-detail.png',
        is_active: true,
        sort_order: 3
      },
      {
        product_key: 'support_builders',
        name: 'Support Builders',
        description: 'Apoyo a los constructores',
        price_ton: 10,
        content_items: ['Trabajador adicional', 'Velocidad de construcción aumentada'],
        store_image_url: '/images/store/support-builders.png',
        detail_image_url: '/images/store/support-builders-detail.png',
        is_active: true,
        sort_order: 4
      },
      {
        product_key: 'basic_skins_pack',
        name: 'Pack de Skins Básico',
        description: 'Colección de 5 skins únicos para tus edificios',
        price_ton: 0.5,
        content_items: ['corral_1B', 'corral_2B', 'corral_3B', 'warehouse_1B', 'market_1B'],
        store_image_url: '/images/store/skins-pack.png',
        detail_image_url: '/images/store/skins-pack-detail.png',
        is_active: true,
        sort_order: 5
      }
    ];

    for (const product of products) {
      const { data: existing } = await supabase
        .from('store_products')
        .select('id, store_image_url, detail_image_url')
        .eq('product_key', product.product_key)
        .single();

      if (existing) {
        await supabase
          .from('store_products')
          .update({
            name: product.name,
            description: product.description,
            price_ton: product.price_ton,
            content_items: product.content_items,
            store_image_url: product.store_image_url || existing.store_image_url,
            detail_image_url: product.detail_image_url || existing.detail_image_url,
            is_active: product.is_active,
            sort_order: product.sort_order
          })
          .eq('product_key', product.product_key);
      } else {
        await supabase
          .from('store_products')
          .insert(product);
      }
    }
  };

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
                    style={{ maxHeight: '132px' }}
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
