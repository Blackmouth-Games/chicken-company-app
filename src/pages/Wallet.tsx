import { TonConnectButton, useTonWallet } from "@tonconnect/ui-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet as WalletIcon, ArrowUpDown } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getTelegramUser } from "@/lib/telegram";

const Wallet = () => {
  const wallet = useTonWallet();
  const telegramUser = getTelegramUser();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, [telegramUser]);

  const loadTransactions = async () => {
    if (!telegramUser?.id) return;
    
    setLoading(true);
    try {
      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("telegram_id", telegramUser.id)
        .single();

      if (!profile) {
        setLoading(false);
        return;
      }

      // Get building purchases (transactions)
      const { data, error } = await supabase
        .from("building_purchases")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      completed: "bg-green-500/10 text-green-500",
      pending: "bg-yellow-500/10 text-yellow-500",
      failed: "bg-red-500/10 text-red-500",
    };
    return statusColors[status as keyof typeof statusColors] || statusColors.pending;
  };

  return (
    <div className="min-h-screen bg-background p-6 pb-24">
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
            {wallet && (
              <div className="p-4 bg-primary/10 rounded-lg">
                <p className="text-sm font-medium mb-2">Wallet Info:</p>
                <p className="text-xs text-muted-foreground break-all">
                  {wallet.account.address}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Chain: {wallet.account.chain}
                </p>
              </div>
            )}
            
            <div className="flex justify-center">
              <TonConnectButton />
            </div>
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

        {/* Transactions Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpDown className="w-5 h-5" />
              Transaction History
            </CardTitle>
            <CardDescription>
              Your building purchases and payments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading transactions...
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No transactions yet
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">
                          {tx.building_type.charAt(0).toUpperCase() + tx.building_type.slice(1)} - Level {tx.level}
                        </p>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(tx.status)}`}
                        >
                          {tx.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(tx.created_at)}
                      </p>
                      {tx.transaction_hash && (
                        <p className="text-xs text-muted-foreground mt-1 break-all">
                          TX: {tx.transaction_hash.slice(0, 10)}...{tx.transaction_hash.slice(-8)}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{tx.price_ton} TON</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Wallet;
