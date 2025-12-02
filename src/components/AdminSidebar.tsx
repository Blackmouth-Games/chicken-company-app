import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  DollarSign,
  Package,
  ShoppingCart,
  Users,
  LogOut,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "@/hooks/useAdminAuth";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Precios de Edificios",
    href: "/admin/building-prices",
    icon: DollarSign,
  },
  {
    title: "Gestionar Tienda",
    href: "/admin/store",
    icon: ShoppingCart,
  },
  {
    title: "Gestionar Skins",
    href: "/admin/skins",
    icon: Package,
  },
  {
    title: "Usuarios",
    href: "/admin/users",
    icon: Users,
  },
];

export const AdminSidebar = () => {
  const location = useLocation();
  const { signOut } = useAdminAuth();

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-background">
      {/* Logo/Header */}
      <div className="flex h-16 items-center border-b px-6">
        <h2 className="text-lg font-semibold">Admin Panel</h2>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.title}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={signOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
};

