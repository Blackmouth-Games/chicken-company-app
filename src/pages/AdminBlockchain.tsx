import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, RefreshCw, Settings, Network, Link2, ExternalLink } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useNavigate } from "react-router-dom";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminLayout } from "@/components/AdminLayout";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface ContractInfo {
  address: string;
  owner: string;
  currentEpoch: number;
  network: 'testnet' | 'mainnet';
  chain: 'ton' | 'sol';
  status: 'active' | 'inactive' | 'error';
  lastVerified?: string;
}

interface BlockchainConfig {
  chain: 'ton' | 'sol';
  network: 'testnet' | 'mainnet';
  contractAddress: string;
  ownerAddress: string;
}

// Configuración de contratos desplegados
const CONTRACT_ADDRESSES: Record<string, Record<string, string>> = {
  ton: {
    testnet: 'EQDEnTBYm8p9JbQ6jdlfqp1DwMYGUtsYSafrvQxl65cU93rt',
    mainnet: '', // TODO: Configurar cuando se despliegue en mainnet
  },
  sol: {
    testnet: '', // TODO: Configurar cuando se despliegue en Solana testnet
    mainnet: '', // TODO: Configurar cuando se despliegue en Solana mainnet
  },
};

const OWNER_ADDRESSES: Record<string, Record<string, string>> = {
  ton: {
    testnet: 'UQCXgTzQlsYDSmL7fIHRQruX04fYhst_JrQifmUkRUyvUSlo',
    mainnet: '', // TODO: Configurar antes del despliegue en mainnet
  },
  sol: {
    testnet: '',
    mainnet: '',
  },
};

export const AdminBlockchain = () => {
  const { user, isAdmin, loading: authLoading } = useAdminAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [config, setConfig] = useState<BlockchainConfig>({
    chain: 'ton',
    network: 'testnet',
    contractAddress: CONTRACT_ADDRESSES.ton.testnet,
    ownerAddress: OWNER_ADDRESSES.ton.testnet,
  });
  const [contractInfo, setContractInfo] = useState<ContractInfo | null>(null);

  // Redirect to login if not authenticated or not admin
  useEffect(() => {
    if (!authLoading && (!user || isAdmin === false)) {
      navigate("/admin/login");
    }
  }, [authLoading, user, isAdmin, navigate]);

  // Cargar configuración guardada (si existe)
  useEffect(() => {
    loadSavedConfig();
  }, []);

  const loadSavedConfig = async () => {
    try {
      // Intentar cargar configuración guardada desde localStorage o Supabase
      const saved = localStorage.getItem('blockchain_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        setConfig(parsed);
      }
    } catch (e) {
      console.error('Error loading saved config:', e);
    }
  };

  const saveConfig = () => {
    try {
      localStorage.setItem('blockchain_config', JSON.stringify(config));
      toast({
        title: "Configuración guardada",
        description: "La configuración de blockchain ha sido guardada.",
      });
    } catch (e) {
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración.",
        variant: "destructive",
      });
    }
  };

  const verifyContract = async () => {
    if (!config.contractAddress) {
      toast({
        title: "Error",
        description: "Debes configurar la dirección del contrato primero.",
        variant: "destructive",
      });
      return;
    }

    setVerifying(true);
    try {
      // Llamar a una Edge Function que verifique el contrato
      // Por ahora, simulamos la verificación con datos básicos
      const response = await fetch(
        `https://testnet.tonapi.io/v2/accounts/${config.contractAddress}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('No se pudo verificar el contrato');
      }

      const data = await response.json();
      
      setContractInfo({
        address: config.contractAddress,
        owner: config.ownerAddress,
        currentEpoch: 0, // Se obtendría del contrato
        network: config.network,
        chain: config.chain,
        status: data.status === 'active' ? 'active' : 'inactive',
        lastVerified: new Date().toISOString(),
      });

      toast({
        title: "Contrato verificado",
        description: `El contrato está ${data.status === 'active' ? 'activo' : 'inactivo'}.`,
      });
    } catch (error: any) {
      console.error('Error verifying contract:', error);
      toast({
        title: "Error al verificar",
        description: error.message || "No se pudo verificar el contrato.",
        variant: "destructive",
      });
      
      setContractInfo({
        address: config.contractAddress,
        owner: config.ownerAddress,
        currentEpoch: 0,
        network: config.network,
        chain: config.chain,
        status: 'error',
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleChainChange = (chain: 'ton' | 'sol') => {
    const newConfig = {
      ...config,
      chain,
      contractAddress: CONTRACT_ADDRESSES[chain][config.network] || '',
      ownerAddress: OWNER_ADDRESSES[chain][config.network] || '',
    };
    setConfig(newConfig);
  };

  const handleNetworkChange = (network: 'testnet' | 'mainnet') => {
    const newConfig = {
      ...config,
      network,
      contractAddress: CONTRACT_ADDRESSES[config.chain][network] || '',
      ownerAddress: OWNER_ADDRESSES[config.chain][network] || '',
    };
    setConfig(newConfig);
  };

  if (authLoading) {
    return <LoadingScreen message="Verificando acceso..." />;
  }

  if (!user || isAdmin === false) {
    return <LoadingScreen message="Redirigiendo..." />;
  }

  const explorerUrl = config.network === 'testnet' 
    ? `https://testnet.tonscan.org/address/${config.contractAddress}`
    : `https://tonscan.org/address/${config.contractAddress}`;

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Gestión de Blockchain</h1>
          <p className="text-muted-foreground mt-1">
            Configuración y validación de contratos inteligentes
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configuración */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuración
              </CardTitle>
              <CardDescription>
                Configura la cadena y red que deseas usar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="chain">Cadena (Chain)</Label>
                <Select
                  value={config.chain}
                  onValueChange={(value) => handleChainChange(value as 'ton' | 'sol')}
                >
                  <SelectTrigger id="chain">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ton">TON</SelectItem>
                    <SelectItem value="sol">Solana</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="network">Red (Network)</Label>
                <Select
                  value={config.network}
                  onValueChange={(value) => handleNetworkChange(value as 'testnet' | 'mainnet')}
                >
                  <SelectTrigger id="network">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="testnet">Testnet</SelectItem>
                    <SelectItem value="mainnet">Mainnet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contractAddress">Dirección del Contrato</Label>
                <Input
                  id="contractAddress"
                  value={config.contractAddress}
                  onChange={(e) => setConfig({ ...config, contractAddress: e.target.value })}
                  placeholder="EQ..."
                />
                <p className="text-xs text-muted-foreground">
                  Dirección del contrato Distributor desplegado
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ownerAddress">Dirección del Owner</Label>
                <Input
                  id="ownerAddress"
                  value={config.ownerAddress}
                  onChange={(e) => setConfig({ ...config, ownerAddress: e.target.value })}
                  placeholder="UQ..."
                />
                <p className="text-xs text-muted-foreground">
                  Wallet del owner del contrato (multisig recomendado)
                </p>
              </div>

              <Button onClick={saveConfig} className="w-full">
                Guardar Configuración
              </Button>
            </CardContent>
          </Card>

          {/* Verificación del Contrato */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Verificación del Contrato
              </CardTitle>
              <CardDescription>
                Verifica el estado del contrato en la blockchain
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {contractInfo && (
                <div className="space-y-3 p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Estado:</span>
                    <Badge
                      variant={
                        contractInfo.status === 'active'
                          ? 'default'
                          : contractInfo.status === 'error'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {contractInfo.status === 'active' ? 'Activo' : 
                       contractInfo.status === 'error' ? 'Error' : 'Inactivo'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Red:</span>
                    <Badge variant="outline">
                      {contractInfo.network === 'testnet' ? 'Testnet' : 'Mainnet'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Cadena:</span>
                    <Badge variant="outline">{contractInfo.chain.toUpperCase()}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Epoch Actual:</span>
                    <span className="text-sm">{contractInfo.currentEpoch}</span>
                  </div>
                  {contractInfo.lastVerified && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Última Verificación:</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(contractInfo.lastVerified).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <Button
                onClick={verifyContract}
                disabled={verifying || !config.contractAddress}
                className="w-full"
              >
                {verifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Verificar Contrato
                  </>
                )}
              </Button>

              {config.contractAddress && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(explorerUrl, '_blank')}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Ver en Explorador
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Información Adicional */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Información de Red
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Endpoints de {config.network === 'testnet' ? 'Testnet' : 'Mainnet'}</Label>
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {config.chain === 'ton' ? (
                    <>
                      <p>• {config.network === 'testnet' ? 'https://testnet.toncenter.com' : 'https://toncenter.com'}</p>
                      <p>• {config.network === 'testnet' ? 'https://testnet.tonapi.io' : 'https://tonapi.io'}</p>
                    </>
                  ) : (
                    <>
                      <p>• {config.network === 'testnet' ? 'https://api.testnet.solana.com' : 'https://api.mainnet-beta.solana.com'}</p>
                    </>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Contrato Distributor</Label>
                <div className="mt-2 space-y-1">
                  <p className="text-sm font-mono break-all">{config.contractAddress || 'No configurado'}</p>
                  <p className="text-xs text-muted-foreground">
                    Este contrato gestiona la distribución de recompensas usando Merkle trees
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

