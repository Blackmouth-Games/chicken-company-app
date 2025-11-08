import { useState } from "react";
import { Bug, X, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTelegramUser, isTelegramWebApp } from "@/lib/telegram";
import { useTonWallet, useTonAddress } from "@tonconnect/ui-react";
import { toast } from "@/hooks/use-toast";

const DebugPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const telegramUser = getTelegramUser();
  const wallet = useTonWallet();
  const address = useTonAddress();
  const isFromTelegram = isTelegramWebApp();

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
        </CardContent>
      </Card>
    </div>
  );
};

export default DebugPanel;
