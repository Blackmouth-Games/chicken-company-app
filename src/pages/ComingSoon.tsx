import logoChicken from "@/assets/logo-chicken-company.png";
import { Button } from "@/components/ui/button";

const ComingSoon = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-primary/10 to-background p-6">
      <div className="max-w-md w-full text-center space-y-8">
        <img 
          src={logoChicken} 
          alt="Chicken Company" 
          className="w-full max-w-sm mx-auto"
        />
        
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-foreground">
            Coming Soon
          </h1>
          <p className="text-lg text-muted-foreground">
            Estamos desarrollando nuestra aplicación web con Solana
          </p>
          <p className="text-muted-foreground">
            Mientras tanto, puedes jugar desde nuestro bot de Telegram
          </p>
        </div>

        <Button 
          size="lg" 
          className="w-full"
          onClick={() => window.open('https://t.me/ChickenCompany_bot', '_blank')}
        >
          Jugar en Telegram
        </Button>
      </div>
    </div>
  );
};

export default ComingSoon;
