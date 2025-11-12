import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export const AdminMigrations = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const runStoreProductsMigration = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('run-migration');

      if (error) throw error;

      toast({
        title: "✅ Migración exitosa",
        description: "Los productos de la tienda han sido actualizados correctamente",
      });
    } catch (error: any) {
      console.error("Error ejecutando migración:", error);
      toast({
        title: "❌ Error",
        description: error.message || "No se pudo ejecutar la migración",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Administración de Migraciones</h1>
      
      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">Productos de la Tienda</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Actualiza los productos de la tienda con nombres, descripciones, precios e imágenes correctos.
            También actualiza las claves de skins del basic_skins_pack.
          </p>
          <Button 
            onClick={runStoreProductsMigration}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ejecutando...
              </>
            ) : (
              "Ejecutar Migración de Productos"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

