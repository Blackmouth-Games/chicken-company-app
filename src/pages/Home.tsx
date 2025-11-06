import { useState } from "react";
import bgFarm from "@/assets/bg-farm-grass.png";
import { getTelegramUser } from "@/lib/telegram";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { SettingsDialog } from "@/components/SettingsDialog";

const Home = () => {
  const telegramUser = getTelegramUser();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div 
      className="min-h-screen w-full bg-repeat relative"
      style={{ backgroundImage: `url(${bgFarm})` }}
    >
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />
      
      <div className="relative z-10 p-6">
        {/* Settings Button */}
        <div className="absolute top-4 right-4 z-50">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20 text-white"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white drop-shadow-lg mb-2">
            Welcome, {telegramUser?.first_name || 'Guest'}!
          </h1>
          <p className="text-white/90 drop-shadow">
            Start farming your chickens
          </p>
        </div>

        {/* Game content will go here */}
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 text-center">
            <p className="text-white text-xl">
              🐔 Farm content coming soon...
            </p>
          </div>
        </div>
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
};

export default Home;
