import { useState, useEffect } from "react";
import { Bug, X, Copy, Check, Layout, Plus, RotateCcw, Palette, AlertCircle, Snowflake } from "lucide-react";
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
  
  const { buildings } = useUserBuildings(userId || undefined);
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
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="layout">
                <Layout className="h-4 w-4 mr-2" />
                Layout
              </TabsTrigger>
              <TabsTrigger value="skins">
                <Palette className="h-4 w-4 mr-2" />
                Skins
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
              {/* Egg System Debug */}
              {eggDebugInfo && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">🥚 Egg System</h3>
                  <div className="bg-muted p-3 rounded-md space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <p><strong>Total Eggs:</strong> {eggDebugInfo.totalEggs ?? 0} / {eggDebugInfo.maxEggs ?? 0}</p>
                      <p><strong>Base Interval:</strong> {eggDebugInfo.baseSpawnInterval ? (eggDebugInfo.baseSpawnInterval / 1000).toFixed(1) : 'N/A'}s</p>
                      <p><strong>Total Corrals:</strong> {eggDebugInfo.totalCorrals || eggDebugInfo.corrals || 0}</p>
                      <p><strong>With Belts:</strong> {eggDebugInfo.corralsWithBelts || 0}</p>
                      <p><strong>Without Belts:</strong> {eggDebugInfo.corralsWithoutBelts || 0}</p>
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
                                      <p>Corral ID: {spawn.corralId ? (typeof spawn.corralId === 'string' ? spawn.corralId.slice(0, 12) : String(spawn.corralId).slice(0, 12)) : 'N/A'}...</p>
                                      <p>Nivel: {spawn.level ?? 'N/A'} | Intervalo: {spawn.spawnInterval ? (spawn.spawnInterval / 1000).toFixed(1) : 'N/A'}s</p>
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
                                            <p>Slot Position: {spawn.beltSlotPosition}</p>
                                          )}
                                        </>
                                      ) : (
                                        <p className="text-red-600">❌ NO tiene cinta asignada</p>
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
                  </div>
                </div>
              )}

              {/* Vehicle System Debug */}
              {vehicleDebugInfo ? (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">🚚 Vehicle System</h3>
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
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default DebugPanel;
