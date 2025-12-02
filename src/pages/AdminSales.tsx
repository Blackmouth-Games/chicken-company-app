import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, TrendingUp, DollarSign, ShoppingCart, Building2, Calendar, Filter } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useNavigate } from "react-router-dom";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminLayout } from "@/components/AdminLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface BuildingPurchase {
  id: string;
  user_id: string;
  building_type: string;
  level: number;
  price_ton: number;
  status: string;
  created_at: string;
  completed_at: string | null;
  transaction_hash: string | null;
  wallet_address: string | null;
}

interface StorePurchase {
  id: string;
  user_id: string;
  product_key: string;
  price_ton: number;
  status: string;
  created_at: string;
  completed_at: string | null;
  transaction_hash: string | null;
  wallet_address: string | null;
}

interface SalesMetrics {
  totalRevenue: number;
  totalSales: number;
  buildingSales: number;
  storeSales: number;
  completedSales: number;
  pendingSales: number;
  avgSaleValue: number;
  revenueByDay: Array<{ date: string; revenue: number; count: number }>;
  revenueByType: Record<string, number>;
}

export const AdminSales = () => {
  const { user, isAdmin, loading: authLoading } = useAdminAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<SalesMetrics | null>(null);
  const [buildingPurchases, setBuildingPurchases] = useState<BuildingPurchase[]>([]);
  const [storePurchases, setStorePurchases] = useState<StorePurchase[]>([]);
  const [dateRange, setDateRange] = useState<'7days' | '30days' | '90days' | 'all'>('30days');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending' | 'failed' | 'cancelled'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'buildings' | 'store'>('all');
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && user && isAdmin === true) {
      loadSalesData();
    }
  }, [authLoading, user, isAdmin, dateRange]);

  useEffect(() => {
    if (!authLoading && (!user || isAdmin === false)) {
      navigate("/admin/login");
    }
  }, [authLoading, user, isAdmin, navigate]);

  const loadSalesData = async () => {
    setLoading(true);
    try {
      // Calculate date range
      const now = new Date();
      let startDate: Date | null = null;
      
      switch (dateRange) {
        case '7days':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30days':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90days':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'all':
          startDate = null;
          break;
      }

      // Load building purchases
      let buildingQuery = supabase
        .from("building_purchases")
        .select("*")
        .order("created_at", { ascending: false });

      if (startDate) {
        buildingQuery = buildingQuery.gte("created_at", startDate.toISOString());
      }

      const { data: buildingData, error: buildingError } = await buildingQuery;

      if (buildingError) throw buildingError;

      // Load store purchases
      let storeQuery = supabase
        .from("store_purchases")
        .select("*")
        .order("created_at", { ascending: false });

      if (startDate) {
        storeQuery = storeQuery.gte("created_at", startDate.toISOString());
      }

      const { data: storeData, error: storeError } = await storeQuery;

      if (storeError) throw storeError;

      setBuildingPurchases(buildingData || []);
      setStorePurchases(storeData || []);

      // Calculate metrics
      const allPurchases = [
        ...(buildingData || []).map(b => ({ ...b, type: 'building' as const })),
        ...(storeData || []).map(s => ({ ...s, type: 'store' as const })),
      ];

      const completedPurchases = allPurchases.filter(p => p.status === 'completed');
      const totalRevenue = completedPurchases.reduce((sum, p) => sum + (p.price_ton || 0), 0);
      const totalSales = allPurchases.length;
      const buildingSales = buildingData?.length || 0;
      const storeSales = storeData?.length || 0;
      const completedSales = completedPurchases.length;
      const pendingSales = allPurchases.filter(p => p.status === 'pending').length;
      const avgSaleValue = completedSales > 0 ? totalRevenue / completedSales : 0;

      // Revenue by day
      const revenueByDayMap: Record<string, { revenue: number; count: number }> = {};
      completedPurchases.forEach(purchase => {
        const date = new Date(purchase.completed_at || purchase.created_at).toISOString().split('T')[0];
        if (!revenueByDayMap[date]) {
          revenueByDayMap[date] = { revenue: 0, count: 0 };
        }
        revenueByDayMap[date].revenue += purchase.price_ton || 0;
        revenueByDayMap[date].count += 1;
      });

      const revenueByDay = Object.entries(revenueByDayMap)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Revenue by type
      const revenueByType: Record<string, number> = {};
      completedPurchases.forEach(purchase => {
        if (purchase.type === 'building') {
          const buildingPurchase = purchase as BuildingPurchase & { type: 'building' };
          const key = `${buildingPurchase.building_type}_${buildingPurchase.level}`;
          revenueByType[key] = (revenueByType[key] || 0) + (buildingPurchase.price_ton || 0);
        } else {
          const storePurchase = purchase as StorePurchase & { type: 'store' };
          revenueByType[storePurchase.product_key] = (revenueByType[storePurchase.product_key] || 0) + (storePurchase.price_ton || 0);
        }
      });

      setMetrics({
        totalRevenue,
        totalSales,
        buildingSales,
        storeSales,
        completedSales,
        pendingSales,
        avgSaleValue,
        revenueByDay,
        revenueByType,
      });
    } catch (error: any) {
      console.error("Error loading sales data:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de ventas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredBuildingPurchases = buildingPurchases.filter(p => {
    if (typeFilter !== 'all' && typeFilter !== 'buildings') return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    return true;
  });

  const filteredStorePurchases = storePurchases.filter(p => {
    if (typeFilter !== 'all' && typeFilter !== 'store') return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    return true;
  });

  const maxRevenue = metrics?.revenueByDay.length ? Math.max(...metrics.revenueByDay.map(d => d.revenue)) : 0;

  if (authLoading) {
    return <LoadingScreen message="Verificando permisos..." />;
  }

  if (!user || isAdmin === false) {
    return <LoadingScreen message="Redirigiendo..." />;
  }

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Métricas de Ventas</h1>
          <p className="text-muted-foreground mt-1">Análisis de ventas y transacciones</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : metrics ? (
          <div className="space-y-6">
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.totalRevenue.toFixed(3)} TON</div>
                  <p className="text-xs text-muted-foreground">
                    {metrics.completedSales} ventas completadas
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Ventas</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.totalSales}</div>
                  <p className="text-xs text-muted-foreground">
                    {metrics.buildingSales} edificios, {metrics.storeSales} productos
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.avgSaleValue.toFixed(3)} TON</div>
                  <p className="text-xs text-muted-foreground">
                    Por venta completada
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.pendingSales}</div>
                  <p className="text-xs text-muted-foreground">
                    Transacciones pendientes
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Filtros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Período:</span>
                    <div className="flex gap-2">
                      {(['7days', '30days', '90days', 'all'] as const).map(range => (
                        <Button
                          key={range}
                          variant={dateRange === range ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setDateRange(range)}
                        >
                          {range === '7days' ? '7 días' : range === '30days' ? '30 días' : range === '90days' ? '90 días' : 'Todos'}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Estado:</span>
                    <div className="flex gap-2">
                      {(['all', 'completed', 'pending', 'failed', 'cancelled'] as const).map(status => (
                        <Button
                          key={status}
                          variant={statusFilter === status ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setStatusFilter(status)}
                        >
                          {status === 'all' ? 'Todos' : status === 'completed' ? 'Completadas' : status === 'pending' ? 'Pendientes' : status === 'failed' ? 'Fallidas' : 'Canceladas'}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Tipo:</span>
                    <div className="flex gap-2">
                      {(['all', 'buildings', 'store'] as const).map(type => (
                        <Button
                          key={type}
                          variant={typeFilter === type ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setTypeFilter(type)}
                        >
                          {type === 'all' ? 'Todos' : type === 'buildings' ? 'Edificios' : 'Tienda'}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Ingresos por Día</CardTitle>
                <CardDescription>Evolución de ingresos en el período seleccionado</CardDescription>
              </CardHeader>
              <CardContent>
                {metrics.revenueByDay.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay datos de ingresos en el período seleccionado
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-end gap-2 h-64">
                      {metrics.revenueByDay.map((day) => (
                        <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                          <div className="w-full flex flex-col items-center justify-end h-full">
                            <div
                              className="w-full bg-primary rounded-t transition-all hover:bg-primary/80 relative group"
                              style={{
                                height: `${maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0}%`,
                                minHeight: day.revenue > 0 ? '4px' : '0',
                              }}
                            >
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                                {day.revenue.toFixed(3)} TON
                                <br />
                                {day.count} ventas
                              </div>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground transform -rotate-45 origin-top-left whitespace-nowrap">
                            {new Date(day.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sales List */}
            <Card>
              <CardHeader>
                <CardTitle>Listado de Ventas</CardTitle>
                <CardDescription>
                  {filteredBuildingPurchases.length + filteredStorePurchases.length} ventas encontradas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Producto/Edificio</TableHead>
                        <TableHead>Precio</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Transacción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBuildingPurchases.map((purchase) => (
                        <TableRow key={purchase.id}>
                          <TableCell>
                            <Badge variant="secondary">
                              <Building2 className="h-3 w-3 mr-1" />
                              Edificio
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium capitalize">{purchase.building_type}</span>
                              <span className="text-xs text-muted-foreground">Nivel {purchase.level}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold">{purchase.price_ton.toFixed(3)} TON</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                purchase.status === 'completed' ? 'default' :
                                purchase.status === 'pending' ? 'secondary' :
                                'destructive'
                              }
                            >
                              {purchase.status === 'completed' ? 'Completada' :
                               purchase.status === 'pending' ? 'Pendiente' :
                               purchase.status === 'failed' ? 'Fallida' :
                               purchase.status === 'cancelled' ? 'Cancelada' : purchase.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(purchase.created_at).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {purchase.transaction_hash ? (
                              <span className="text-green-600">{purchase.transaction_hash.substring(0, 8)}...</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredStorePurchases.map((purchase) => (
                        <TableRow key={purchase.id}>
                          <TableCell>
                            <Badge variant="outline">
                              <ShoppingCart className="h-3 w-3 mr-1" />
                              Tienda
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{purchase.product_key}</span>
                          </TableCell>
                          <TableCell className="font-semibold">{purchase.price_ton.toFixed(3)} TON</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                purchase.status === 'completed' ? 'default' :
                                purchase.status === 'pending' ? 'secondary' :
                                'destructive'
                              }
                            >
                              {purchase.status === 'completed' ? 'Completada' :
                               purchase.status === 'pending' ? 'Pendiente' :
                               purchase.status === 'failed' ? 'Fallida' :
                               purchase.status === 'cancelled' ? 'Cancelada' : purchase.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(purchase.created_at).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {purchase.transaction_hash ? (
                              <span className="text-green-600">{purchase.transaction_hash.substring(0, 8)}...</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredBuildingPurchases.length === 0 && filteredStorePurchases.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No se encontraron ventas con los filtros seleccionados
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No se pudieron cargar las métricas
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

