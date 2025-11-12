import { useState, useEffect } from "react";
import { Bug, X, Copy, Check, Layout, Plus, RotateCcw, Palette, AlertCircle } from "lucide-react";
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
  
  // Skins tab state
  const [userId, setUserId] = useState<string | null>(null);
  const [skinsLogs, setSkinsLogs] = useState<Array<{ timestamp: string; level: string; message: string; error?: any }>>([]);
  
  // Function to add logs (defined before use)
  const addSkinLog = (level: string, message: string, error?: any) => {
    setSkinsLogs(prev => [...prev.slice(-49), {
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      error: error ? (error.message || JSON.stringify(error)) : undefined
    }]);
  };
  
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
      addSkinLog('error', e.detail?.message || 'Unknown error', e.detail?.error);
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
    window.addEventListener('layoutConfigUpdate', onLayoutUpdate as any);
    window.addEventListener('layoutEditModeChange', onEditChange as any);
    window.addEventListener('beltDebugInfo', onBeltDebugInfo as any);
    window.addEventListener('paintModeClick', onPaintModeClick as any);
    return () => {
      window.removeEventListener('layoutConfigUpdate', onLayoutUpdate as any);
      window.removeEventListener('layoutEditModeChange', onEditChange as any);
      window.removeEventListener('beltDebugInfo', onBeltDebugInfo as any);
      window.removeEventListener('paintModeClick', onPaintModeClick as any);
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
    toast({
      title: next ? t('layoutEditor.editModeActivated') : t('layoutEditor.editModeDeactivated'),
      description: next ? t('layoutEditor.editDescription') : t('layoutEditor.changesSaved'),
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="layout">
                <Layout className="h-4 w-4 mr-2" />
                Layout
              </TabsTrigger>
              <TabsTrigger value="skins">
                <Palette className="h-4 w-4 mr-2" />
                Skins
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
                        <li>relativeX: {paintModeClickInfo.relativeX.toFixed(2)}</li>
                        <li>relativeY: {paintModeClickInfo.relativeY.toFixed(2)}</li>
                      </ul>
                    </div>
                    <div className="border-t pt-2">
                      <p><strong>Dimensiones de celda:</strong></p>
                      <ul className="text-xs mt-1 space-y-1">
                        <li>cellWidth: {paintModeClickInfo.cellWidth.toFixed(2)}</li>
                        <li>cellHeight: {paintModeClickInfo.cellHeight.toFixed(2)}</li>
                        <li>gapPx: {paintModeClickInfo.gapPx}</li>
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

              {/* Owned Skins */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">💎 Owned Skins</h3>
                <div className="bg-muted p-3 rounded-md space-y-2 text-sm">
                  {userItems && userItems.length > 0 ? (
                    <div className="space-y-1">
                      {userItems
                        .filter((item: any) => item.item_type === 'skin')
                        .map((item: any) => (
                          <div key={item.id} className="border-b pb-1 last:border-0">
                            <p><strong>{item.item_key}</strong> (x{item.quantity})</p>
                            <p className="text-xs text-muted-foreground">
                              Acquired: {new Date(item.acquired_at).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                      {userItems.filter((item: any) => item.item_type === 'skin').length === 0 && (
                        <p className="text-muted-foreground">No owned skins</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No items found</p>
                  )}
                </div>
              </div>

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
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default DebugPanel;
