import bgFarm from "@/assets/bg-farm-grass.png";
import { getTelegramUser } from "@/lib/telegram";

const Home = () => {
  const telegramUser = getTelegramUser();

  return (
    <div 
      className="min-h-screen w-full bg-cover bg-center relative"
      style={{ backgroundImage: `url(${bgFarm})` }}
    >
      <div className="absolute inset-0 bg-black/20" />
      
      <div className="relative z-10 p-6">
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
    </div>
  );
};

export default Home;
