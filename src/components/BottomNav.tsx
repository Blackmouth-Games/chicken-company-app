import { useState } from "react";
import { Home, Wallet, Users, Store as StoreIcon, Gamepad2 } from "lucide-react";
import { NavLink } from "./NavLink";
import { cn } from "@/lib/utils";
import FlappyChickenGame from "./FlappyChickenGame";
import { supabase } from "@/integrations/supabase/client";

const BottomNav = () => {
  const [gameOpen, setGameOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const handlePlayClick = async () => {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
    }
    setGameOpen(true);
  };

  return (
    <>
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

          {/* Play button - centered and elevated */}
          <button
            onClick={handlePlayClick}
            className="flex flex-col items-center justify-center flex-1 h-full relative"
          >
            <div className="absolute -top-5 w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 border-4 border-background">
              <Gamepad2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs mt-6 text-muted-foreground font-medium">Play</span>
          </button>
        
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

      {/* Flappy Chicken Game Dialog */}
      <FlappyChickenGame 
        open={gameOpen} 
        onOpenChange={setGameOpen}
        userId={userId}
      />
    </>
  );
};

export default BottomNav;
