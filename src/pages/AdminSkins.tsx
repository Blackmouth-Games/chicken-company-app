/**
 * Admin page to add all building skins to the database
 * This page can be accessed to run the migration script
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { addAllBuildingSkins, checkExistingSkins } from "@/scripts/addAllBuildingSkins";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, RefreshCw } from "lucide-react";

const AdminSkins = () => {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [existingSkins, setExistingSkins] = useState<any[] | null>(null);
  const { toast } = useToast();

  const handleAddSkins = async () => {
    setLoading(true);
    try {
      const result = await addAllBuildingSkins();
      
      if (result.success) {
        toast({
          title: "¡Éxito!",
          description: `Se insertaron ${result.successCount} skins correctamente`,
        });
      } else {
        toast({
          title: "Completado con errores",
          description: `${result.successCount} exitosas, ${result.errorCount} errores`,
          variant: "destructive",
        });
      }
      
      // Refresh existing skins list
      await handleCheckSkins();
    } catch (error: any) {
      console.error("Error ejecutando script:", error);
      toast({
        title: "Error",
        description: error.message || "Error al ejecutar el script",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckSkins = async () => {
    setChecking(true);
    try {
      const skins = await checkExistingSkins();
      setExistingSkins(skins);
      
      if (skins) {
        toast({
          title: "Skins encontradas",
          description: `Total: ${skins.length} skins en la base de datos`,
        });
      }
    } catch (error: any) {
      console.error("Error verificando skins:", error);
      toast({
        title: "Error",
        description: "No se pudieron verificar las skins",
        variant: "destructive",
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Administración de Skins</h1>
      
      <div className="space-y-4 mb-6">
        <div className="flex gap-4">
          <Button
            onClick={handleAddSkins}
            disabled={loading || checking}
            className="flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Insertando skins...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Agregar todas las skins
              </>
            )}
          </Button>
          
          <Button
            onClick={handleCheckSkins}
            disabled={loading || checking}
            variant="outline"
            className="flex items-center gap-2"
          >
            {checking ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Verificar skins existentes
              </>
            )}
          </Button>
        </div>
      </div>

      {existingSkins && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-4">
            Skins en la base de datos ({existingSkins.length})
          </h2>
          <div className="bg-card border rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {existingSkins.map((skin) => (
                <div
                  key={skin.skin_key}
                  className="text-sm p-2 bg-muted rounded"
                >
                  <div className="font-mono text-xs">{skin.skin_key}</div>
                  <div className="text-muted-foreground">{skin.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSkins;

