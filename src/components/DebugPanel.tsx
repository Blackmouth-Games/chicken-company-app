import { useState, useEffect, useMemo } from "react";
import { Bug, X, Copy, Check, Layout, Plus, RotateCcw, Palette, AlertCircle, Snowflake, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getTelegramUser, isTelegramWebApp } from "@/lib/telegram";
import { useTonWallet, useTonAddress } from "@tonconnect/ui-react";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useUserBuildings } from "@/hooks/useUserBuildings";
import { useUserItems } from "@/hooks/useUserItems";
import { checkWinterSkin } from "@/scripts/checkWinterSkin";
import { getVersion, getVersionString } from "@/lib/version";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DebugPanel = () => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const telegramUser = getTelegramUser();
  const wallet = useTonWallet();
  const address = useTonAddress();
  const isFromTelegram = isTelegramWebApp();

  // Layout tab state
  const [isEditMode, setIsEditMode] = useState(false);
  const [layoutText, setLayoutText] = useState<string>("");
  const [beltCount, setBeltCount] = useState<number>(0);
  const [gap, setGap] = useState<string>("20px");
  const [beltDebugInfo, setBeltDebugInfo] = useState<any>(null);
  const [paintModeClickInfo, setPaintModeClickInfo] = useState<any>(null);
  const [eggDebugInfo, setEggDebugInfo] = useState<any>(null);
  const [vehicleDebugInfo, setVehicleDebugInfo] = useState<any>(null);
  const [vehicleLogs, setVehicleLogs] = useState<Array<{ timestamp: string; level: string; message: string; data?: any }>>([]);
  const [eggDebugMode, setEggDebugMode] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  
  // Skins tab state
  const [userId, setUserId] = useState<string | null>(null);
  const [skinsLogs, setSkinsLogs] = useState<Array<{ timestamp: string; level: string; message: string; error?: any }>>([]);
  const [winterSkinCheck, setWinterSkinCheck] = useState<any>(null);
  const [checkingWinterSkin, setCheckingWinterSkin] = useState(false);
  const [allSkinsFromDB, setAllSkinsFromDB] = useState<any[]>([]);
  const [defaultSkins, setDefaultSkins] = useState<any[]>([]);
  const [loadingSkins, setLoadingSkins] = useState(false);
  
  // Buildings debug state
  const { buildings, getBuildingByType, refetch: refetchBuildings } = useUserBuildings(userId || undefined);
  const [buildingsDebugInfo, setBuildingsDebugInfo] = useState<any>(null);
  
  // Function to add logs (defined before use)
  const addSkinLog = (level: string, message: string, error?: any) => {
    setSkinsLogs(prev => [...prev.slice(-49), {
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      error: error ? (error.message || JSON.stringify(error)) : undefined
    }]);
  };
  
  // Load all skins from database and default skins
  const loadAllSkinsData = async (profileId: string) => {
    setLoadingSkins(true);
    try {
      // Get all skins from building_skins table
      const { data: allSkins, error: skinsError } = await supabase
        .from("building_skins")
        .select("*")
        .order("building_type")
        .order("skin_key");

      if (skinsError) {
        console.error("Error loading skins:", skinsError);
        addSkinLog("error", "Error loading skins from database", skinsError);
      } else {
        setAllSkinsFromDB(allSkins || []);
        // Get default skins (is_default = true)
        const defaults = (allSkins || []).filter(s => s.is_default);
        setDefaultSkins(defaults);
        addSkinLog("info", `Loaded ${allSkins?.length || 0} skins from database, ${defaults.length} are default`);
      }

      // Verify user items are correctly loaded
      const { data: userItemsData, error: itemsError } = await supabase
        .from("user_items")
        .select("*")
        .eq("user_id", profileId)
        .eq("item_type", "skin");

      if (itemsError) {
        console.error("Error loading user items:", itemsError);
        addSkinLog("error", "Error loading user items", itemsError);
      } else {
        addSkinLog("info", `User has ${userItemsData?.length || 0} skins in inventory`);
      }
    } catch (error: any) {
      console.error("Error in loadAllSkinsData:", error);
      addSkinLog("error", "Error loading skins data", error);
    } finally {
      setLoadingSkins(false);
    }
  };

  // Update buildings debug info when buildings change
  useEffect(() => {
    if (userId && buildings) {
      const warehouse = getBuildingByType('warehouse');
      const market = getBuildingByType('market');
      
      setBuildingsDebugInfo({
        userId,
        totalBuildings: buildings.length,
        buildings: buildings.map(b => ({
          id: b.id,
          type: b.building_type,
          level: b.level,
          capacity: b.capacity,
          position_index: b.position_index,
          selected_skin: b.selected_skin,
        })),
        warehouse: warehouse ? {
          id: warehouse.id,
          level: warehouse.level,
          capacity: warehouse.capacity,
          selected_skin: warehouse.selected_skin,
          exists: true,
        } : {
          exists: false,
          error: 'Warehouse no encontrado en la base de datos',
        },
        market: market ? {
          id: market.id,
          level: market.level,
          capacity: market.capacity,
          selected_skin: market.selected_skin,
          exists: true,
        } : {
          exists: false,
          error: 'Market no encontrado en la base de datos',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }, [userId, buildings, getBuildingByType]);

  // Get user profile ID
  useEffect(() => {
    const loadUserId = async () => {
      if (!telegramUser?.id) return;
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("telegram_id", telegramUser.id)
          .maybeSingle();
        if (profile) {
          setUserId(profile.id);
          // Load all skins data when user is loaded
          loadAllSkinsData(profile.id);
        }
      } catch (error) {
        addSkinLog('error', 'Error loading user ID', error);
      }
    };
    loadUserId();
  }, [telegramUser?.id]);
  
  const { items: userItems } = useUserItems(userId || undefined);
  
  // Listen for skin selector errors
  useEffect(() => {
    const handleError = (e: any) => {
      const level = e.detail?.level || 'error';
      addSkinLog(level, e.detail?.message || 'Unknown error', e.detail?.error);
    };
    window.addEventListener('skinSelectorError', handleError as any);
    return () => {
      window.removeEventListener('skinSelectorError', handleError as any);
    };
  }, []);

  // Auto-run verification when eggDebugInfo is available
  useEffect(() => {
    if (eggDebugInfo) {
      const verify = (window as any).verifyEggSystem;
      if (verify) {
        // Run verification automatically
        const result = verify();
        setVerificationResult(result);
        console.log('[DebugPanel] Auto-verification executed:', result);
      }
    }
  }, [eggDebugInfo]);

  // Listen to layout changes
  useEffect(() => {
    const refreshLayout = () => {
      const saved = localStorage.getItem('debugLayoutConfig');
      if (saved) {
        setLayoutText(saved);
        try {
          const cfg = JSON.parse(saved);
          setGap(cfg?.grid?.gap ?? '20px');
          setBeltCount(Array.isArray(cfg?.belts) ? cfg.belts.length : 0);
        } catch {}
      }
    };
    refreshLayout();
    const onLayoutUpdate = () => refreshLayout();
    const onEditChange = (e: any) => setIsEditMode(!!e.detail);
    const onBeltDebugInfo = (e: any) => setBeltDebugInfo(e.detail);
    const onPaintModeClick = (e: any) => setPaintModeClickInfo(e.detail);
    const onEggDebugInfo = (e: any) => setEggDebugInfo(e.detail);
    const onVehicleDebugInfo = (e: any) => setVehicleDebugInfo(e.detail);
    window.addEventListener('layoutConfigUpdate', onLayoutUpdate as any);
    window.addEventListener('layoutEditModeChange', onEditChange as any);
    window.addEventListener('beltDebugInfo', onBeltDebugInfo as any);
    window.addEventListener('paintModeClick', onPaintModeClick as any);
    window.addEventListener('eggDebugInfo', onEggDebugInfo as any);
    window.addEventListener('vehicleDebugInfo', onVehicleDebugInfo as any);
    return () => {
      window.removeEventListener('layoutConfigUpdate', onLayoutUpdate as any);
      window.removeEventListener('layoutEditModeChange', onEditChange as any);
      window.removeEventListener('beltDebugInfo', onBeltDebugInfo as any);
      window.removeEventListener('paintModeClick', onPaintModeClick as any);
      window.removeEventListener('eggDebugInfo', onEggDebugInfo as any);
      window.removeEventListener('vehicleDebugInfo', onVehicleDebugInfo as any);
    };
  }, []);

  const debugInfo = {
    timestamp: new Date().toISOString(),
    telegram: {
      isFromTelegram,
      user: telegramUser,
      webAppData: typeof window !== 'undefined' && window.Telegram?.WebApp?.initData,
    },
    wallet: {
      isConnected: !!wallet,
      address: address || null,
      walletInfo: wallet ? {
        device: wallet.device,
        provider: wallet.device.appName,
      } : null,
    },
    auth: {
      status: wallet ? 'authenticated' : 'guest',
      type: wallet ? 'wallet' : isFromTelegram ? 'telegram-guest' : 'web-guest',
    },
    environment: {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
    },
  };

  const copyDebugInfo = () => {
    const info = JSON.stringify(debugInfo, null, 2);
    navigator.clipboard.writeText(info).then(() => {
      setCopied(true);
      toast({
        title: "Debug info copied",
        description: "Debug information has been copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Layout actions
  const toggleEdit = () => {
    const next = !isEditMode;
    setIsEditMode(next);
    window.dispatchEvent(new CustomEvent('layoutEditModeChange', { detail: next }));
  };

  const toggleEggDebugMode = () => {
    const next = !eggDebugMode;
    setEggDebugMode(next);
    window.dispatchEvent(new CustomEvent('eggDebugModeChange', { detail: { enabled: next } }));
    toast({
      title: next ? "Modo Debug Egg activo" : "Modo Debug Egg desactivado",
      description: next
        ? "Los coops mostrarán vínculo con cintas y cuenta regresiva."
        : "Se ocultaron las superposiciones de debug.",
    });
  };

  const addBelt = () => {
    window.dispatchEvent(new CustomEvent('addBelt'));
  };

  const resetLayout = () => {
    const defaultConfig = {
      warehouse: { gridColumn: '1 / 7', gridRow: '1 / 4' },
      market: { gridColumn: '20 / 26', gridRow: '1 / 4' },
      house: { gridColumn: '11 / 16', gridRow: '1 / 3' },
      boxes: { gridColumn: '6 / 8', gridRow: '3 / 5' },
      leftCorrals: { gridColumn: '1 / 7', gap: '20px', startRow: 4 },
      rightCorrals: { gridColumn: '20 / 26', gap: '20px', startRow: 4 },
      belts: [{ id: 'belt-1', gridColumn: '13 / 14', gridRow: '10 / 11', direction: 'east', type: 'straight' }],
      grid: { gap: '20px', maxWidth: '1600px' },
    };
    localStorage.setItem('debugLayoutConfig', JSON.stringify(defaultConfig));
    window.dispatchEvent(new CustomEvent('layoutConfigUpdate', { detail: defaultConfig }));
    toast({
      title: t('layoutEditor.layoutRestored'),
      description: t('layoutEditor.layoutRestoredDesc'),
    });
  };

  const exportLayout = () => {
    if (layoutText) {
      navigator.clipboard.writeText(layoutText)
        .then(() => {
          toast({
            title: t('layoutEditor.layoutCopied'),
            description: t('layoutEditor.layoutCopiedDesc'),
          });
        })
        .catch(() => {
          toast({
            title: t('common.error'),
            description: t('layoutEditor.copyError'),
            variant: 'destructive',
          });
        });
    }
  };

  const onGapChange = (val: string) => {
    setGap(val);
    const saved = localStorage.getItem('debugLayoutConfig');
    if (saved) {
      try {
        const cfg = JSON.parse(saved);
        cfg.grid = cfg.grid || {};
        cfg.grid.gap = val;
        localStorage.setItem('debugLayoutConfig', JSON.stringify(cfg));
        window.dispatchEvent(new CustomEvent('layoutConfigUpdate', { detail: cfg }));
      } catch {}
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        size="icon"
        variant="outline"
        className="fixed bottom-20 right-4 z-40 rounded-full shadow-lg"
        title="Open Debug Panel"
      >
        <Bug className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[85vh] overflow-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-bold">🐛 Debug Panel</CardTitle>
          <div className="flex gap-2">
            <Button
              onClick={copyDebugInfo}
              size="icon"
              variant="ghost"
              title="Copy debug info"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button
              onClick={() => setIsOpen(false)}
              size="icon"
              variant="ghost"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="general" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="layout">
                <Layout className="h-4 w-4 mr-2" />
                Layout
              </TabsTrigger>
              <TabsTrigger value="skins">
                <Palette className="h-4 w-4 mr-2" />
                Skins
              </TabsTrigger>
              <TabsTrigger value="ui">
                🎨 UI Colors
              </TabsTrigger>
              <TabsTrigger value="systems">
                ⚙️ Systems
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              {/* Auth Status */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">🔐 Authentication Status</h3>
                <div className="bg-muted p-3 rounded-md space-y-1 text-sm">
                  <p><strong>Status:</strong> <span className={wallet ? 'text-green-600' : 'text-yellow-600'}>{debugInfo.auth.status}</span></p>
                  <p><strong>Type:</strong> {debugInfo.auth.type}</p>
                </div>
              </div>

              {/* Telegram Info */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">📱 Telegram Info</h3>
                <div className="bg-muted p-3 rounded-md space-y-1 text-sm">
                  <p><strong>Is Telegram:</strong> {isFromTelegram ? '✅ Yes' : '❌ No'}</p>
                  {telegramUser && (
                    <>
                      <p><strong>User ID:</strong> {telegramUser.id}</p>
                      <p><strong>Name:</strong> {telegramUser.first_name} {telegramUser.last_name || ''}</p>
                      <p><strong>Username:</strong> @{telegramUser.username || 'N/A'}</p>
                    </>
                  )}
                </div>
              </div>

              {/* Wallet Info */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">💰 Wallet Info</h3>
                <div className="bg-muted p-3 rounded-md space-y-1 text-sm">
                  <p><strong>Connected:</strong> {wallet ? '✅ Yes' : '❌ No'}</p>
                  {wallet && (
                    <>
                      <p><strong>Provider:</strong> {debugInfo.wallet.walletInfo?.provider}</p>
                      <p><strong>Address:</strong> <span className="break-all">{address}</span></p>
                    </>
                  )}
                </div>
              </div>

              {/* Environment */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">🌍 Environment</h3>
                <div className="bg-muted p-3 rounded-md space-y-1 text-sm">
                  <p><strong>Language:</strong> {debugInfo.environment.language}</p>
                  <p><strong>Platform:</strong> {debugInfo.environment.platform}</p>
                  <p className="break-all"><strong>User Agent:</strong> {debugInfo.environment.userAgent}</p>
                </div>
              </div>

              {/* Buildings Debug */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">🏗️ Edificios (Warehouse & Market)</h3>
                  <Button
                    onClick={() => refetchBuildings()}
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                  >
                    🔄 Actualizar
                  </Button>
                </div>
                {buildingsDebugInfo ? (
                  <div className="bg-muted p-3 rounded-md space-y-3 text-sm">
                    <div>
                      <p><strong>Total edificios:</strong> {buildingsDebugInfo.totalBuildings}</p>
                      <p><strong>User ID:</strong> <span className="text-xs break-all">{buildingsDebugInfo.userId}</span></p>
                    </div>
                    
                    {/* Warehouse Status */}
                    <div className={`p-2 rounded border-2 ${buildingsDebugInfo.warehouse.exists ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                      <p className="font-semibold">📦 Warehouse:</p>
                      {buildingsDebugInfo.warehouse.exists ? (
                        <div className="ml-2 space-y-1 text-xs">
                          <p><strong>ID:</strong> <span className="break-all">{buildingsDebugInfo.warehouse.id}</span></p>
                          <p><strong>Nivel:</strong> {buildingsDebugInfo.warehouse.level}</p>
                          <p><strong>Capacidad:</strong> {buildingsDebugInfo.warehouse.capacity.toLocaleString()}</p>
                          <p><strong>Skin:</strong> {buildingsDebugInfo.warehouse.selected_skin || 'Ninguna'}</p>
                          <p className="text-green-700">✅ Existe en BD</p>
                        </div>
                      ) : (
                        <div className="ml-2 text-xs">
                          <p className="text-red-700">❌ {buildingsDebugInfo.warehouse.error}</p>
                        </div>
                      )}
                    </div>

                    {/* Market Status */}
                    <div className={`p-2 rounded border-2 ${buildingsDebugInfo.market.exists ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                      <p className="font-semibold">🏪 Market:</p>
                      {buildingsDebugInfo.market.exists ? (
                        <div className="ml-2 space-y-1 text-xs">
                          <p><strong>ID:</strong> <span className="break-all">{buildingsDebugInfo.market.id}</span></p>
                          <p><strong>Nivel:</strong> {buildingsDebugInfo.market.level}</p>
                          <p><strong>Capacidad:</strong> {buildingsDebugInfo.market.capacity.toLocaleString()}</p>
                          <p><strong>Skin:</strong> {buildingsDebugInfo.market.selected_skin || 'Ninguna'}</p>
                          <p className="text-green-700">✅ Existe en BD</p>
                        </div>
                      ) : (
                        <div className="ml-2 text-xs">
                          <p className="text-red-700">❌ {buildingsDebugInfo.market.error}</p>
                        </div>
                      )}
                    </div>

                    {/* All Buildings List */}
                    <div className="p-2 rounded border border-border bg-background">
                      <p className="font-semibold mb-1">📋 Todos los edificios:</p>
                      <div className="space-y-1 text-xs max-h-32 overflow-y-auto">
                        {buildingsDebugInfo.buildings.length > 0 ? (
                          buildingsDebugInfo.buildings.map((b: any, idx: number) => (
                            <div key={idx} className="flex gap-2 text-xs">
                              <span className="font-mono">{idx + 1}.</span>
                              <span className="font-semibold">{b.type}</span>
                              <span>Lv.{b.level}</span>
                              <span className="text-muted-foreground">ID: {b.id.slice(0, 8)}...</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-muted-foreground">No hay edificios</p>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Actualizado: {new Date(buildingsDebugInfo.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                ) : (
                  <div className="bg-muted p-3 rounded-md text-sm text-muted-foreground">
                    Cargando información de edificios...
                  </div>
                )}
              </div>

              {/* Raw Data */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">📋 Raw JSON</h3>
                <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-40">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Timestamp: {new Date(debugInfo.timestamp).toLocaleString()}
              </p>
            </TabsContent>

            <TabsContent value="layout" className="space-y-4">
              {/* Layout Controls */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={toggleEdit}
                  size="sm"
                  variant={isEditMode ? "default" : "outline"}
                  className="gap-2"
                >
                  <Layout className="h-4 w-4" />
                  {isEditMode ? t('layoutEditor.deactivateEdit') : t('layoutEditor.activateEdit')}
                </Button>
                {isEditMode && (
                  <>
                    <Button
                      onClick={addBelt}
                      size="sm"
                      variant="outline"
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      {t('layoutEditor.addBelt')}
                    </Button>
                    <Button
                      onClick={resetLayout}
                      size="sm"
                      variant="outline"
                      className="gap-2 text-orange-600 hover:text-orange-700"
                    >
                      <RotateCcw className="h-4 w-4" />
                      {t('layoutEditor.reset')}
                    </Button>
                  </>
                )}
                <Button
                  onClick={exportLayout}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  {t('layoutEditor.copy')}
                </Button>
              </div>

              {/* Layout Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">📊 Estado</h3>
                  <div className="bg-muted p-3 rounded-md space-y-2 text-sm">
                    <p><strong>Modo edición:</strong> <span className={isEditMode ? 'text-green-600' : 'text-muted-foreground'}>{isEditMode ? 'ON' : 'OFF'}</span></p>
                    <p><strong>Belts manuales:</strong> {beltCount}</p>
                    <div className="flex items-center gap-2 pt-2">
                      <label className="text-xs font-medium">Gap:</label>
                      <input
                        type="text"
                        value={gap}
                        onChange={(e) => onGapChange(e.target.value)}
                        className="w-24 px-2 py-1 text-xs border rounded bg-background"
                        placeholder="20px"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">📋 Layout JSON</h3>
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-56 whitespace-pre-wrap break-all">
                    {layoutText || 'Sin configuración guardada'}
                  </pre>
                </div>
              </div>

              {/* Belt Debug Info */}
              {beltDebugInfo && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">🔧 Debug de Cintas</h3>
                  <div className="bg-muted p-3 rounded-md space-y-2 text-sm">
                    <div>
                      <p><strong>Total cintas automáticas:</strong> {beltDebugInfo.totalAutoBelts}</p>
                      <p><strong>Total cintas manuales:</strong> {beltDebugInfo.manualBelts}</p>
                      <p><strong>Total cintas:</strong> {beltDebugInfo.totalBelts}</p>
                    </div>
                    <div className="border-t pt-2">
                      <p><strong>Cintas izquierda:</strong> {beltDebugInfo.leftBelts.count}</p>
                      {beltDebugInfo.leftBelts.belts.length > 0 && (
                        <ul className="text-xs mt-1 space-y-1">
                          {beltDebugInfo.leftBelts.belts.map((b: any, i: number) => (
                            <li key={i}>- {b.id}: Row {b.row}, Col {b.col}, Dir {b.direction}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="border-t pt-2">
                      <p><strong>Cintas derecha:</strong> {beltDebugInfo.rightBelts.count}</p>
                      {beltDebugInfo.rightBelts.belts.length > 0 && (
                        <ul className="text-xs mt-1 space-y-1">
                          {beltDebugInfo.rightBelts.belts.map((b: any, i: number) => (
                            <li key={i}>- {b.id}: Row {b.row}, Col {b.col}, Dir {b.direction}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="border-t pt-2">
                      <p><strong>Cintas centro:</strong> {beltDebugInfo.centerBelts.count}</p>
                      {beltDebugInfo.centerBelts.firstRow && (
                        <p className="text-xs">Primera fila: {beltDebugInfo.centerBelts.firstRow}, Última fila: {beltDebugInfo.centerBelts.lastRow}</p>
                      )}
                    </div>
                    <div className="border-t pt-2">
                      <p><strong>Configuración:</strong></p>
                      <ul className="text-xs mt-1 space-y-1">
                        <li>Left corrals startRow: {beltDebugInfo.config.leftCorralsStartRow}, rowSpan: {beltDebugInfo.config.leftCorralsRowSpan}</li>
                        <li>Right corrals startRow: {beltDebugInfo.config.rightCorralsStartRow}, rowSpan: {beltDebugInfo.config.rightCorralsRowSpan}</li>
                        <li>Slots por lado: {beltDebugInfo.config.slotsPerSide}</li>
                        <li>Total slots: {beltDebugInfo.config.totalSlots}</li>
                      </ul>
                    </div>
                    <div className="border-t pt-2">
                      <Button
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(beltDebugInfo, null, 2));
                          toast({
                            title: "Info copiada",
                            description: "Información de cintas copiada al portapapeles",
                          });
                        }}
                        size="sm"
                        variant="outline"
                        className="w-full"
                      >
                        <Copy className="h-3 w-3 mr-2" />
                        Copiar info de cintas
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Paint Mode Click Debug Info */}
              {paintModeClickInfo && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">🖱️ Debug de Click (Paint Mode)</h3>
                  <div className="bg-muted p-3 rounded-md space-y-2 text-sm">
                    <div>
                      <p><strong>Posición del mouse:</strong></p>
                      <ul className="text-xs mt-1 space-y-1">
                        <li>clientX: {paintModeClickInfo.clientX}</li>
                        <li>clientY: {paintModeClickInfo.clientY}</li>
                      </ul>
                    </div>
                    <div className="border-t pt-2">
                      <p><strong>Posición del rect:</strong></p>
                      <ul className="text-xs mt-1 space-y-1">
                        <li>rect.left: {paintModeClickInfo.rectLeft}</li>
                        <li>rect.top: {paintModeClickInfo.rectTop}</li>
                        <li>rect.width: {paintModeClickInfo.rectWidth}</li>
                        <li>rect.height: {paintModeClickInfo.rectHeight}</li>
                      </ul>
                    </div>
                    <div className="border-t pt-2">
                      <p><strong>Posición relativa:</strong></p>
                      <ul className="text-xs mt-1 space-y-1">
                        <li>relativeX: {paintModeClickInfo.relativeX != null ? paintModeClickInfo.relativeX.toFixed(2) : 'N/A'}</li>
                        <li>relativeY: {paintModeClickInfo.relativeY != null ? paintModeClickInfo.relativeY.toFixed(2) : 'N/A'}</li>
                      </ul>
                    </div>
                    <div className="border-t pt-2">
                      <p><strong>Dimensiones de celda:</strong></p>
                      <ul className="text-xs mt-1 space-y-1">
                        <li>cellWidth: {paintModeClickInfo.cellWidth != null ? paintModeClickInfo.cellWidth.toFixed(2) : 'N/A'}</li>
                        <li>cellHeight: {paintModeClickInfo.cellHeight != null ? paintModeClickInfo.cellHeight.toFixed(2) : 'N/A'}</li>
                        <li>gapPx: {paintModeClickInfo.gapPx ?? 'N/A'}</li>
                      </ul>
                    </div>
                    <div className="border-t pt-2">
                      <p><strong>Posición calculada:</strong></p>
                      <ul className="text-xs mt-1 space-y-1">
                        <li>Columna: {paintModeClickInfo.calculatedCol}</li>
                        <li>Fila: {paintModeClickInfo.calculatedRow}</li>
                        <li>Total filas: {paintModeClickInfo.totalRows}</li>
                      </ul>
                    </div>
                    <div className="border-t pt-2">
                      <Button
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(paintModeClickInfo, null, 2));
                          toast({
                            title: "Info copiada",
                            description: "Información de click copiada al portapapeles",
                          });
                        }}
                        size="sm"
                        variant="outline"
                        className="w-full"
                      >
                        <Copy className="h-3 w-3 mr-2" />
                        Copiar info de click
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="skins" className="space-y-4">
              {/* User ID Status */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">👤 User Status</h3>
                <div className="bg-muted p-3 rounded-md space-y-1 text-sm">
                  <p><strong>User ID:</strong> {userId || 'Not loaded'}</p>
                  <p><strong>Telegram ID:</strong> {telegramUser?.id || 'N/A'}</p>
                </div>
              </div>

              {/* Selected Skins */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">🎨 Selected Skins</h3>
                <div className="bg-muted p-3 rounded-md space-y-2 text-sm">
                  {buildings && buildings.length > 0 ? (
                    <div className="space-y-2">
                      {buildings.map((building: any) => (
                        <div key={building.id} className="border-b pb-2 last:border-0">
                          <p><strong>{building.building_type}</strong> (Lvl {building.level})</p>
                          <p className="text-xs text-muted-foreground">
                            Skin: {building.selected_skin || 'None (default)'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ID: {building.id}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No buildings found</p>
                  )}
                </div>
              </div>

              {/* Owned Skins - Detailed Check */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">💎 Owned Skins (Verificado en BD)</h3>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => userId && loadAllSkinsData(userId)}
                      size="sm"
                      variant="outline"
                      disabled={loadingSkins || !userId}
                      className="gap-1"
                    >
                      {loadingSkins ? "Cargando..." : "🔄 Actualizar"}
                    </Button>
                    <Button
                      onClick={async () => {
                        setCheckingWinterSkin(true);
                        const result = await checkWinterSkin();
                        setWinterSkinCheck(result);
                        setCheckingWinterSkin(false);
                        toast({
                          title: result.hasWinterSkin ? "✅ Tienes skin de invierno" : "❌ No tienes skin de invierno",
                          description: result.hasWinterSkin 
                            ? `Tienes ${result.userWinterSkins.length} skin(s) de invierno`
                            : "No se encontraron skins de invierno en tu inventario",
                        });
                      }}
                      size="sm"
                      variant="outline"
                      disabled={checkingWinterSkin}
                      className="gap-1"
                    >
                      <Snowflake className="h-3 w-3" />
                      {checkingWinterSkin ? "Verificando..." : "Verificar Invierno"}
                    </Button>
                  </div>
                </div>
                
                {loadingSkins && (
                  <div className="bg-muted p-3 rounded-md text-sm text-center">
                    <p>Cargando datos de skins desde la base de datos...</p>
                  </div>
                )}

                {/* User Items from user_items table */}
                <div className="bg-muted p-3 rounded-md space-y-2 text-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-xs">📦 En user_items (BD):</p>
                    <span className="text-xs text-muted-foreground">
                      {userItems?.filter((item: any) => item.item_type === 'skin').length || 0} skins
                    </span>
                  </div>
                  {userItems && userItems.length > 0 ? (
                    <div className="space-y-1">
                      {userItems
                        .filter((item: any) => item.item_type === 'skin')
                        .map((item: any) => {
                          // Verify this skin exists in building_skins
                          const skinInDB = allSkinsFromDB.find(s => s.skin_key === item.item_key);
                          return (
                            <div key={item.id} className="border-b pb-1 last:border-0">
                              <div className="flex items-center justify-between">
                                <p><strong>{item.item_key}</strong> (x{item.quantity})</p>
                                {skinInDB ? (
                                  <span className="text-xs text-green-600">✓ En BD</span>
                                ) : (
                                  <span className="text-xs text-yellow-600">⚠ No en building_skins</span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Acquired: {new Date(item.acquired_at).toLocaleDateString()}
                              </p>
                              {skinInDB && (
                                <p className="text-xs text-muted-foreground">
                                  Tipo: {skinInDB.building_type} | Default: {skinInDB.is_default ? 'Sí' : 'No'}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      {userItems.filter((item: any) => item.item_type === 'skin').length === 0 && (
                        <p className="text-muted-foreground text-xs">❌ No tienes skins en user_items</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-xs">❌ No se encontraron items en user_items</p>
                  )}
                </div>

                {/* Default Skins (is_default = true) */}
                <div className="bg-muted p-3 rounded-md space-y-2 text-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-xs">⭐ Skins por defecto (is_default = true):</p>
                    <span className="text-xs text-muted-foreground">{defaultSkins.length} skins</span>
                  </div>
                  {defaultSkins.length > 0 ? (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {defaultSkins.map((skin: any) => {
                        const userHasIt = userItems?.some((item: any) => 
                          item.item_type === 'skin' && item.item_key === skin.skin_key
                        );
                        return (
                          <div key={skin.id} className="border-b pb-1 last:border-0 text-xs">
                            <div className="flex items-center justify-between">
                              <p><strong>{skin.skin_key}</strong> ({skin.building_type})</p>
                              {userHasIt ? (
                                <span className="text-green-600">✓ También en user_items</span>
                              ) : (
                                <span className="text-blue-600">Solo default</span>
                              )}
                            </div>
                            <p className="text-muted-foreground">{skin.name}</p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-xs">No hay skins por defecto</p>
                  )}
                </div>

                {/* Summary */}
                <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded-md text-sm">
                  <p className="font-semibold mb-1">📊 Resumen:</p>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>• Skins en user_items: {userItems?.filter((item: any) => item.item_type === 'skin').length || 0}</li>
                    <li>• Skins por defecto: {defaultSkins.length}</li>
                    <li>• Total skins en BD: {allSkinsFromDB.length}</li>
                    <li>• Skins que puedes usar: {defaultSkins.length + (userItems?.filter((item: any) => item.item_type === 'skin').length || 0)}</li>
                  </ul>
                </div>
              </div>

              {/* Winter Skin Check Result */}
              {winterSkinCheck && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Snowflake className="h-4 w-4" />
                    Verificación de Skin de Invierno
                  </h3>
                  <div className="bg-muted p-3 rounded-md space-y-2 text-sm">
                    <div className={`p-2 rounded ${winterSkinCheck.hasWinterSkin ? 'bg-green-500/20 border border-green-500' : 'bg-red-500/20 border border-red-500'}`}>
                      <p className="font-bold">
                        {winterSkinCheck.hasWinterSkin ? '✅ Tienes skin de invierno' : '❌ No tienes skin de invierno'}
                      </p>
                      {winterSkinCheck.userId && (
                        <p className="text-xs text-muted-foreground">User ID: {winterSkinCheck.userId}</p>
                      )}
                    </div>
                    
                    {winterSkinCheck.winterSkins && winterSkinCheck.winterSkins.length > 0 && (
                      <div className="border-t pt-2 mt-2">
                        <p className="font-semibold mb-1">Skins de invierno disponibles en BD:</p>
                        <div className="space-y-1">
                          {winterSkinCheck.winterSkins.map((skin: any) => (
                            <div key={skin.id} className="text-xs">
                              <p><strong>{skin.skin_key}</strong> - {skin.name} ({skin.building_type})</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {winterSkinCheck.userWinterSkins && winterSkinCheck.userWinterSkins.length > 0 && (
                      <div className="border-t pt-2 mt-2">
                        <p className="font-semibold mb-1">Tus skins de invierno:</p>
                        <div className="space-y-1">
                          {winterSkinCheck.userWinterSkins.map((item: any) => (
                            <div key={item.id} className="text-xs">
                              <p><strong>{item.item_key}</strong> (x{item.quantity})</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {winterSkinCheck.error && (
                      <div className="border-t pt-2 mt-2">
                        <p className="text-xs text-red-600">Error: {winterSkinCheck.error}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Error Logs */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Error Logs
                  </h3>
                  <Button
                    onClick={() => setSkinsLogs([])}
                    size="sm"
                    variant="outline"
                  >
                    Clear
                  </Button>
                </div>
                <div className="bg-muted p-3 rounded-md space-y-2 text-sm max-h-60 overflow-y-auto">
                  {skinsLogs.length > 0 ? (
                    <div className="space-y-2">
                      {skinsLogs.map((log, idx) => (
                        <div key={idx} className={`border-l-2 pl-2 ${
                          log.level === 'error' ? 'border-red-500' : 
                          log.level === 'warning' ? 'border-yellow-500' : 
                          'border-blue-500'
                        }`}>
                          <p className="text-xs text-muted-foreground">{log.timestamp}</p>
                          <p className={log.level === 'error' ? 'text-red-600' : ''}>
                            [{log.level.toUpperCase()}] {log.message}
                          </p>
                          {log.error && (
                            <p className="text-xs text-muted-foreground mt-1">{log.error}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No errors logged</p>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="systems" className="space-y-4">
              {/* Bézier Curve Visualizer */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">📐 Visualizador de Curva Bézier (Huevos en Cintas)</h3>
                <BezierCurveVisualizer />
              </div>

              {/* Egg System Debug */}
              {eggDebugInfo && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">🥚 Egg System</h3>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => {
                          const verify = (window as any).verifyEggSystem;
                          if (verify) {
                            const result = verify();
                            setVerificationResult(result);
                            console.log('[DebugPanel] Verification result:', result);
                            toast({
                              title: "Verificación completada",
                              description: `Encontrados ${result.totalIssues} problemas: ${result.errors} errores, ${result.warnings} advertencias`,
                              variant: result.errors > 0 ? "destructive" : result.warnings > 0 ? "default" : "default",
                            });
                          } else {
                            toast({
                              title: "Error",
                              description: "Función de verificación no disponible",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        🔍 Verificar
                      </Button>
                      <Button
                        size="sm"
                        variant={eggDebugMode ? "default" : "outline"}
                        className="gap-1"
                        onClick={toggleEggDebugMode}
                      >
                        <Link2 className="h-4 w-4" />
                        {eggDebugMode ? "Ocultar vínculos" : "Ver vínculos"}
                      </Button>
                    </div>
                  </div>
                  <div className="bg-muted p-3 rounded-md space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <p><strong>Total Eggs:</strong> {eggDebugInfo.totalEggs ?? 0} / {eggDebugInfo.maxEggs ?? 0}</p>
                      <p><strong>Base Interval:</strong> {eggDebugInfo.baseSpawnInterval ? (eggDebugInfo.baseSpawnInterval / 1000).toFixed(1) : 'N/A'}s</p>
                      <p><strong>Total Coops:</strong> {eggDebugInfo.totalCoops || 0}</p>
                      <p><strong>With Belts:</strong> {eggDebugInfo.coopsWithBelts || 0}</p>
                      <p><strong>Without Belts:</strong> {eggDebugInfo.coopsWithoutBelts || 0}</p>
                      <p><strong>Ready to Spawn:</strong> <span className={(eggDebugInfo.readyToSpawn ?? 0) > 0 ? 'text-green-600 font-bold' : ''}>{eggDebugInfo.readyToSpawn || 0}</span></p>
                      <p><strong>Page Visible:</strong> {eggDebugInfo.pageVisible ? '✅ Yes' : '❌ No'}</p>
                    </div>
                    
                    {eggDebugInfo.spawnPoints && eggDebugInfo.spawnPoints.length > 0 && (
                      <div className="border-t pt-3 mt-3">
                        <p className="font-semibold mb-2">📋 Spawn Points (Dinámico):</p>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {eggDebugInfo.spawnPoints.map((spawn: any, idx: number) => {
                            const statusColor = spawn.status === 'ready' ? 'text-green-600' : 
                                              spawn.status === 'waiting' ? 'text-yellow-600' : 
                                              'text-red-600';
                            const statusIcon = spawn.status === 'ready' ? '✅' : 
                                             spawn.status === 'waiting' ? '⏳' : 
                                             '❌';
                            return (
                              <div key={idx} className="border rounded p-2 bg-background/50">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="font-medium">
                                      {statusIcon} <span className={statusColor}>Posición {spawn.positionIndex}</span>
                                      {spawn.status === 'ready' && <span className="ml-2 text-green-600 font-bold">LISTO</span>}
                                    </p>
                                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                      <p>Coop ID: {spawn.coopId ? (typeof spawn.coopId === 'string' ? spawn.coopId.slice(0, 12) : String(spawn.coopId).slice(0, 12)) : 'N/A'}...</p>
                                      <p>Nivel: {spawn.level ?? 'N/A'} | Intervalo: {spawn.spawnInterval ? (spawn.spawnInterval / 1000).toFixed(1) : 'N/A'}s</p>
                                      <p>Position Index: {spawn.positionIndex !== undefined ? spawn.positionIndex : 'N/A'}</p>
                                      {spawn.hasBelt ? (
                                        <>
                                          <p className="text-green-600">✅ Tiene cinta asignada</p>
                                          {spawn.assignedBeltId && (
                                            <p>Cinta: {typeof spawn.assignedBeltId === 'string' ? spawn.assignedBeltId.slice(0, 20) : String(spawn.assignedBeltId).slice(0, 20)}...</p>
                                          )}
                                          {spawn.assignedBeltPosition && (
                                            <p>Posición cinta: {spawn.assignedBeltPosition}</p>
                                          )}
                                          {spawn.beltSlotPosition !== undefined && (
                                            <p>Belt Slot Position: {spawn.beltSlotPosition} {spawn.beltSlotPosition === spawn.positionIndex ? '✅ Match' : '⚠️ Mismatch'}</p>
                                          )}
                                        </>
                                      ) : (
                                        <p className="text-red-600">❌ NO tiene cinta asignada - Este coop NO generará huevos</p>
                                      )}
                                      {spawn.timeUntilSpawn > 0 && (
                                        <p>Tiempo hasta spawn: <strong>{(spawn.timeUntilSpawn / 1000).toFixed(1)}s</strong></p>
                                      )}
                                      {spawn.lastSpawn && (
                                        <p>Último spawn: {new Date(spawn.lastSpawn).toLocaleTimeString()}</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Verification Results */}
                    {verificationResult && (
                      <div className="border-t pt-3 mt-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold">🔍 Resultados de Verificación</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(JSON.stringify(verificationResult, null, 2));
                              toast({
                                title: "Resultados copiados",
                                description: "Resultados de verificación copiados al portapapeles",
                              });
                            }}
                            className="h-6 text-xs"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copiar
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className={`p-2 rounded ${verificationResult.errors > 0 ? 'bg-red-500/20 border border-red-500' : 'bg-green-500/20 border border-green-500'}`}>
                              <p className="font-semibold">Errores: {verificationResult.errors}</p>
                            </div>
                            <div className={`p-2 rounded ${verificationResult.warnings > 0 ? 'bg-yellow-500/20 border border-yellow-500' : 'bg-green-500/20 border border-green-500'}`}>
                              <p className="font-semibold">Advertencias: {verificationResult.warnings}</p>
                            </div>
                            <div className="p-2 rounded bg-blue-500/20 border border-blue-500">
                              <p className="font-semibold">Info: {verificationResult.infos}</p>
                            </div>
                          </div>
                          <div className="bg-muted p-2 rounded text-xs">
                            <p><strong>Resumen:</strong></p>
                            <ul className="list-disc list-inside space-y-1 mt-1">
                              <li>Total coops: {verificationResult.summary.totalCoops}</li>
                              <li>Coops con cintas: {verificationResult.summary.coopsWithBelts}</li>
                              <li>Coops con rutas válidas: {verificationResult.summary.coopsWithValidPaths}</li>
                              <li>Huevos actuales: {verificationResult.summary.currentEggs} / {verificationResult.summary.maxEggs}</li>
                              <li>Cintas de salida: {verificationResult.summary.totalOutputBelts}</li>
                              <li>Cintas asignadas: {verificationResult.summary.assignedBelts}</li>
                              <li>Página visible: {verificationResult.summary.pageVisible ? '✅' : '❌'}</li>
                            </ul>
                          </div>
                          {verificationResult.issues.length > 0 && (
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                              <p className="font-semibold text-xs">Problemas encontrados:</p>
                              {verificationResult.issues.map((issue: any, idx: number) => (
                                <div
                                  key={idx}
                                  className={`border-l-4 p-2 rounded text-xs ${
                                    issue.type === 'error' ? 'border-red-500 bg-red-500/10' :
                                    issue.type === 'warning' ? 'border-yellow-500 bg-yellow-500/10' :
                                    'border-blue-500 bg-blue-500/10'
                                  }`}
                                >
                                  <p className="font-semibold">
                                    {issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : 'ℹ️'} {issue.message}
                                  </p>
                                  {issue.positionIndex !== undefined && (
                                    <p className="text-muted-foreground mt-1">Posición: {issue.positionIndex}</p>
                                  )}
                                  {issue.details && (
                                    <details className="mt-1">
                                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                        Ver detalles
                                      </summary>
                                      <pre className="mt-1 p-2 bg-background/50 rounded text-[10px] overflow-x-auto">
                                        {JSON.stringify(issue.details, null, 2)}
                                      </pre>
                                    </details>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          {verificationResult.issues.length === 0 && (
                            <div className="p-3 bg-green-500/20 border border-green-500 rounded text-center">
                              <p className="text-green-700 font-semibold">✅ Sistema funcionando correctamente</p>
                              <p className="text-xs text-green-600 mt-1">No se encontraron problemas</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Vehicle System Debug */}
              {vehicleDebugInfo ? (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">🚚 Vehicle System</h3>
                  
                  {/* Vehicle Logs */}
                  {vehicleLogs.length > 0 && (
                    <div className="bg-muted p-3 rounded-md space-y-2 text-sm">
                      <div className="flex justify-between items-center mb-2">
                        <p className="font-semibold">📋 Vehicle Logs ({vehicleLogs.length})</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setVehicleLogs([])}
                          className="h-6 text-xs"
                        >
                          Limpiar
                        </Button>
                      </div>
                      <div className="space-y-1 max-h-60 overflow-y-auto text-xs font-mono">
                        {vehicleLogs.map((log, idx) => (
                          <div
                            key={idx}
                            className={`p-2 rounded border-l-2 ${
                              log.level === 'error' ? 'border-red-500 bg-red-500/10' :
                              log.level === 'warn' ? 'border-yellow-500 bg-yellow-500/10' :
                              'border-blue-500 bg-blue-500/10'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <span className="text-muted-foreground text-[10px] min-w-[60px]">{log.timestamp}</span>
                              <span className={`font-semibold min-w-[50px] ${
                                log.level === 'error' ? 'text-red-600' :
                                log.level === 'warn' ? 'text-yellow-600' :
                                'text-blue-600'
                              }`}>
                                [{log.level.toUpperCase()}]
                              </span>
                              <div className="flex-1">
                                <p className="break-words">{log.message}</p>
                                {log.data && (
                                  <details className="mt-1">
                                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                      Ver datos
                                    </summary>
                                    <pre className="mt-1 p-2 bg-background/50 rounded text-[10px] overflow-x-auto">
                                      {JSON.stringify(log.data, null, 2)}
                                    </pre>
                                  </details>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-muted p-3 rounded-md space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <p><strong>Current Vehicles:</strong> {vehicleDebugInfo.currentVehicles ?? 0} / {vehicleDebugInfo.maxVehicles ?? 0}</p>
                      <p><strong>Spawn Interval:</strong> {vehicleDebugInfo.spawnInterval ? (vehicleDebugInfo.spawnInterval / 1000).toFixed(1) : 'N/A'}s</p>
                      <p><strong>Vehicle Speed:</strong> {vehicleDebugInfo.vehicleSpeed ? vehicleDebugInfo.vehicleSpeed.toFixed(4) : 'N/A'}</p>
                      <p><strong>Total Roads:</strong> {vehicleDebugInfo.roadsCount || 0}</p>
                      <p><strong>Transport Roads:</strong> {vehicleDebugInfo.transportRoadsCount || 0}</p>
                      <p><strong>Can Spawn:</strong> {vehicleDebugInfo.canSpawn ? '✅ Yes' : '❌ No'}</p>
                    </div>

                    {vehicleDebugInfo.spawnPoint && (
                      <div className="border-t pt-3 mt-3">
                        <p className="font-semibold mb-2">📍 Spawn Point (Dinámico):</p>
                        <div className="border rounded p-2 bg-background/50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium">
                                {vehicleDebugInfo.spawnPoint.status === 'ready' ? '✅' : 
                                 vehicleDebugInfo.spawnPoint.status === 'waiting' ? '⏳' : 
                                 vehicleDebugInfo.spawnPoint.status === 'blocked' ? '🚫' : '❌'} 
                                <span className={vehicleDebugInfo.spawnPoint.status === 'ready' ? 'text-green-600' : 
                                               vehicleDebugInfo.spawnPoint.status === 'waiting' ? 'text-yellow-600' : 
                                               'text-red-600'}>
                                  {vehicleDebugInfo.spawnPoint.type} - {vehicleDebugInfo.spawnPoint.status === 'ready' ? 'LISTO' : 
                                                                        vehicleDebugInfo.spawnPoint.status === 'waiting' ? 'ESPERANDO' :
                                                                        vehicleDebugInfo.spawnPoint.status === 'blocked' ? 'BLOQUEADO' :
                                                                        'SIN DESTINO'}
                                </span>
                              </p>
                              <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                <p>Road ID: {vehicleDebugInfo.spawnPoint.roadId ? (typeof vehicleDebugInfo.spawnPoint.roadId === 'string' ? vehicleDebugInfo.spawnPoint.roadId.slice(0, 20) : String(vehicleDebugInfo.spawnPoint.roadId).slice(0, 20)) : 'N/A'}...</p>
                                <p>Posición: {vehicleDebugInfo.spawnPoint.position || 'N/A'}</p>
                                <p>Dirección: {vehicleDebugInfo.spawnPoint.direction || 'N/A'}</p>
                                {vehicleDebugInfo.spawnPoint.timeUntilSpawn && vehicleDebugInfo.spawnPoint.timeUntilSpawn > 0 && (
                                  <p>Tiempo hasta spawn: <strong>{(vehicleDebugInfo.spawnPoint.timeUntilSpawn / 1000).toFixed(1)}s</strong></p>
                                )}
                                {vehicleDebugInfo.spawnPoint.lastSpawn && (
                                  <p>Último spawn: {new Date(vehicleDebugInfo.spawnPoint.lastSpawn).toLocaleTimeString()}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {vehicleDebugInfo.pathInfo && (
                      <div className="border-t pt-3 mt-3">
                        <p className="font-semibold mb-2">🛣️ Path Info:</p>
                        <div className="text-xs space-y-1">
                          <p><strong>Path Length:</strong> {vehicleDebugInfo.pathInfo.pathLength}</p>
                          <p><strong>Is Valid:</strong> {vehicleDebugInfo.pathInfo.isValid ? '✅ Yes' : '❌ No'}</p>
                          <p><strong>Transport Roads in Path:</strong> {vehicleDebugInfo.pathInfo.transportRoadsCount}</p>
                          {vehicleDebugInfo.pathInfo.pathRoads && vehicleDebugInfo.pathInfo.pathRoads.length > 0 && (
                            <div className="mt-2">
                              <p className="font-medium mb-1">Path Details:</p>
                              <div className="space-y-1 max-h-40 overflow-y-auto">
                                {vehicleDebugInfo.pathInfo.pathRoads.map((road: any, idx: number) => (
                                  <div key={idx} className="pl-2 border-l-2 border-muted-foreground/30">
                                    <p><strong>{idx + 1}.</strong> {road.type} - {road.position} ({road.direction})</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="border-t pt-2 mt-2 text-xs text-muted-foreground">
                      <p><strong>Point A:</strong> {vehicleDebugInfo.pointAPosition || 'Not set'}</p>
                      <p><strong>Point B:</strong> {vehicleDebugInfo.pointBPosition || 'Not set'}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">🚚 Vehicle System</h3>
                  <div className="bg-muted p-3 rounded-md space-y-2 text-sm">
                    <p className="text-muted-foreground">No vehicle debug information available</p>
                    <p className="text-xs text-muted-foreground">Make sure you have Point A and Point B roads configured</p>
                  </div>
                </div>
              )}

              {(!eggDebugInfo && !vehicleDebugInfo) && (
                <div className="text-center text-muted-foreground py-8">
                  No system debug information available yet
                </div>
              )}
            </TabsContent>

            <TabsContent value="ui" className="space-y-4">
              <UIColorsEditor />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

// UI Colors Editor Component
const UIColorsEditor = () => {
  const [colors, setColors] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('base');

  // Initialize custom color variables if they don't exist
  useEffect(() => {
    const root = document.documentElement;
    const customColors: Record<string, string> = {
      // Green colors (for coops, modals, etc.)
      '--ui-green-50': '142 76% 96%',
      '--ui-green-100': '142 76% 91%',
      '--ui-green-200': '142 76% 86%',
      '--ui-green-300': '142 76% 76%',
      '--ui-green-400': '142 76% 66%',
      '--ui-green-500': '142 76% 56%',
      '--ui-green-600': '142 76% 36%',
      '--ui-green-700': '142 76% 26%',
      '--ui-green-800': '142 76% 16%',
      '--ui-green-900': '142 76% 10%',
      // Amber colors (for chicken counter, etc.)
      '--ui-amber-500': '43 96% 56%',
      '--ui-amber-600': '43 96% 46%',
      // Blue colors (for warehouse, etc.)
      '--ui-blue-50': '217 91% 96%',
      '--ui-blue-100': '217 91% 91%',
      '--ui-blue-500': '217 91% 60%',
      '--ui-blue-600': '217 91% 50%',
      '--ui-blue-700': '217 91% 40%',
      // Menu/Navigation colors
      '--ui-menu-bg': '0 0% 98%',
      '--ui-menu-text': '240 5.3% 26.1%',
      '--ui-menu-hover': '240 4.8% 95.9%',
      '--ui-menu-active': '240 5.9% 10%',
      // Modal colors
      '--ui-modal-bg': '0 0% 100%',
      '--ui-modal-overlay': '0 0% 0% / 0.8',
      '--ui-modal-border': '142 76% 66%',
      // Slot colors
      '--ui-slot-bg': '45 30% 97%',
      '--ui-slot-border': '0 0% 100% / 0.6',
      // Progress bar colors
      '--ui-progress-bg': '142 76% 86% / 0.7',
      '--ui-progress-fill': '142 76% 56%',
      '--ui-progress-fill-dark': '142 76% 36%',
    };

    // Set default values if not already set
    Object.entries(customColors).forEach(([varName, defaultValue]) => {
      if (!root.style.getPropertyValue(varName)) {
        root.style.setProperty(varName, defaultValue);
      }
    });
  }, []);

  // Get all CSS variables from :root
  useEffect(() => {
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    const colorVars: Record<string, string> = {};
    
    // Base color variables
    const baseColorVariables = [
      '--background', '--foreground',
      '--card', '--card-foreground',
      '--popover', '--popover-foreground',
      '--primary', '--primary-foreground',
      '--secondary', '--secondary-foreground',
      '--muted', '--muted-foreground',
      '--accent', '--accent-foreground',
      '--destructive', '--destructive-foreground',
      '--border', '--input', '--ring',
    ];

    // Custom UI color variables
    const customColorVariables = [
      // Green colors
      '--ui-green-50', '--ui-green-100', '--ui-green-200', '--ui-green-300',
      '--ui-green-400', '--ui-green-500', '--ui-green-600', '--ui-green-700',
      '--ui-green-800', '--ui-green-900',
      // Amber colors
      '--ui-amber-500', '--ui-amber-600',
      // Blue colors
      '--ui-blue-50', '--ui-blue-100', '--ui-blue-500', '--ui-blue-600', '--ui-blue-700',
      // Menu colors
      '--ui-menu-bg', '--ui-menu-text', '--ui-menu-hover', '--ui-menu-active',
      // Modal colors
      '--ui-modal-bg', '--ui-modal-overlay', '--ui-modal-border',
      // Slot colors
      '--ui-slot-bg', '--ui-slot-border',
      // Progress bar colors
      '--ui-progress-bg', '--ui-progress-fill', '--ui-progress-fill-dark',
    ];

    const allColorVariables = [...baseColorVariables, ...customColorVariables];

    allColorVariables.forEach(varName => {
      const value = computedStyle.getPropertyValue(varName).trim() || root.style.getPropertyValue(varName).trim();
      if (value) {
        colorVars[varName] = value;
      }
    });

    setColors(colorVars);
  }, []);

  // Convert HSL string to hex for color input
  const hslToHex = (hsl: string): string => {
    const match = hsl.match(/(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/);
    if (!match) return '#000000';
    
    const h = parseFloat(match[1]) / 360;
    const s = parseFloat(match[2]) / 100;
    const l = parseFloat(match[3]) / 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h * 6) % 2 - 1));
    const m = l - c / 2;

    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 1/6) {
      r = c; g = x; b = 0;
    } else if (1/6 <= h && h < 2/6) {
      r = x; g = c; b = 0;
    } else if (2/6 <= h && h < 3/6) {
      r = 0; g = c; b = x;
    } else if (3/6 <= h && h < 4/6) {
      r = 0; g = x; b = c;
    } else if (4/6 <= h && h < 5/6) {
      r = x; g = 0; b = c;
    } else if (5/6 <= h && h < 1) {
      r = c; g = 0; b = x;
    }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return `#${[r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('')}`;
  };

  // Convert hex to HSL string
  const hexToHsl = (hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    h = Math.round(h * 360);
    s = Math.round(s * 100);
    const lRounded = Math.round(l * 100);

    return `${h} ${s}% ${lRounded}%`;
  };

  const updateColor = (varName: string, hexValue: string) => {
    const hslValue = hexToHsl(hexValue);
    const root = document.documentElement;
    root.style.setProperty(varName, hslValue);
    
    setColors(prev => ({
      ...prev,
      [varName]: hslValue
    }));
  };

  const copyColors = () => {
    const colorConfig: Record<string, string> = {};
    Object.keys(colors).forEach(key => {
      colorConfig[key] = colors[key];
    });
    
    const configString = JSON.stringify(colorConfig, null, 2);
    navigator.clipboard.writeText(configString).then(() => {
      setCopied(true);
      toast({
        title: "Colores copiados",
        description: "Los colores han sido copiados al portapapeles",
      });
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const resetColors = () => {
    const root = document.documentElement;
    Object.keys(colors).forEach(varName => {
      root.style.removeProperty(varName);
    });
    window.location.reload();
  };

  // Organize colors by category
  const colorCategories = {
    base: ['--background', '--foreground', '--card', '--card-foreground', '--popover', '--popover-foreground', '--primary', '--primary-foreground', '--secondary', '--secondary-foreground', '--muted', '--muted-foreground', '--accent', '--accent-foreground', '--destructive', '--destructive-foreground', '--border', '--input', '--ring'],
    green: ['--ui-green-50', '--ui-green-100', '--ui-green-200', '--ui-green-300', '--ui-green-400', '--ui-green-500', '--ui-green-600', '--ui-green-700', '--ui-green-800', '--ui-green-900'],
    amber: ['--ui-amber-500', '--ui-amber-600'],
    blue: ['--ui-blue-50', '--ui-blue-100', '--ui-blue-500', '--ui-blue-600', '--ui-blue-700'],
    menu: ['--ui-menu-bg', '--ui-menu-text', '--ui-menu-hover', '--ui-menu-active'],
    modal: ['--ui-modal-bg', '--ui-modal-overlay', '--ui-modal-border'],
    slot: ['--ui-slot-bg', '--ui-slot-border'],
    progress: ['--ui-progress-bg', '--ui-progress-fill', '--ui-progress-fill-dark'],
  };

  const getCategoryColors = (category: string) => {
    return colorCategories[category as keyof typeof colorCategories]?.filter(varName => colors[varName]) || [];
  };

  const categoryLabels: Record<string, string> = {
    base: '🎨 Colores Base',
    green: '🟢 Colores Verde (Coops, Modales)',
    amber: '🟡 Colores Ámbar (Contadores)',
    blue: '🔵 Colores Azul (Warehouse)',
    menu: '📱 Menú/Navegación',
    modal: '💬 Modales',
    slot: '📦 Slots',
    progress: '📊 Barras de Progreso',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">🎨 Editor de Colores UI</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={copyColors}
            className="flex items-center gap-2"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            Copiar Colores
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetColors}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Resetear
          </Button>
        </div>
      </div>

      {/* Category selector */}
      <div className="flex flex-wrap gap-2">
        {Object.keys(colorCategories).map(category => (
          <Button
            key={category}
            variant={activeCategory === category ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory(category)}
            className="text-xs"
          >
            {categoryLabels[category]}
          </Button>
        ))}
      </div>

      {/* Color editor for active category */}
      <div className="space-y-4">
        {getCategoryColors(activeCategory).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getCategoryColors(activeCategory).map(varName => (
              <div key={varName} className="space-y-2">
                <Label htmlFor={varName} className="text-xs font-medium">
                  {varName.replace('--ui-', '').replace('--', '').replace(/-/g, ' ')}
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id={varName}
                    value={hslToHex(colors[varName] || '0 0% 0%')}
                    onChange={(e) => updateColor(varName, e.target.value)}
                    className="w-12 h-8 rounded border cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={colors[varName] || ''}
                    onChange={(e) => {
                      const root = document.documentElement;
                      root.style.setProperty(varName, e.target.value);
                      setColors(prev => ({
                        ...prev,
                        [varName]: e.target.value
                      }));
                    }}
                    className="flex-1 text-xs font-mono"
                    placeholder="HSL value (e.g., 142 76% 36%)"
                  />
                  <div
                    className="w-8 h-8 rounded border"
                    style={{ backgroundColor: `hsl(${colors[varName] || '0 0% 0%'})` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            No hay colores disponibles en esta categoría
          </div>
        )}
      </div>

      <div className="bg-muted p-3 rounded-md">
        <p className="text-xs text-muted-foreground mb-2">
          <strong>Instrucciones:</strong> Selecciona una categoría arriba para editar colores específicos. 
          Modifica los colores usando el selector de color o editando el valor HSL directamente (formato: "H S% L%"). 
          Los cambios se aplican en tiempo real. Usa "Copiar Colores" para copiar toda la configuración.
        </p>
        <p className="text-xs text-muted-foreground">
          <strong>Nota:</strong> Algunos colores hardcodeados en componentes pueden requerir actualizar el código para usar estas variables CSS.
        </p>
      </div>
    </div>
  );
};

// Bézier Curve Visualizer Component
const BezierCurveVisualizer = () => {
  const [entryDirection, setEntryDirection] = useState<'north' | 'south' | 'east' | 'west'>('east');
  const [exitDirection, setExitDirection] = useState<'north' | 'south' | 'east' | 'west'>('north');
  const [controlX, setControlX] = useState<number>(0.5);
  const [controlY, setControlY] = useState<number>(0.5);
  const [progress, setProgress] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [animationSpeed, setAnimationSpeed] = useState<number>(1);

  // Calculate start and end points based on entry/exit directions
  const { startX, startY, endX, endY } = useMemo(() => {
    let sx = 0.5, sy = 0.5;
    let ex = 0.5, ey = 0.5;

    // Set start position based on entry direction
    switch (entryDirection) {
      case 'east': sx = 0; sy = 0.5; break;
      case 'west': sx = 1; sy = 0.5; break;
      case 'south': sx = 0.5; sy = 0; break;
      case 'north': sx = 0.5; sy = 1; break;
    }

    // Set end position based on exit direction
    switch (exitDirection) {
      case 'east': ex = 1; ey = 0.5; break;
      case 'west': ex = 0; ey = 0.5; break;
      case 'south': ex = 0.5; ey = 1; break;
      case 'north': ex = 0.5; ey = 0; break;
    }

    return { startX: sx, startY: sy, endX: ex, endY: ey };
  }, [entryDirection, exitDirection]);

  // Calculate current position on curve using quadratic Bézier
  const currentPosition = useMemo(() => {
    const t = progress;
    // Quadratic bezier: (1-t)²P₀ + 2(1-t)tP₁ + t²P₂
    const x = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * controlX + t * t * endX;
    const y = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * controlY + t * t * endY;
    return { x, y };
  }, [progress, startX, startY, endX, endY, controlX, controlY]);

  // Auto-calculate control point based on entry/exit (current logic)
  const autoControlPoint = useMemo(() => {
    // Coincidir con la lógica de Egg.tsx
    const isSouthWestTurn =
      (entryDirection === 'south' && exitDirection === 'west') ||
      (entryDirection === 'west' && exitDirection === 'south');

    const isSouthEastTurn =
      (entryDirection === 'south' && exitDirection === 'east') ||
      (entryDirection === 'east' && exitDirection === 'south');

    if (isSouthWestTurn || isSouthEastTurn) {
      return { x: 0.5, y: 0.5 };
    }

    const cx = (startX === 0.5) ? (endX === 1 ? 1 : 0) : startX;
    const cy = (startY === 0.5) ? (endY === 1 ? 1 : 0) : startY;
    return { x: cx, y: cy };
  }, [startX, startY, endX, endY, entryDirection, exitDirection]);

  // Apply auto control point
  useEffect(() => {
    setControlX(autoControlPoint.x);
    setControlY(autoControlPoint.y);
  }, [autoControlPoint]);

  // Animation loop
  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setProgress(prev => {
        const next = prev + 0.01 * animationSpeed;
        if (next >= 1) {
          setIsAnimating(false);
          return 0;
        }
        return next;
      });
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [isAnimating, animationSpeed]);

  const canvasSize = 400;
  const scale = canvasSize;

  // Convert normalized coordinates to canvas coordinates
  const toCanvas = (x: number, y: number) => ({
    x: x * scale,
    y: y * scale,
  });

  const startCanvas = toCanvas(startX, startY);
  const endCanvas = toCanvas(endX, endY);
  const controlCanvas = toCanvas(controlX, controlY);
  const currentCanvas = toCanvas(currentPosition.x, currentPosition.y);

  // Generate curve path for SVG
  const curvePath = `M ${startCanvas.x} ${startCanvas.y} Q ${controlCanvas.x} ${controlCanvas.y} ${endCanvas.x} ${endCanvas.y}`;

  return (
    <div className="bg-muted p-4 rounded-md space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Controls */}
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Dirección de Entrada</Label>
            <Select value={entryDirection} onValueChange={(v: any) => setEntryDirection(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="east">Este (→)</SelectItem>
                <SelectItem value="west">Oeste (←)</SelectItem>
                <SelectItem value="south">Sur (↓)</SelectItem>
                <SelectItem value="north">Norte (↑)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Dirección de Salida</Label>
            <Select value={exitDirection} onValueChange={(v: any) => setExitDirection(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="east">Este (→)</SelectItem>
                <SelectItem value="west">Oeste (←)</SelectItem>
                <SelectItem value="south">Sur (↓)</SelectItem>
                <SelectItem value="north">Norte (↑)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Punto de Control X: {controlX.toFixed(2)}</Label>
            <Input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={controlX}
              onChange={(e) => setControlX(parseFloat(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label>Punto de Control Y: {controlY.toFixed(2)}</Label>
            <Input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={controlY}
              onChange={(e) => setControlY(parseFloat(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label>Progreso: {(progress * 100).toFixed(0)}%</Label>
            <Input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={progress}
              onChange={(e) => setProgress(parseFloat(e.target.value))}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => {
                setIsAnimating(!isAnimating);
                if (!isAnimating) setProgress(0);
              }}
              size="sm"
              variant={isAnimating ? "destructive" : "default"}
            >
              {isAnimating ? "⏸️ Pausar" : "▶️ Animar"}
            </Button>
            <Button
              onClick={() => {
                setProgress(0);
                setIsAnimating(false);
              }}
              size="sm"
              variant="outline"
            >
              🔄 Reset
            </Button>
            <Button
              onClick={() => {
                setControlX(autoControlPoint.x);
                setControlY(autoControlPoint.y);
              }}
              size="sm"
              variant="outline"
            >
              🎯 Auto
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Velocidad de Animación: {animationSpeed.toFixed(1)}x</Label>
            <Input
              type="range"
              min="0.1"
              max="3"
              step="0.1"
              value={animationSpeed}
              onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
            />
          </div>
        </div>

        {/* Canvas */}
        <div className="space-y-2">
          <Label>Visualización de la Curva</Label>
          <div className="border-2 border-border rounded-lg bg-white p-4">
            <svg width={canvasSize} height={canvasSize} className="border border-gray-300 rounded">
              {/* Grid */}
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Curve */}
              <path
                d={curvePath}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
                strokeDasharray="5,5"
              />

              {/* Control point line (from start) */}
              <line
                x1={startCanvas.x}
                y1={startCanvas.y}
                x2={controlCanvas.x}
                y2={controlCanvas.y}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="2,2"
              />

              {/* Control point line (to end) */}
              <line
                x1={controlCanvas.x}
                y1={controlCanvas.y}
                x2={endCanvas.x}
                y2={endCanvas.y}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="2,2"
              />

              {/* Start point */}
              <circle
                cx={startCanvas.x}
                cy={startCanvas.y}
                r="8"
                fill="#10b981"
                stroke="#059669"
                strokeWidth="2"
              />
              <text
                x={startCanvas.x}
                y={startCanvas.y - 15}
                textAnchor="middle"
                className="text-xs font-bold fill-green-700"
              >
                IN
              </text>

              {/* End point */}
              <circle
                cx={endCanvas.x}
                cy={endCanvas.y}
                r="8"
                fill="#ef4444"
                stroke="#dc2626"
                strokeWidth="2"
              />
              <text
                x={endCanvas.x}
                y={endCanvas.y - 15}
                textAnchor="middle"
                className="text-xs font-bold fill-red-700"
              >
                OUT
              </text>

              {/* Control point */}
              <circle
                cx={controlCanvas.x}
                cy={controlCanvas.y}
                r="6"
                fill="#f59e0b"
                stroke="#d97706"
                strokeWidth="2"
              />
              <text
                x={controlCanvas.x}
                y={controlCanvas.y - 12}
                textAnchor="middle"
                className="text-xs font-bold fill-amber-700"
              >
                CP
              </text>

              {/* Current position (egg) */}
              <circle
                cx={currentCanvas.x}
                cy={currentCanvas.y}
                r="10"
                fill="#8b5cf6"
                stroke="#7c3aed"
                strokeWidth="2"
              />
              <text
                x={currentCanvas.x}
                y={currentCanvas.y + 5}
                textAnchor="middle"
                className="text-lg"
              >
                🥚
              </text>
            </svg>
          </div>

          {/* Info */}
          <div className="text-xs space-y-1 bg-background p-2 rounded">
            <p><strong>Punto Inicio:</strong> ({startX.toFixed(2)}, {startY.toFixed(2)})</p>
            <p><strong>Punto Control:</strong> ({controlX.toFixed(2)}, {controlY.toFixed(2)})</p>
            <p><strong>Punto Fin:</strong> ({endX.toFixed(2)}, {endY.toFixed(2)})</p>
            <p><strong>Posición Actual:</strong> ({currentPosition.x.toFixed(2)}, {currentPosition.y.toFixed(2)})</p>
            <p><strong>Progreso:</strong> {(progress * 100).toFixed(1)}%</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugPanel;
