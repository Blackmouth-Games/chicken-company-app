import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trophy, Target, Clock, TrendingUp, BarChart3, Search } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useNavigate } from "react-router-dom";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminLayout } from "@/components/AdminLayout";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface FlappyChickenMetrics {
  id: string;
  user_id: string;
  total_attempts: number;
  total_deaths: number;
  total_play_time_seconds: number;
  average_score: number;
  max_level_reached: number;
  high_score: number;
  recent_scores: number[];
  last_played_at: string | null;
  created_at: string;
  updated_at: string;
  profile?: {
    telegram_username: string | null;
    telegram_first_name: string | null;
    telegram_last_name: string | null;
  };
}

export const AdminFlappyChickenMetrics = () => {
  const { user, isAdmin, loading: authLoading, signOut } = useAdminAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<FlappyChickenMetrics[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  // Load metrics when user is authenticated and is admin
  useEffect(() => {
    if (!authLoading && user && isAdmin === true) {
      loadMetrics();
    }
  }, [authLoading, user, isAdmin]);

  // Redirect to login if not authenticated or not admin
  useEffect(() => {
    if (!authLoading && (!user || isAdmin === false)) {
      navigate("/admin/login");
    }
  }, [authLoading, user, isAdmin, navigate]);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("flappy_chicken_metrics" as any)
        .select(`
          *,
          profile:profiles!flappy_chicken_metrics_user_id_fkey (
            telegram_username,
            telegram_first_name,
            telegram_last_name
          )
        `)
        .order("high_score", { ascending: false });

      if (error) throw error;

      setMetrics((data as any) || []);
    } catch (error: any) {
      console.error("Error loading metrics:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron cargar las métricas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredMetrics = metrics.filter((metric) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const username = metric.profile?.telegram_username?.toLowerCase() || "";
    const firstName = metric.profile?.telegram_first_name?.toLowerCase() || "";
    const lastName = metric.profile?.telegram_last_name?.toLowerCase() || "";
    return (
      username.includes(searchLower) ||
      firstName.includes(searchLower) ||
      lastName.includes(searchLower) ||
      metric.user_id.toLowerCase().includes(searchLower)
    );
  });

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  const getTotalStats = () => {
    if (metrics.length === 0) return null;
    
    return {
      totalUsers: metrics.length,
      totalAttempts: metrics.reduce((sum, m) => sum + m.total_attempts, 0),
      totalPlayTime: metrics.reduce((sum, m) => sum + m.total_play_time_seconds, 0),
      avgHighScore: Math.round(
        metrics.reduce((sum, m) => sum + m.high_score, 0) / metrics.length
      ),
      maxHighScore: Math.max(...metrics.map((m) => m.high_score)),
    };
  };

  const stats = getTotalStats();

  if (authLoading) {
    return <LoadingScreen />;
  }

  return (
    <AdminLayout signOut={signOut}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Métricas Flappy Chicken</h1>
          <p className="text-muted-foreground">
            Estadísticas del minijuego Flappy Chicken de todos los usuarios
          </p>
        </div>

        {/* Summary Cards */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Usuarios</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <p className="text-xs text-muted-foreground">Total de jugadores</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Intentos</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalAttempts.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Total de intentos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tiempo Total</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatTime(stats.totalPlayTime)}</div>
                <p className="text-xs text-muted-foreground">Tiempo jugado</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Puntuación Promedio</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.avgHighScore}</div>
                <p className="text-xs text-muted-foreground">Puntuación máxima promedio</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Récord</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.maxHighScore}</div>
                <p className="text-xs text-muted-foreground">Puntuación máxima</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle>Métricas por Usuario</CardTitle>
            <CardDescription>
              Lista de todas las métricas del juego Flappy Chicken
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por usuario..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : filteredMetrics.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No se encontraron métricas
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Intentos</TableHead>
                      <TableHead>Muertes</TableHead>
                      <TableHead>Tiempo Jugado</TableHead>
                      <TableHead>Puntuación Máxima</TableHead>
                      <TableHead>Puntuación Promedio</TableHead>
                      <TableHead>Nivel Máximo</TableHead>
                      <TableHead>Última Partida</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMetrics.map((metric) => {
                      const profile = metric.profile as any;
                      const username =
                        profile?.telegram_username ||
                        profile?.telegram_first_name ||
                        metric.user_id.slice(0, 8);
                      
                      return (
                        <TableRow key={metric.id}>
                          <TableCell className="font-medium">{username}</TableCell>
                          <TableCell>{metric.total_attempts.toLocaleString()}</TableCell>
                          <TableCell>{metric.total_deaths.toLocaleString()}</TableCell>
                          <TableCell>{formatTime(metric.total_play_time_seconds)}</TableCell>
                          <TableCell className="font-bold">{metric.high_score}</TableCell>
                          <TableCell>{Math.round(metric.average_score)}</TableCell>
                          <TableCell>L{metric.max_level_reached}</TableCell>
                          <TableCell>
                            {metric.last_played_at
                              ? new Date(metric.last_played_at).toLocaleDateString("es-ES", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Nunca"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

