import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, Search, User, Filter, Activity, Clock, UserCheck, UserX } from "lucide-react";
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

interface UserProfile {
  id: string;
  telegram_id: number | null;
  telegram_username: string | null;
  telegram_first_name: string | null;
  telegram_last_name: string | null;
  referral_code: string | null;
  total_points: number | null;
  created_at: string | null;
  updated_at: string | null;
  last_activity?: string | null;
  has_recent_activity?: boolean;
}

export const AdminUsers = () => {
  const { user, isAdmin, loading: authLoading, signOut } = useAdminAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activityFilter, setActivityFilter] = useState<'all' | 'active' | 'inactive' | 'recent' | 'last7days' | 'last30days'>('all');
  const { toast } = useToast();

  // Load users when user is authenticated and is admin
  useEffect(() => {
    if (!authLoading && user && isAdmin === true) {
      loadUsers();
    }
  }, [authLoading, user, isAdmin]);

  // Redirect to login if not authenticated or not admin
  useEffect(() => {
    if (!authLoading && (!user || isAdmin === false)) {
      navigate("/admin/login");
    }
  }, [authLoading, user, isAdmin, navigate]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Get last activity for each user from user_sessions
      const userIds = (profiles || []).map(p => p.id);
      const { data: sessions } = await supabase
        .from("user_sessions")
        .select("user_id, session_start")
        .in("user_id", userIds)
        .order("session_start", { ascending: false });

      // Group sessions by user_id and get most recent
      const lastActivityByUser: Record<string, string> = {};
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      sessions?.forEach(session => {
        if (!lastActivityByUser[session.user_id] || 
            new Date(session.session_start) > new Date(lastActivityByUser[session.user_id])) {
          lastActivityByUser[session.user_id] = session.session_start;
        }
      });

      // Enrich profiles with activity data
      const enrichedUsers = (profiles || []).map(profile => {
        const lastActivity = lastActivityByUser[profile.id];
        const hasRecentActivity = lastActivity ? new Date(lastActivity) > sevenDaysAgo : false;
        
        return {
          ...profile,
          last_activity: lastActivity || null,
          has_recent_activity: hasRecentActivity,
        };
      });

      setUsers(enrichedUsers);
    } catch (error: any) {
      console.error("Error loading users:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter users based on search term and activity
  const filteredUsers = users.filter((user) => {
    // Search filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      user.telegram_id?.toString().includes(searchLower) ||
      user.telegram_username?.toLowerCase().includes(searchLower) ||
      user.telegram_first_name?.toLowerCase().includes(searchLower) ||
      user.telegram_last_name?.toLowerCase().includes(searchLower) ||
      user.id.toLowerCase().includes(searchLower) ||
      user.referral_code?.toLowerCase().includes(searchLower);

    if (!matchesSearch) return false;

    // Activity filter
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const lastActivity = user.last_activity ? new Date(user.last_activity) : null;
    const createdDate = user.created_at ? new Date(user.created_at) : null;
    const sevenDaysAgoCreated = createdDate ? createdDate > sevenDaysAgo : false;

    switch (activityFilter) {
      case 'active':
        return user.has_recent_activity === true;
      case 'inactive':
        return !user.has_recent_activity && (!lastActivity || lastActivity < sevenDaysAgo);
      case 'recent':
        return sevenDaysAgoCreated;
      case 'last7days':
        return lastActivity ? lastActivity > sevenDaysAgo : false;
      case 'last30days':
        return lastActivity ? lastActivity > thirtyDaysAgo : false;
      case 'all':
      default:
        return true;
    }
  });

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
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
          <p className="text-muted-foreground mt-1">Visualiza y gestiona los usuarios de la aplicación</p>
        </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Lista de Usuarios</CardTitle>
              <CardDescription>
                Total: {filteredUsers.length} {filteredUsers.length === 1 ? 'usuario' : 'usuarios'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar usuarios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <Button variant="outline" onClick={loadUsers} disabled={loading}>
                <Loader2 className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>
          </div>
          {/* Activity Filters */}
          <div className="flex items-center gap-2 flex-wrap mt-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filtros de actividad:</span>
            <Button
              variant={activityFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActivityFilter('all')}
            >
              Todos
            </Button>
            <Button
              variant={activityFilter === 'active' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActivityFilter('active')}
            >
              <UserCheck className="h-4 w-4 mr-1" />
              Activos
            </Button>
            <Button
              variant={activityFilter === 'inactive' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActivityFilter('inactive')}
            >
              <UserX className="h-4 w-4 mr-1" />
              Inactivos
            </Button>
            <Button
              variant={activityFilter === 'recent' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActivityFilter('recent')}
            >
              <Clock className="h-4 w-4 mr-1" />
              Recientes
            </Button>
            <Button
              variant={activityFilter === 'last7days' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActivityFilter('last7days')}
            >
              <Activity className="h-4 w-4 mr-1" />
              Últimos 7 días
            </Button>
            <Button
              variant={activityFilter === 'last30days' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActivityFilter('last30days')}
            >
              <Activity className="h-4 w-4 mr-1" />
              Últimos 30 días
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchTerm ? "No se encontraron usuarios con ese criterio de búsqueda" : "No hay usuarios registrados"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Telegram ID</TableHead>
                    <TableHead>Usuario Telegram</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Apellido</TableHead>
                    <TableHead>Código Referido</TableHead>
                    <TableHead>Puntos</TableHead>
                    <TableHead>Fecha de Registro</TableHead>
                    <TableHead>Última Actualización</TableHead>
                    <TableHead>Última Actividad</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((userProfile) => (
                    <TableRow key={userProfile.id}>
                      <TableCell className="font-mono text-xs">
                        {userProfile.id.substring(0, 8)}...
                      </TableCell>
                      <TableCell>
                        {userProfile.telegram_id ? (
                          <span className="font-mono">{userProfile.telegram_id}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {userProfile.telegram_username ? (
                          <span className="font-medium">@{userProfile.telegram_username}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {userProfile.telegram_first_name || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {userProfile.telegram_last_name || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {userProfile.referral_code ? (
                          <span className="font-mono text-xs">{userProfile.referral_code}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {userProfile.total_points !== null ? (
                          <span className="font-semibold">{userProfile.total_points}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {userProfile.created_at ? (
                          new Date(userProfile.created_at).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {userProfile.updated_at ? (
                          new Date(userProfile.updated_at).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {userProfile.last_activity ? (
                          <span className="text-sm">
                            {new Date(userProfile.last_activity).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">Sin actividad</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {userProfile.has_recent_activity ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            <Activity className="h-3 w-3" />
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                            <UserX className="h-3 w-3" />
                            Inactivo
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
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

export default AdminUsers;

