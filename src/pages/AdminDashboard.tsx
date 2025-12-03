import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, Building2, ShoppingCart, TrendingUp, DollarSign, Package, BarChart3, Download, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useNavigate } from "react-router-dom";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useMetricsDashboard } from "@/hooks/useMetricsDashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminLayout } from "@/components/AdminLayout";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface AppMetrics {
  totalUsers: number;
  totalBuildings: number;
  totalCoops: number;
  totalWarehouses: number;
  totalMarkets: number;
  totalPurchases: number;
  totalRevenue: number;
  totalChickens: number;
  avgBuildingsPerUser: number;
  buildingsByLevel: Record<number, number>;
  buildingsByType: Record<string, number>;
  buildingsByTypeAndLevel?: Record<string, Record<number, number>>;
  recentUsers: number; // Last 7 days
  recentPurchases: number; // Last 7 days
}

interface DailyMetric {
  date: string;
  metric_type: string;
  metric_value: number;
  metadata?: any;
}

export const AdminDashboard = () => {
  const { user, isAdmin, loading: authLoading } = useAdminAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<AppMetrics | null>(null);
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedBuildingTypes, setSelectedBuildingTypes] = useState<Record<string, boolean>>({
    coop: true,
    warehouse: true,
    market: true,
  });
  const [historyStartDate, setHistoryStartDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [historyEndDate, setHistoryEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize] = useState(10);
  const { toast } = useToast();
  const { stats, isLoading: metricsLoading } = useMetricsDashboard(30);

  // Redirect to login if not authenticated or not admin
  useEffect(() => {
    if (!authLoading && (!user || isAdmin === false)) {
      navigate("/admin/login");
    }
  }, [authLoading, user, isAdmin, navigate]);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      // Get total users
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Get total buildings
      const { count: totalBuildings } = await supabase
        .from("user_buildings")
        .select("*", { count: "exact", head: true });

      // Get buildings by type
      const { data: buildingsData } = await supabase
        .from("user_buildings")
        .select("building_type, level, current_chickens");

      // Get total chickens
      const totalChickens = buildingsData?.reduce((sum, b) => sum + (b.current_chickens || 0), 0) || 0;

      // Get total purchases
      const { count: totalPurchases } = await supabase
        .from("building_purchases")
        .select("*", { count: "exact", head: true });

      // Get revenue (sum of all completed purchases)
      const { data: purchasesData } = await supabase
        .from("building_purchases")
        .select("price_ton, status")
        .eq("status", "completed");

      // Get recent users (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { count: recentUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo.toISOString());

      // Get recent purchases (last 7 days)
      const { count: recentPurchases } = await supabase
        .from("building_purchases")
        .select("*", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo.toISOString());

      // Calculate buildings by type
      const buildingsByType: Record<string, number> = {};
      const buildingsByTypeAndLevel: Record<string, Record<number, number>> = {};
      
      buildingsData?.forEach((building) => {
        buildingsByType[building.building_type] = (buildingsByType[building.building_type] || 0) + 1;
        
        if (!buildingsByTypeAndLevel[building.building_type]) {
          buildingsByTypeAndLevel[building.building_type] = {};
        }
        buildingsByTypeAndLevel[building.building_type][building.level] = 
          (buildingsByTypeAndLevel[building.building_type][building.level] || 0) + 1;
      });

      // Calculate revenue
      const totalRevenue = purchasesData?.reduce((sum, p) => sum + (p.price_ton || 0), 0) || 0;

      // Calculate average buildings per user
      const avgBuildingsPerUser = totalUsers && totalUsers > 0 
        ? (totalBuildings || 0) / totalUsers 
        : 0;

      setMetrics({
        totalUsers: totalUsers || 0,
        totalBuildings: totalBuildings || 0,
        totalCoops: buildingsByType["coop"] || 0,
        totalWarehouses: buildingsByType["warehouse"] || 0,
        totalMarkets: buildingsByType["market"] || 0,
        totalPurchases: totalPurchases || 0,
        totalRevenue,
        totalChickens,
        avgBuildingsPerUser: Math.round(avgBuildingsPerUser * 100) / 100,
        buildingsByLevel: {}, // Deprecated, using buildingsByTypeAndLevel instead
        buildingsByType,
        buildingsByTypeAndLevel: buildingsByTypeAndLevel,
        recentUsers: recentUsers || 0,
        recentPurchases: recentPurchases || 0,
      } as any);
    } catch (error: any) {
      console.error("Error loading metrics:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las métricas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDailyMetrics = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("daily_metrics")
        .select("*")
        .gte("date", historyStartDate)
        .lte("date", historyEndDate)
        .order("date", { ascending: false });

      if (error) throw error;
      setDailyMetrics(data || []);
      setHistoryPage(1); // Reset to first page
    } catch (error: any) {
      console.error("Error loading daily metrics:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las métricas históricas",
        variant: "destructive",
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  const downloadHistoryCSV = () => {
    const headers = ['Fecha', 'Tipo Métrica', 'Valor', 'Metadata'];
    const rows: string[][] = [];

    dailyMetrics.forEach(metric => {
      rows.push([
        metric.date,
        metric.metric_type,
        metric.metric_value.toString(),
        JSON.stringify(metric.metadata || {}),
      ]);
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `metricas_historicas_${historyStartDate}_${historyEndDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadHistoryJSON = () => {
    const data = {
      exportDate: new Date().toISOString(),
      dateRange: {
        start: historyStartDate,
        end: historyEndDate,
      },
      metrics: dailyMetrics,
    };

    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `metricas_historicas_${historyStartDate}_${historyEndDate}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (!authLoading && user && isAdmin === true) {
      loadMetrics();
      loadDailyMetrics();
    }
  }, [authLoading, user, isAdmin]);

  useEffect(() => {
    if (!authLoading && user && isAdmin === true) {
      loadDailyMetrics();
    }
  }, [historyStartDate, historyEndDate]);

  // Show loading while checking auth
  if (authLoading) {
    return <LoadingScreen message="Verificando permisos..." />;
  }

  // Don't render if not authenticated or not admin (redirect will happen in useEffect)
  if (!user || isAdmin === false) {
    return <LoadingScreen message="Redirigiendo..." />;
  }

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Panel de Administración</h1>
          <p className="text-muted-foreground mt-1">Métricas y estadísticas de la aplicación</p>
        </div>

      {loading || metricsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : metrics ? (
        <div className="space-y-6">
          {/* Main Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalUsers.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.recentUsers} nuevos en los últimos 7 días
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Edificios</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalBuildings.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Promedio: {metrics.avgBuildingsPerUser} por usuario
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Gallinas</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalChickens.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  En todos los coops
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Compras</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalPurchases.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.recentPurchases} en los últimos 7 días
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalRevenue.toFixed(3)} TON</div>
                <p className="text-xs text-muted-foreground">
                  De compras completadas
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Buildings Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Edificios por Tipo</CardTitle>
                <CardDescription>Distribución de edificios en la aplicación</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Coops</span>
                    </div>
                    <span className="font-semibold">{metrics.totalCoops}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">Almacenes</span>
                    </div>
                    <span className="font-semibold">{metrics.totalWarehouses}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-orange-600" />
                      <span className="text-sm">Mercados</span>
                    </div>
                    <span className="font-semibold">{metrics.totalMarkets}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Edificios por Tipo y Nivel</CardTitle>
                <CardDescription>Distribución de niveles por tipo de edificio</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Building Type Filters */}
                  <div className="space-y-2 pb-3 border-b">
                    <Label className="text-sm font-medium">Filtrar por tipo:</Label>
                    <div className="flex flex-wrap gap-3">
                      {['coop', 'warehouse', 'market'].map((type) => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox
                            id={`filter-${type}`}
                            checked={selectedBuildingTypes[type] ?? false}
                            onCheckedChange={(checked) => {
                              setSelectedBuildingTypes({
                                ...selectedBuildingTypes,
                                [type]: !!checked,
                              });
                            }}
                          />
                          <Label htmlFor={`filter-${type}`} className="text-sm cursor-pointer capitalize">
                            {type === 'coop' ? 'Coops' : type === 'warehouse' ? 'Almacenes' : 'Mercados'}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Buildings by Type and Level */}
                  <div className="space-y-4">
                    {Object.entries(metrics.buildingsByTypeAndLevel || {})
                      .filter(([type]) => selectedBuildingTypes[type] !== false)
                      .map(([type, levels]) => (
                        <div key={type} className="space-y-2">
                          <div className="flex items-center gap-2">
                            {type === 'coop' && <Package className="h-4 w-4 text-green-600" />}
                            {type === 'warehouse' && <Building2 className="h-4 w-4 text-blue-600" />}
                            {type === 'market' && <ShoppingCart className="h-4 w-4 text-orange-600" />}
                            <span className="font-semibold text-sm capitalize">
                              {type === 'coop' ? 'Coops' : type === 'warehouse' ? 'Almacenes' : 'Mercados'}
                            </span>
                          </div>
                          <div className="ml-6 space-y-1">
                            {Object.entries(levels)
                              .sort(([a], [b]) => parseInt(a) - parseInt(b))
                              .map(([level, count]) => (
                                <div key={level} className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Nivel {level}</span>
                                  <span className="font-semibold">{count}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Métricas de Uso</CardTitle>
                <CardDescription>Estadísticas de actividad (últimos 30 días)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Nuevos Usuarios</span>
                    <span className="font-semibold">{stats.totalNewUsers}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Vistas de Página</span>
                    <span className="font-semibold">{stats.totalPageViews.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Clics en Botones</span>
                    <span className="font-semibold">{stats.totalButtonClicks.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Duración Promedio</span>
                    <span className="font-semibold">
                      {stats.avgSessionDuration > 0 
                        ? `${Math.floor(stats.avgSessionDuration / 60)} min ${Math.floor(stats.avgSessionDuration % 60)} seg`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Tiempo Total en App</span>
                    <span className="font-semibold">
                      {stats.totalSessionDuration > 0 
                        ? `${Math.floor(stats.totalSessionDuration / 3600)} horas ${Math.floor((stats.totalSessionDuration % 3600) / 60)} min`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Sesiones</span>
                    <span className="font-semibold">{stats.totalSessions || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
              <CardDescription>Gestión rápida de la aplicación</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/admin/building-prices")}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Gestionar Precios
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/admin/store")}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Gestionar Tienda
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/admin/skins")}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Gestionar Skins
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/admin/users")}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Ver Usuarios
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    loadMetrics();
                    loadDailyMetrics(30);
                  }}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Actualizar Métricas
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Historical Metrics */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="text-lg">Métricas Históricas</CardTitle>
                  <CardDescription>Evolución diaria de las métricas</CardDescription>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="start-date" className="text-sm">Desde:</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={historyStartDate}
                      onChange={(e) => setHistoryStartDate(e.target.value)}
                      className="w-40"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="end-date" className="text-sm">Hasta:</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={historyEndDate}
                      onChange={(e) => setHistoryEndDate(e.target.value)}
                      className="w-40"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadDailyMetrics}
                    disabled={loadingHistory}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Cargar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadHistoryCSV}
                    disabled={loadingHistory || dailyMetrics.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadHistoryJSON}
                    disabled={loadingHistory || dailyMetrics.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    JSON
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : dailyMetrics.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay métricas históricas disponibles. El cron job capturará métricas diarias automáticamente.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Pagination Info */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      Mostrando {((historyPage - 1) * historyPageSize) + 1} - {Math.min(historyPage * historyPageSize, dailyMetrics.length)} de {dailyMetrics.length} registros
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                        disabled={historyPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm">
                        Página {historyPage} de {Math.ceil(dailyMetrics.length / historyPageSize)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setHistoryPage(p => Math.min(Math.ceil(dailyMetrics.length / historyPageSize), p + 1))}
                        disabled={historyPage >= Math.ceil(dailyMetrics.length / historyPageSize)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Group metrics by date */}
                  {Object.entries(
                    dailyMetrics.reduce((acc, metric) => {
                      if (!acc[metric.date]) {
                        acc[metric.date] = {
                          aggregates: null,
                          events: [],
                        };
                      }
                      
                      // Check if this is the aggregate metrics record
                      if (metric.metadata && typeof metric.metadata === 'object' && 'metric_name' in metric.metadata && metric.metadata.metric_name === 'daily_aggregates') {
                        acc[metric.date].aggregates = metric.metadata as any;
                      } else {
                        acc[metric.date].events.push(metric);
                      }
                      
                      return acc;
                    }, {} as Record<string, { aggregates: any; events: DailyMetric[] }>)
                  )
                    .sort(([a], [b]) => b.localeCompare(a))
                    .slice((historyPage - 1) * historyPageSize, historyPage * historyPageSize)
                    .map(([date, data]) => {
                      const dateObj = new Date(date);
                      const formattedDate = dateObj.toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      });

                      const aggregates = data.aggregates;
                      const events = data.events;

                      return (
                        <div key={date} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold">{formattedDate}</h4>
                            <span className="text-sm text-muted-foreground">
                              {aggregates ? 'Métricas completas' : `${events.length} eventos`}
                            </span>
                          </div>
                          {aggregates ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {Object.entries(aggregates)
                                .filter(([key]) => key !== 'metric_name' && key !== 'captured_at')
                                .map(([key, value]) => (
                                  <div key={key} className="flex flex-col">
                                    <span className="text-xs text-muted-foreground capitalize">
                                      {key.replace(/_/g, ' ')}
                                    </span>
                                    <span className="text-lg font-semibold">
                                      {typeof value === 'number' ? value.toLocaleString() : String(value)}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {events.map((metric) => (
                                <div key={`${date}-${metric.metric_type}`} className="flex flex-col">
                                  <span className="text-xs text-muted-foreground capitalize">
                                    {metric.metric_type.replace(/_/g, ' ')}
                                  </span>
                                  <span className="text-lg font-semibold">
                                    {metric.metric_value.toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
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

