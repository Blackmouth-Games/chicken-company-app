import { TonConnectButton, useTonWallet } from "@tonconnect/ui-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet as WalletIcon } from "lucide-react";

const Wallet = () => {
  const wallet = useTonWallet();

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Wallet</h1>
          <p className="text-muted-foreground">
            Connect your TON wallet to start playing
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <WalletIcon className="w-5 h-5" />
              TON Wallet Connection
            </CardTitle>
            <CardDescription>
              {wallet 
                ? "Your wallet is connected" 
                : "Connect your wallet to authenticate and play"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <TonConnectButton />
            </div>
            
            {wallet && (
              <div className="mt-6 p-4 bg-primary/10 rounded-lg">
                <p className="text-sm font-medium mb-2">Wallet Info:</p>
                <p className="text-xs text-muted-foreground break-all">
                  {wallet.account.address}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Chain: {wallet.account.chain}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {!wallet && (
          <Card className="border-primary/50">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Don't have a TON wallet yet?
                </p>
                <p className="text-xs text-muted-foreground">
                  Download Tonkeeper or another TON wallet to get started
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Wallet;
