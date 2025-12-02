import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, DollarSign, Edit, X, Plus, Package } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useNavigate } from "react-router-dom";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

interface StoreProduct {
  id: string;
  product_key: string;
  name: string;
  description: string | null;
  price_ton: number;
  content_items: string[] | null;
  is_active: boolean;
  sort_order: number;
}

export const AdminStore = () => {
  const { user, isAdmin, loading: authLoading, signOut } = useAdminAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [editingPrices, setEditingPrices] = useState<Record<string, number>>({});
  const [editingProducts, setEditingProducts] = useState<Record<string, Partial<StoreProduct>>>({});
  const [saving, setSaving] = useState(false);
  const [editingProduct, setEditingProduct] = useState<StoreProduct | null>(null);
  const [allSkins, setAllSkins] = useState<Array<{ skin_key: string; name: string; building_type: string }>>([]);
  const { toast } = useToast();

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
        .select("id, product_key, name, description, price_ton, content_items, is_active, sort_order")
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

  const loadAllSkins = async () => {
    try {
      const { data, error } = await supabase
        .from("building_skins")
        .select("skin_key, name, building_type")
        .order("building_type")
        .order("skin_key");

      if (error) throw error;
      setAllSkins(data || []);
    } catch (error: any) {
      console.error("Error loading skins:", error);
    }
  };

  useEffect(() => {
    if (!authLoading && user && isAdmin === true) {
      loadProducts();
      loadAllSkins();
    }
  }, [authLoading, user, isAdmin]);

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

  const openEditDialog = (product: StoreProduct) => {
    setEditingProduct(product);
    setEditingProducts({
      [product.id]: {
        content_items: product.content_items ? [...product.content_items] : [],
        description: product.description || "",
      }
    });
  };

  const closeEditDialog = () => {
    setEditingProduct(null);
    setEditingProducts({});
  };

  const getChickensFromContentItems = (contentItems: string[] | null): number => {
    if (!contentItems) return 0;
    const chickensItem = contentItems.find(item => item.startsWith("chickens:"));
    if (chickensItem) {
      const amount = parseInt(chickensItem.split(":")[1]);
      return isNaN(amount) ? 0 : amount;
    }
    return 0;
  };

  const getSkinsFromContentItems = (contentItems: string[] | null): string[] => {
    if (!contentItems) return [];
    return contentItems.filter(item => !item.startsWith("chickens:"));
  };

  const updateProductContentItems = (productId: string, skins: string[], chickens: number) => {
    const items: string[] = [...skins];
    if (chickens > 0) {
      items.push(`chickens:${chickens}`);
    }
    setEditingProducts(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        content_items: items,
      }
    }));
  };

  const handleSaveProduct = async (product: StoreProduct) => {
    if (!editingProducts[product.id]) return;

    const editedProduct = editingProducts[product.id];
    setSaving(true);
    try {
      const { error } = await supabase
        .from("store_products")
        .update({
          content_items: editedProduct.content_items || [],
          description: editedProduct.description || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", product.id);

      if (error) throw error;

      toast({
        title: "¡Éxito!",
        description: `Producto ${product.name} actualizado correctamente`,
      });

      await loadProducts();
      closeEditDialog();
    } catch (error: any) {
      console.error("Error saving product:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar el producto",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
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
          <Button 
            variant="outline" 
            onClick={() => navigate("/admin/users")}
          >
            Usuarios
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
            {products.map((product) => {
              const currentSkins = getSkinsFromContentItems(product.content_items);
              const currentChickens = getChickensFromContentItems(product.content_items);
              
              return (
                <div
                  key={product.id}
                  className={`p-4 ${!product.is_active ? "opacity-50" : ""}`}
                >
                  <div className="flex items-start justify-between gap-4">
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
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-muted-foreground">
                          Precio: {product.price_ton} TON
                        </p>
                        {currentSkins.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            <span className="text-xs text-muted-foreground">Skins:</span>
                            {currentSkins.slice(0, 3).map((skin) => (
                              <Badge key={skin} variant="secondary" className="text-xs">
                                {skin}
                              </Badge>
                            ))}
                            {currentSkins.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{currentSkins.length - 3} más
                              </Badge>
                            )}
                          </div>
                        )}
                        {currentChickens > 0 && (
                          <p className="text-xs text-green-600 font-medium">
                            🐔 {currentChickens} gallinas
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(product)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {products.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No se encontraron productos
            </div>
          )}
        </div>
      )}

      {/* Edit Product Dialog */}
      {editingProduct && (
        <Dialog open={!!editingProduct} onOpenChange={(open) => !open && closeEditDialog()}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Producto: {editingProduct.name}</DialogTitle>
              <DialogDescription>
                Gestiona las skins y gallinas que se otorgan con este producto
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Input
                  id="description"
                  value={editingProducts[editingProduct.id]?.description || editingProduct.description || ""}
                  onChange={(e) => {
                    setEditingProducts(prev => ({
                      ...prev,
                      [editingProduct.id]: {
                        ...prev[editingProduct.id],
                        description: e.target.value,
                      }
                    }));
                  }}
                  placeholder="Descripción del producto"
                />
              </div>

              {/* Chickens */}
              <div className="space-y-2">
                <Label htmlFor="chickens">Cantidad de Gallinas</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="chickens"
                    type="number"
                    min="0"
                    value={getChickensFromContentItems(editingProducts[editingProduct.id]?.content_items || editingProduct.content_items)}
                    onChange={(e) => {
                      const chickens = parseInt(e.target.value) || 0;
                      const currentSkins = getSkinsFromContentItems(editingProducts[editingProduct.id]?.content_items || editingProduct.content_items);
                      updateProductContentItems(editingProduct.id, currentSkins, chickens);
                    }}
                    placeholder="0"
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">gallinas</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Establece 0 si no quieres dar gallinas con este producto
                </p>
              </div>

              {/* Skins */}
              <div className="space-y-2">
                <Label>Skins Incluidas</Label>
                <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                  {getSkinsFromContentItems(editingProducts[editingProduct.id]?.content_items || editingProduct.content_items).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No hay skins agregadas
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {getSkinsFromContentItems(editingProducts[editingProduct.id]?.content_items || editingProduct.content_items).map((skinKey) => (
                        <Badge
                          key={skinKey}
                          variant="secondary"
                          className="flex items-center gap-1 pr-1"
                        >
                          {skinKey}
                          <button
                            onClick={() => {
                              const currentSkins = getSkinsFromContentItems(editingProducts[editingProduct.id]?.content_items || editingProduct.content_items);
                              const newSkins = currentSkins.filter(s => s !== skinKey);
                              const chickens = getChickensFromContentItems(editingProducts[editingProduct.id]?.content_items || editingProduct.content_items);
                              updateProductContentItems(editingProduct.id, newSkins, chickens);
                            }}
                            className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Skin */}
                <div className="space-y-2">
                  <Label>Agregar Skin</Label>
                  <div className="flex gap-2">
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      onChange={(e) => {
                        const selectedSkin = e.target.value;
                        if (selectedSkin) {
                          const currentSkins = getSkinsFromContentItems(editingProducts[editingProduct.id]?.content_items || editingProduct.content_items);
                          if (!currentSkins.includes(selectedSkin)) {
                            const chickens = getChickensFromContentItems(editingProducts[editingProduct.id]?.content_items || editingProduct.content_items);
                            updateProductContentItems(editingProduct.id, [...currentSkins, selectedSkin], chickens);
                          }
                          e.target.value = "";
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="">Selecciona una skin...</option>
                      {allSkins.map((skin) => (
                        <option key={skin.skin_key} value={skin.skin_key}>
                          {skin.name} ({skin.skin_key}) - {skin.building_type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closeEditDialog}>
                Cancelar
              </Button>
              <Button
                onClick={() => handleSaveProduct(editingProduct)}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Cambios
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

