import { useState } from "react";
import { Bug, X, Copy, Check, Layout, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTelegramUser, isTelegramWebApp } from "@/lib/telegram";
import { useTonWallet, useTonAddress } from "@tonconnect/ui-react";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


// Layout configuration interface
interface LayoutConfig {
  warehouse: { gridColumn: string; gridRow: string; minHeight: string };
  market: { gridColumn: string; gridRow: string; minHeight: string };
  leftCorrals: { gridColumn: string; gap: string; minHeight: string };
  rightCorrals: { gridColumn: string; gap: string; minHeight: string };
  belt: { gridColumn: string };
  grid: { gap: string; maxWidth: string };
}

const DebugPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const [position, setPosition] = useState({ x: 16, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const telegramUser = getTelegramUser();
  const wallet = useTonWallet();
  const address = useTonAddress();
  const isFromTelegram = isTelegramWebApp();

  // Load saved position on mount
  useState(() => {
    const savedPosition = localStorage.getItem('debugPanelPosition');
    if (savedPosition) {
      setPosition(JSON.parse(savedPosition));
    }
  });

  // Default layout configuration
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>({
    warehouse: { gridColumn: '1 / 7', gridRow: '1 / 4', minHeight: '240px' },
    market: { gridColumn: '20 / 26', gridRow: '1 / 4', minHeight: '240px' },
    leftCorrals: { gridColumn: '1 / 7', gap: '20px', minHeight: '260px' },
    rightCorrals: { gridColumn: '20 / 26', gap: '20px', minHeight: '260px' },
    belt: { gridColumn: '13 / 14' },
    grid: { gap: '20px', maxWidth: '1600px' },
  });

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

  const exportLayoutConfig = () => {
    const config = JSON.stringify(layoutConfig, null, 2);
    navigator.clipboard.writeText(config).then(() => {
      toast({
        title: "Layout exported",
        description: "Layout configuration has been copied to clipboard",
      });
    });
  };

  const downloadLayoutConfig = () => {
    const config = JSON.stringify(layoutConfig, null, 2);
    const blob = new Blob([config], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'layout-config.json';
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Layout downloaded",
      description: "Layout configuration has been downloaded",
    });
  };

  const updateLayoutField = (section: keyof LayoutConfig, field: string, value: string) => {
    setLayoutConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  // Save to localStorage when layout changes
  const saveLayout = () => {
    localStorage.setItem('debugLayoutConfig', JSON.stringify(layoutConfig));
    // Dispatch custom event for Home component to listen
    window.dispatchEvent(new CustomEvent('layoutConfigUpdate', { detail: layoutConfig }));
    toast({
      title: "Layout saved",
      description: "Layout configuration applied to the page",
    });
  };

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newX = Math.max(0, Math.min(window.innerWidth - 56, e.clientX - dragOffset.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 56, e.clientY - dragOffset.y));
      setPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      localStorage.setItem('debugPanelPosition', JSON.stringify(position));
    }
  };

  // Add/remove mouse event listeners
  useState(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  });

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        onMouseDown={handleMouseDown}
        size="icon"
        variant="outline"
        className="fixed z-40 rounded-full shadow-lg cursor-move"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
        title="Debug Panel (Drag to move)"
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
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info">Debug Info</TabsTrigger>
              <TabsTrigger value="layout">Layout Editor</TabsTrigger>
            </TabsList>
            
            <TabsContent value="info" className="space-y-4 mt-4">
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

            <TabsContent value="layout" className="space-y-4 mt-4">
              <div className="flex gap-2 mb-4">
                <Button onClick={saveLayout} className="flex-1">
                  <Layout className="h-4 w-4 mr-2" />
                  Apply Layout
                </Button>
                <Button onClick={exportLayoutConfig} variant="outline">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Config
                </Button>
                <Button onClick={downloadLayoutConfig} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>

              {/* Warehouse Config */}
              <div className="space-y-2 p-4 border rounded-lg">
                <h3 className="font-semibold text-sm">🏭 Warehouse</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Grid Column</Label>
                    <Input 
                      value={layoutConfig.warehouse.gridColumn}
                      onChange={(e) => updateLayoutField('warehouse', 'gridColumn', e.target.value)}
                      className="h-8 text-xs"
                      placeholder="1 / 7"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Grid Row</Label>
                    <Input 
                      value={layoutConfig.warehouse.gridRow}
                      onChange={(e) => updateLayoutField('warehouse', 'gridRow', e.target.value)}
                      className="h-8 text-xs"
                      placeholder="1 / 4"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Min Height</Label>
                    <Input 
                      value={layoutConfig.warehouse.minHeight}
                      onChange={(e) => updateLayoutField('warehouse', 'minHeight', e.target.value)}
                      className="h-8 text-xs"
                      placeholder="240px"
                    />
                  </div>
                </div>
              </div>

              {/* Market Config */}
              <div className="space-y-2 p-4 border rounded-lg">
                <h3 className="font-semibold text-sm">🏪 Market</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Grid Column</Label>
                    <Input 
                      value={layoutConfig.market.gridColumn}
                      onChange={(e) => updateLayoutField('market', 'gridColumn', e.target.value)}
                      className="h-8 text-xs"
                      placeholder="20 / 26"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Grid Row</Label>
                    <Input 
                      value={layoutConfig.market.gridRow}
                      onChange={(e) => updateLayoutField('market', 'gridRow', e.target.value)}
                      className="h-8 text-xs"
                      placeholder="1 / 4"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Min Height</Label>
                    <Input 
                      value={layoutConfig.market.minHeight}
                      onChange={(e) => updateLayoutField('market', 'minHeight', e.target.value)}
                      className="h-8 text-xs"
                      placeholder="240px"
                    />
                  </div>
                </div>
              </div>

              {/* Left Corrals Config */}
              <div className="space-y-2 p-4 border rounded-lg">
                <h3 className="font-semibold text-sm">🐔 Left Corrals</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Grid Column</Label>
                    <Input 
                      value={layoutConfig.leftCorrals.gridColumn}
                      onChange={(e) => updateLayoutField('leftCorrals', 'gridColumn', e.target.value)}
                      className="h-8 text-xs"
                      placeholder="1 / 7"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Gap</Label>
                    <Input 
                      value={layoutConfig.leftCorrals.gap}
                      onChange={(e) => updateLayoutField('leftCorrals', 'gap', e.target.value)}
                      className="h-8 text-xs"
                      placeholder="20px"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Min Height</Label>
                    <Input 
                      value={layoutConfig.leftCorrals.minHeight}
                      onChange={(e) => updateLayoutField('leftCorrals', 'minHeight', e.target.value)}
                      className="h-8 text-xs"
                      placeholder="260px"
                    />
                  </div>
                </div>
              </div>

              {/* Right Corrals Config */}
              <div className="space-y-2 p-4 border rounded-lg">
                <h3 className="font-semibold text-sm">🐔 Right Corrals</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Grid Column</Label>
                    <Input 
                      value={layoutConfig.rightCorrals.gridColumn}
                      onChange={(e) => updateLayoutField('rightCorrals', 'gridColumn', e.target.value)}
                      className="h-8 text-xs"
                      placeholder="20 / 26"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Gap</Label>
                    <Input 
                      value={layoutConfig.rightCorrals.gap}
                      onChange={(e) => updateLayoutField('rightCorrals', 'gap', e.target.value)}
                      className="h-8 text-xs"
                      placeholder="20px"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Min Height</Label>
                    <Input 
                      value={layoutConfig.rightCorrals.minHeight}
                      onChange={(e) => updateLayoutField('rightCorrals', 'minHeight', e.target.value)}
                      className="h-8 text-xs"
                      placeholder="260px"
                    />
                  </div>
                </div>
              </div>

              {/* Belt Config */}
              <div className="space-y-2 p-4 border rounded-lg">
                <h3 className="font-semibold text-sm">🎀 Conveyor Belt</h3>
                <div>
                  <Label className="text-xs">Grid Column</Label>
                  <Input 
                    value={layoutConfig.belt.gridColumn}
                    onChange={(e) => updateLayoutField('belt', 'gridColumn', e.target.value)}
                    className="h-8 text-xs"
                    placeholder="13 / 14"
                  />
                </div>
              </div>

              {/* Grid Config */}
              <div className="space-y-2 p-4 border rounded-lg">
                <h3 className="font-semibold text-sm">📐 Grid Settings</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Gap</Label>
                    <Input 
                      value={layoutConfig.grid.gap}
                      onChange={(e) => updateLayoutField('grid', 'gap', e.target.value)}
                      className="h-8 text-xs"
                      placeholder="20px"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Max Width</Label>
                    <Input 
                      value={layoutConfig.grid.maxWidth}
                      onChange={(e) => updateLayoutField('grid', 'maxWidth', e.target.value)}
                      className="h-8 text-xs"
                      placeholder="1600px"
                    />
                  </div>
                </div>
              </div>

              {/* Export Code */}
              <div className="space-y-2 p-4 border rounded-lg bg-muted">
                <h3 className="font-semibold text-sm">📋 Configuration JSON</h3>
                <pre className="text-xs overflow-auto max-h-40 p-2 bg-background rounded">
                  {JSON.stringify(layoutConfig, null, 2)}
                </pre>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default DebugPanel;
