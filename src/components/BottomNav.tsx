import { Home, Wallet, Users, Store as StoreIcon } from "lucide-react";
import { NavLink } from "./NavLink";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border z-50">
      <div className="flex justify-around items-center h-16 max-w-2xl mx-auto">
        <NavLink
          to="/"
          className="flex flex-col items-center justify-center flex-1 h-full text-muted-foreground transition-colors"
          activeClassName="text-primary"
        >
          {({ isActive }) => (
            <>
              <Home className={cn("w-5 h-5", isActive && "fill-current")} />
              <span className="text-xs mt-1">Home</span>
            </>
          )}
        </NavLink>
        
        <NavLink
          to="/wallet"
          className="flex flex-col items-center justify-center flex-1 h-full text-muted-foreground transition-colors"
          activeClassName="text-primary"
        >
          {({ isActive }) => (
            <>
              <Wallet className={cn("w-5 h-5", isActive && "fill-current")} />
              <span className="text-xs mt-1">Wallet</span>
            </>
          )}
        </NavLink>
        
        <NavLink
          to="/store"
          className="flex flex-col items-center justify-center flex-1 h-full text-muted-foreground transition-colors"
          activeClassName="text-primary"
        >
          {({ isActive }) => (
            <>
              <StoreIcon className={cn("w-5 h-5", isActive && "fill-current")} />
              <span className="text-xs mt-1">Store</span>
            </>
          )}
        </NavLink>
        
        <NavLink
          to="/friends"
          className="flex flex-col items-center justify-center flex-1 h-full text-muted-foreground transition-colors"
          activeClassName="text-primary"
        >
          {({ isActive }) => (
            <>
              <Users className={cn("w-5 h-5", isActive && "fill-current")} />
              <span className="text-xs mt-1">Friends</span>
            </>
          )}
        </NavLink>
      </div>
    </nav>
  );
};

export default BottomNav;
