/**
 * Admin page to manage building skins with multi-language support
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addAllBuildingSkins, checkExistingSkins } from "@/scripts/addAllBuildingSkins";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, RefreshCw, Grid3x3, List, Edit, Save, X, Plus } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useNavigate } from "react-router-dom";
import { LoadingScreen } from "@/components/LoadingScreen";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

// Map all assets in /src/assets to URLs and normalize keys for robust lookup
const assetModules = import.meta.glob('/src/assets/**/*.{png,jpg,jpeg,webp,svg}', { eager: true, as: 'url' }) as Record<string, string>;
const assetMap: Record<string, string> = {};
for (const [key, url] of Object.entries(assetModules)) {
  assetMap[key] = url;
  // Add variants without leading slash
  if (key.startsWith('/')) assetMap[key.slice(1)] = url;
  // Add variant removing accidental spaces before extension
  const noSpace = key.replace(/\s+(?=\.[a-zA-Z]+$)/, '');
  assetMap[noSpace] = url;
  if (noSpace.startsWith('/')) assetMap[noSpace.slice(1)] = url;
}

const resolveAssetUrl = (p?: string | null) => {
  if (!p) return undefined;
  const candidate = p.trim();
  
  // If it's already a valid URL (http/https), return as is
  if (candidate.startsWith('http://') || candidate.startsWith('https://')) {
    return candidate;
  }
  
  // Extract filename from path (e.g., "/src/assets/buildings/coop/coop_1A.png" -> "coop_1A.png")
  const filename = candidate.split('/').pop() || candidate;
  const filenameNoSpaces = filename.replace(/\s+(?=\.[a-zA-Z]+$)/, '');
  
  // Try multiple variants
  const variants = [
    candidate,
    candidate.startsWith('/') ? candidate.slice(1) : `/${candidate}`,
    candidate.replace(/\s+(?=\.[a-zA-Z]+$)/, ''),
    (candidate.startsWith('/') ? candidate.slice(1) : candidate).replace(/\s+(?=\.[a-zA-Z]+$)/, ''),
    // Try with /src/assets prefix
    candidate.startsWith('/src/assets') ? candidate : `/src/assets/${candidate}`,
    candidate.startsWith('src/assets') ? `/${candidate}` : undefined,
    // Try finding by filename in all assets
    ...Object.keys(assetMap).filter(key => key.includes(filename) || key.includes(filenameNoSpaces)),
  ].filter(Boolean) as string[];
  
  for (const v of variants) {
    const found = assetMap[v];
    if (found) {
      console.log(`[resolveAssetUrl] Found image: ${candidate} -> ${v} -> ${found}`);
      return found;
    }
  }
  
  console.warn(`[resolveAssetUrl] Could not resolve image: ${candidate}`);
  return undefined;
};

interface SkinTranslation {
  language_code: string;
  name: string;
}

interface BuildingSkin {
  id: string;
  building_type: string;
  skin_key: string;
  name: string;
  image_url: string;
  is_default: boolean;
  rarity: string | null;
  created_at: string;
  updated_at: string;
  translations?: SkinTranslation[];
}

const SUPPORTED_LANGUAGES = [
  { code: 'es', name: 'Español' },
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
];

const RARITY_OPTIONS = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

const AdminSkins = () => {
  const { user, isAdmin, loading: authLoading } = useAdminAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [existingSkins, setExistingSkins] = useState<BuildingSkin[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [editingSkin, setEditingSkin] = useState<BuildingSkin | null>(null);
  const [editingTranslations, setEditingTranslations] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const placeholderUrl = resolveAssetUrl('/src/assets/placeholder.png') ?? '/placeholder.svg';

  // Redirect to login if not authenticated or not admin
  useEffect(() => {
    if (!authLoading && (!user || isAdmin === false)) {
      navigate("/admin/login");
    }
  }, [authLoading, user, isAdmin, navigate]);

  // Load skins on mount
  useEffect(() => {
    if (!authLoading && user && isAdmin === true) {
      handleCheckSkins();
    }
  }, [authLoading, user, isAdmin]);

  const handleCheckSkins = async () => {
    setChecking(true);
    try {
      const { data: skins, error } = await supabase
        .from("building_skins")
        .select("*")
        .order("building_type")
        .order("skin_key");

      if (error) throw error;

      // Load translations for each skin
      const skinsWithTranslations = await Promise.all(
        (skins || []).map(async (skin) => {
          const { data: translations } = await supabase
            .from("skin_translations")
            .select("language_code, name")
            .eq("skin_id", skin.id);

          return {
            ...skin,
            translations: translations || [],
          };
        })
      );

      setExistingSkins(skinsWithTranslations);
    } catch (error: any) {
      console.error("Error verificando skins:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las skins",
        variant: "destructive",
      });
    } finally {
      setChecking(false);
    }
  };

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

  const handleEditSkin = (skin: BuildingSkin) => {
    setEditingSkin(skin);
    // Initialize translations
    const translationsMap: Record<string, string> = {};
    SUPPORTED_LANGUAGES.forEach(lang => {
      const translation = skin.translations?.find(t => t.language_code === lang.code);
      translationsMap[lang.code] = translation?.name || '';
    });
    setEditingTranslations(translationsMap);
  };

  const handleSaveSkin = async () => {
    if (!editingSkin) return;

    setSaving(true);
    try {
      // Update skin
      const { error: skinError } = await supabase
        .from("building_skins")
        .update({
          name: editingSkin.name,
          image_url: editingSkin.image_url,
          rarity: editingSkin.rarity,
          is_default: editingSkin.is_default,
          building_type: editingSkin.building_type,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingSkin.id);

      if (skinError) throw skinError;

      // Update translations
      for (const [langCode, name] of Object.entries(editingTranslations)) {
        if (name.trim()) {
          const { error: translationError } = await supabase
            .from("skin_translations")
            .upsert({
              skin_id: editingSkin.id,
              language_code: langCode,
              name: name.trim(),
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'skin_id,language_code',
            });

          if (translationError) {
            console.error(`Error saving translation for ${langCode}:`, translationError);
          }
        }
      }

      toast({
        title: "¡Éxito!",
        description: "Skin actualizada correctamente",
      });

      setEditingSkin(null);
      await handleCheckSkins();
    } catch (error: any) {
      console.error("Error guardando skin:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar la skin",
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

  // Don't render if not authenticated or not admin
  if (!user || isAdmin === false) {
    return <LoadingScreen message="Redirigiendo..." />;
  }

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Editor de Skins</h1>
          <p className="text-muted-foreground mt-1">Gestiona las skins de los edificios con soporte multiidioma</p>
        </div>
      
        <div className="space-y-4 mb-6">
          <div className="flex gap-4 flex-wrap">
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
                  Cargando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Recargar skins
                </>
              )}
            </Button>
          </div>
        </div>

        {existingSkins.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                Skins en la base de datos ({existingSkins.length})
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Card>
              <CardContent className="p-4">
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {existingSkins.map((skin) => {
                      const resolved = resolveAssetUrl(skin.image_url);
                      const imageUrl = resolved ?? placeholderUrl;
                      
                      return (
                        <div
                          key={skin.id}
                          className="border rounded-lg p-3 bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                          onClick={() => handleEditSkin(skin)}
                        >
                          <div className="aspect-square mb-2 bg-background rounded overflow-hidden flex items-center justify-center relative group">
                            <img 
                              src={imageUrl}
                              alt={skin.name}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                console.error(`Failed to load image: ${skin.image_url} -> ${imageUrl}`);
                                e.currentTarget.src = placeholderUrl;
                              }}
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Edit className="h-6 w-6 text-white" />
                            </div>
                          </div>
                          <div className="font-mono text-xs text-muted-foreground">{skin.skin_key}</div>
                          <div className="font-medium text-sm mt-1">{skin.name}</div>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {skin.building_type}
                            </Badge>
                            {skin.rarity && (
                              <Badge variant="secondary" className="text-xs">
                                {skin.rarity}
                              </Badge>
                            )}
                            {skin.is_default && (
                              <Badge className="text-xs bg-green-500">
                                Default
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {existingSkins.map((skin) => {
                      const resolved = resolveAssetUrl(skin.image_url);
                      const imageUrl = resolved ?? placeholderUrl;
                      
                      return (
                        <div
                          key={skin.id}
                          className="border rounded-lg p-4 bg-muted/50 hover:bg-muted transition-colors flex items-center gap-4 cursor-pointer"
                          onClick={() => handleEditSkin(skin)}
                        >
                          <div className="w-20 h-20 bg-background rounded overflow-hidden flex items-center justify-center flex-shrink-0">
                            <img 
                              src={imageUrl}
                              alt={skin.name}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                console.error(`Failed to load image: ${skin.image_url} -> ${imageUrl}`);
                                e.currentTarget.src = placeholderUrl;
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-base">{skin.name}</div>
                            <div className="font-mono text-xs text-muted-foreground mt-1">{skin.skin_key}</div>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {skin.building_type}
                              </Badge>
                              {skin.rarity && (
                                <Badge variant="secondary" className="text-xs">
                                  {skin.rarity}
                                </Badge>
                              )}
                              {skin.is_default && (
                                <Badge className="text-xs bg-green-500">
                                  Default
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditSkin(skin);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editingSkin} onOpenChange={(open) => !open && setEditingSkin(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Skin</DialogTitle>
              <DialogDescription>
                Edita los detalles de la skin y sus traducciones
              </DialogDescription>
            </DialogHeader>
            
            {editingSkin && (
              <div className="space-y-4 py-4">
                {/* Preview Image */}
                <div className="flex justify-center">
                  <div className="w-32 h-32 bg-background rounded overflow-hidden flex items-center justify-center border-2">
                    <img 
                      src={resolveAssetUrl(editingSkin.image_url) ?? placeholderUrl}
                      alt={editingSkin.name}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.src = placeholderUrl;
                      }}
                    />
                  </div>
                </div>

                {/* Skin Key (read-only) */}
                <div className="space-y-2">
                  <Label>Skin Key</Label>
                  <Input value={editingSkin.skin_key} disabled className="font-mono" />
                </div>

                {/* Building Type */}
                <div className="space-y-2">
                  <Label>Tipo de Edificio</Label>
                  <Select
                    value={editingSkin.building_type}
                    onValueChange={(value) => setEditingSkin({ ...editingSkin, building_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="coop">Coop</SelectItem>
                      <SelectItem value="warehouse">Warehouse</SelectItem>
                      <SelectItem value="market">Market</SelectItem>
                      <SelectItem value="house">House</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Image URL */}
                <div className="space-y-2">
                  <Label>URL de Imagen</Label>
                  <Input
                    value={editingSkin.image_url}
                    onChange={(e) => setEditingSkin({ ...editingSkin, image_url: e.target.value })}
                    placeholder="/src/assets/buildings/coop_1A.png"
                  />
                  <p className="text-xs text-muted-foreground">
                    Ruta relativa desde /src/assets o URL completa
                  </p>
                </div>

                {/* Name (default language - Spanish) */}
                <div className="space-y-2">
                  <Label>Nombre (Español - por defecto)</Label>
                  <Input
                    value={editingSkin.name}
                    onChange={(e) => setEditingSkin({ ...editingSkin, name: e.target.value })}
                  />
                </div>

                {/* Translations */}
                <div className="space-y-3">
                  <Label>Traducciones</Label>
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <div key={lang.code} className="space-y-2">
                      <Label className="text-sm">{lang.name}</Label>
                      <Input
                        value={editingTranslations[lang.code] || ''}
                        onChange={(e) => setEditingTranslations({
                          ...editingTranslations,
                          [lang.code]: e.target.value,
                        })}
                        placeholder={`Nombre en ${lang.name}`}
                      />
                    </div>
                  ))}
                </div>

                {/* Rarity */}
                <div className="space-y-2">
                  <Label>Rareza</Label>
                  <Select
                    value={editingSkin.rarity || ''}
                    onValueChange={(value) => setEditingSkin({ ...editingSkin, rarity: value || null })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar rareza" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin rareza</SelectItem>
                      {RARITY_OPTIONS.map((rarity) => (
                        <SelectItem key={rarity} value={rarity}>
                          {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Is Default */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_default"
                    checked={editingSkin.is_default}
                    onCheckedChange={(checked) => setEditingSkin({ ...editingSkin, is_default: !!checked })}
                  />
                  <Label htmlFor="is_default" className="cursor-pointer">
                    Skin por defecto para este nivel
                  </Label>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingSkin(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveSkin} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminSkins;
