import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, DollarSign } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useNavigate } from "react-router-dom";
import { LoadingScreen } from "@/components/LoadingScreen";

interface StoreProduct {
  id: string;
  product_key: string;
  name: string;
  price_ton: number;
  is_active: boolean;
  sort_order: number;
}

export const AdminStore = () => {
  const { user, isAdmin, loading: authLoading, signOut } = useAdminAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [editingPrices, setEditingPrices] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Load products when user is authenticated and is admin
  useEffect(() => {
    if (!authLoading && user && isAdmin === true) {
      loadProducts();
    }
  }, [authLoading, user, isAdmin]);

  // Redirect to login if not authenticated or not admin
  useEffect(() => {
    if (!authLoading && (!user || isAdmin === false)) {
      navigate("/admin/login");
    }
  }, [authLoading, user, isAdmin, navigate]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("store_products")
        .select("id, product_key, name, price_ton, is_active, sort_order")
        .order("sort_order");

      if (error) throw error;

      setProducts(data || []);
      // Initialize editing prices with current prices
      const initialPrices: Record<string, number> = {};
      (data || []).forEach((product) => {
        initialPrices[product.id] = product.price_ton;
      });
      setEditingPrices(initialPrices);
    } catch (error: any) {
      console.error("Error loading products:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (productId: string, newPrice: number) => {
    setEditingPrices((prev) => ({
      ...prev,
      [productId]: newPrice,
    }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // Update all products with their new prices
      const updates = Object.entries(editingPrices).map(([productId, price]) => ({
        id: productId,
        price_ton: price,
        updated_at: new Date().toISOString(),
      }));

      let successCount = 0;
      let errorCount = 0;

      for (const update of updates) {
        const { error } = await supabase
          .from("store_products")
          .update({
            price_ton: update.price_ton,
            updated_at: update.updated_at,
          })
          .eq("id", update.id);

        if (error) {
          console.error(`Error updating product ${update.id}:`, error);
          errorCount++;
        } else {
          successCount++;
        }
      }

      if (errorCount === 0) {
        toast({
          title: "¡Éxito!",
          description: `Se actualizaron ${successCount} productos correctamente`,
        });
        // Reload products to get updated data
        await loadProducts();
      } else {
        toast({
          title: "Completado con errores",
          description: `${successCount} exitosos, ${errorCount} errores`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error saving prices:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron guardar los precios",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSetAllTo001 = () => {
    const newPrices: Record<string, number> = {};
    products.forEach((product) => {
      newPrices[product.id] = 0.001;
    });
    setEditingPrices(newPrices);
    toast({
      title: "Precios actualizados",
      description: "Todos los precios se han establecido a 0.001 TON (aún no guardados)",
    });
  };

  // Show loading while checking auth
  if (authLoading) {
    return <LoadingScreen message="Verificando permisos..." />;
  }

  // Don't render if not authenticated or not admin (redirect will happen in useEffect)
  if (!user || isAdmin === false) {
    return <LoadingScreen message="Redirigiendo..." />;
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Administración de Tienda</h1>
          <p className="text-muted-foreground mt-1">Gestiona los precios de los productos de la tienda</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => navigate("/admin")}
          >
            Dashboard
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate("/admin/building-prices")}
          >
            Precios de Edificios
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate("/admin/skins")}
          >
            Gestionar Skins
          </Button>
          <Button variant="outline" onClick={signOut}>
            Cerrar sesión
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleSetAllTo001} variant="outline" size="sm">
              <DollarSign className="h-4 w-4 mr-2" />
              Establecer todos a 0.001 TON
            </Button>
            <Button onClick={handleSaveAll} disabled={saving} size="sm">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar todos los cambios
                </>
              )}
            </Button>
          </div>

          {/* Products List */}
          <div className="border rounded-lg divide-y">
            {products.map((product) => (
              <div
                key={product.id}
                className={`p-4 flex items-center justify-between gap-4 ${
                  !product.is_active ? "opacity-50" : ""
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{product.name}</h3>
                    {!product.is_active && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded">Inactivo</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {product.product_key}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Precio actual: {product.price_ton} TON
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    value={editingPrices[product.id] ?? product.price_ton}
                    onChange={(e) => {
                      const newPrice = parseFloat(e.target.value) || 0;
                      handlePriceChange(product.id, newPrice);
                    }}
                    className="w-32"
                    placeholder="0.001"
                  />
                  <span className="text-sm text-muted-foreground">TON</span>
                  {editingPrices[product.id] !== product.price_ton && (
                    <span className="text-xs text-orange-500">*</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {products.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No se encontraron productos
            </div>
          )}
        </div>
      )}
    </div>
  );
};

