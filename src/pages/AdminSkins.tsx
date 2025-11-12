/**
 * Admin page to add all building skins to the database
 * This page can be accessed to run the migration script
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { addAllBuildingSkins, checkExistingSkins } from "@/scripts/addAllBuildingSkins";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, RefreshCw, LogOut } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useNavigate } from "react-router-dom";
import { LoadingScreen } from "@/components/LoadingScreen";

const AdminSkins = () => {
  const { user, isAdmin, loading: authLoading, signOut } = useAdminAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [existingSkins, setExistingSkins] = useState<any[] | null>(null);
  const { toast } = useToast();

  // Show loading while checking auth
  if (authLoading) {
    return <LoadingScreen message="Verificando permisos..." />;
  }

  // Redirect to login if not authenticated or not admin
  if (!user || isAdmin === false) {
    navigate("/admin/login");
    return null;
  }

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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Administración de Skins</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user.email}</span>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </div>
      
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {existingSkins.map((skin) => {
                // Resolve the image URL from /src/assets to actual URL
                const imageUrl = skin.image_url.startsWith('/src/assets/') 
                  ? skin.image_url.replace('/src/assets/', '/src/assets/')
                  : skin.image_url;
                
                return (
                  <div
                    key={skin.skin_key}
                    className="border rounded-lg p-3 bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="aspect-square mb-2 bg-background rounded overflow-hidden flex items-center justify-center">
                      <img 
                        src={imageUrl}
                        alt={skin.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          console.error(`Failed to load image: ${imageUrl}`);
                          e.currentTarget.src = '/src/assets/placeholder.png';
                        }}
                      />
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">{skin.skin_key}</div>
                    <div className="font-medium text-sm mt-1">{skin.name}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                        {skin.building_type}
                      </span>
                      {skin.rarity && (
                        <span className="text-xs px-2 py-0.5 rounded bg-secondary/10 text-secondary-foreground">
                          {skin.rarity}
                        </span>
                      )}
                      {skin.is_default && (
                        <span className="text-xs px-2 py-0.5 rounded bg-green-500/10 text-green-600">
                          Default
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSkins;

