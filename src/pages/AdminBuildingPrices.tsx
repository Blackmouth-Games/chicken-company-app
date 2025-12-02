import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Building2, LogOut, Plus, Trash2 } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useNavigate } from "react-router-dom";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface BuildingPrice {
  id: string;
  building_type: string;
  level: number;
  price_ton: number;
  capacity: number;
  created_at: string;
  updated_at: string;
}

const BUILDING_TYPES = ['coop', 'warehouse', 'market'] as const;
const MAX_LEVEL = 5;

export const AdminBuildingPrices = () => {
  const { user, isAdmin, loading: authLoading, signOut } = useAdminAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [prices, setPrices] = useState<BuildingPrice[]>([]);
  const [editingPrices, setEditingPrices] = useState<Record<string, { price_ton: number; capacity: number }>>({});
  const [saving, setSaving] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newPrice, setNewPrice] = useState({
    building_type: 'coop' as typeof BUILDING_TYPES[number],
    level: 1,
    price_ton: 0,
    capacity: 0,
  });
  const { toast } = useToast();

  // Load prices when user is authenticated and is admin
  useEffect(() => {
    if (!authLoading && user && isAdmin === true) {
      loadPrices();
    }
  }, [authLoading, user, isAdmin]);

  // Redirect to login if not authenticated or not admin
  useEffect(() => {
    if (!authLoading && (!user || isAdmin === false)) {
      navigate("/admin/login");
    }
  }, [authLoading, user, isAdmin, navigate]);

  const loadPrices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("building_prices")
        .select("*")
        .order("building_type")
        .order("level");

      if (error) throw error;

      setPrices(data || []);
      // Initialize editing prices with current prices
      const initialPrices: Record<string, { price_ton: number; capacity: number }> = {};
      (data || []).forEach((price) => {
        initialPrices[price.id] = {
          price_ton: price.price_ton,
          capacity: price.capacity,
        };
      });
      setEditingPrices(initialPrices);
    } catch (error: any) {
      console.error("Error loading prices:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los precios",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (priceId: string, field: 'price_ton' | 'capacity', value: number) => {
    setEditingPrices((prev) => ({
      ...prev,
      [priceId]: {
        ...prev[priceId],
        [field]: value,
      },
    }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(editingPrices).map(([priceId, values]) => ({
        id: priceId,
        price_ton: values.price_ton,
        capacity: values.capacity,
        updated_at: new Date().toISOString(),
      }));

      let successCount = 0;
      let errorCount = 0;

      for (const update of updates) {
        const originalPrice = prices.find(p => p.id === update.id);
        if (!originalPrice) continue;

        // Only update if values changed
        if (
          originalPrice.price_ton !== update.price_ton ||
          originalPrice.capacity !== update.capacity
        ) {
          const { error } = await supabase
            .from("building_prices")
            .update({
              price_ton: update.price_ton,
              capacity: update.capacity,
              updated_at: update.updated_at,
            })
            .eq("id", update.id);

          if (error) {
            console.error(`Error updating price ${update.id}:`, error);
            errorCount++;
          } else {
            successCount++;
          }
        }
      }

      if (errorCount === 0) {
        toast({
          title: "¡Éxito!",
          description: successCount > 0 
            ? `Se actualizaron ${successCount} precios correctamente`
            : "No había cambios que guardar",
        });
        await loadPrices();
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

  const handleAddPrice = async () => {
    try {
      // Check if price already exists
      const exists = prices.some(
        p => p.building_type === newPrice.building_type && p.level === newPrice.level
      );

      if (exists) {
        toast({
          title: "Error",
          description: "Ya existe un precio para este tipo de edificio y nivel",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("building_prices")
        .insert({
          building_type: newPrice.building_type,
          level: newPrice.level,
          price_ton: newPrice.price_ton,
          capacity: newPrice.capacity,
        });

      if (error) throw error;

      toast({
        title: "¡Éxito!",
        description: "Precio agregado correctamente",
      });

      setShowAddDialog(false);
      setNewPrice({
        building_type: 'coop',
        level: 1,
        price_ton: 0,
        capacity: 0,
      });
      await loadPrices();
    } catch (error: any) {
      console.error("Error adding price:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo agregar el precio",
        variant: "destructive",
      });
    }
  };

  const handleDeletePrice = async (priceId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este precio?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("building_prices")
        .delete()
        .eq("id", priceId);

      if (error) throw error;

      toast({
        title: "¡Éxito!",
        description: "Precio eliminado correctamente",
      });

      await loadPrices();
    } catch (error: any) {
      console.error("Error deleting price:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el precio",
        variant: "destructive",
      });
    }
  };

  // Group prices by building type
  const pricesByType = BUILDING_TYPES.reduce((acc, type) => {
    acc[type] = prices.filter(p => p.building_type === type);
    return acc;
  }, {} as Record<string, BuildingPrice[]>);

  // Show loading while checking auth
  if (authLoading) {
    return <LoadingScreen message="Verificando permisos..." />;
  }

  // Don't render if not authenticated or not admin (redirect will happen in useEffect)
  if (!user || isAdmin === false) {
    return <LoadingScreen message="Redirigiendo..." />;
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Precios de Edificios</h1>
          <p className="text-muted-foreground mt-1">Gestiona los precios y capacidades de los edificios</p>
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
            onClick={() => navigate("/admin/store")}
          >
            Gestionar Tienda
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate("/admin/skins")}
          >
            Gestionar Skins
          </Button>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar sesión
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Actions */}
          <div className="flex gap-2 flex-wrap items-center justify-between">
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Precio
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Agregar Nuevo Precio</DialogTitle>
                  <DialogDescription>
                    Crea un nuevo precio para un tipo de edificio y nivel
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Tipo de Edificio</Label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={newPrice.building_type}
                      onChange={(e) => setNewPrice({ ...newPrice, building_type: e.target.value as typeof BUILDING_TYPES[number] })}
                    >
                      {BUILDING_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Nivel</Label>
                    <Input
                      type="number"
                      min="1"
                      max={MAX_LEVEL}
                      value={newPrice.level}
                      onChange={(e) => setNewPrice({ ...newPrice, level: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Precio (TON)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      value={newPrice.price_ton}
                      onChange={(e) => setNewPrice({ ...newPrice, price_ton: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Capacidad</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newPrice.capacity}
                      onChange={(e) => setNewPrice({ ...newPrice, capacity: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddPrice}>
                    Agregar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

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

          {/* Prices by Building Type */}
          {BUILDING_TYPES.map((buildingType) => {
            const typePrices = pricesByType[buildingType] || [];
            const typeName = buildingType === 'coop' ? 'Coop' : buildingType === 'warehouse' ? 'Almacén' : 'Mercado';

            return (
              <Card key={buildingType}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {typeName}
                  </CardTitle>
                  <CardDescription>
                    {typePrices.length} precios configurados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {typePrices.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No hay precios configurados para este tipo de edificio
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {typePrices
                        .sort((a, b) => a.level - b.level)
                        .map((price) => {
                          const isEdited = editingPrices[price.id] && (
                            editingPrices[price.id].price_ton !== price.price_ton ||
                            editingPrices[price.id].capacity !== price.capacity
                          );

                          return (
                            <div
                              key={price.id}
                              className={`p-4 border rounded-lg flex items-center justify-between gap-4 ${
                                isEdited ? "bg-yellow-50 border-yellow-200" : ""
                              }`}
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-semibold">Nivel {price.level}</span>
                                  {isEdited && (
                                    <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded">
                                      Modificado
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Precio actual: {price.price_ton} TON | Capacidad: {price.capacity}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <Label className="text-xs">Precio (TON)</Label>
                                  <Input
                                    type="number"
                                    step="0.001"
                                    min="0"
                                    value={editingPrices[price.id]?.price_ton ?? price.price_ton}
                                    onChange={(e) => {
                                      const newPrice = parseFloat(e.target.value) || 0;
                                      handlePriceChange(price.id, 'price_ton', newPrice);
                                    }}
                                    className="w-32"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <Label className="text-xs">Capacidad</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={editingPrices[price.id]?.capacity ?? price.capacity}
                                    onChange={(e) => {
                                      const newCapacity = parseInt(e.target.value) || 0;
                                      handlePriceChange(price.id, 'capacity', newCapacity);
                                    }}
                                    className="w-32"
                                  />
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeletePrice(price.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {prices.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No se encontraron precios. Agrega uno nuevo para comenzar.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

