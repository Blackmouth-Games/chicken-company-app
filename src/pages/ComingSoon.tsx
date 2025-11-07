import logoChicken from "@/assets/logo-chicken-company.png";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Languages } from "lucide-react";
import { useState } from "react";

const ComingSoon = () => {
  const [language, setLanguage] = useState("es");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-primary/10 to-background p-6">
      {/* Language Selector */}
      <div className="absolute top-4 right-4">
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="w-32">
            <Languages className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="es">Español</SelectItem>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="fr">Français</SelectItem>
            <SelectItem value="de">Deutsch</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
