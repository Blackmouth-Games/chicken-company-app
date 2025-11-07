import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTonConnectUI } from "@tonconnect/ui-react";
import { Wallet } from "lucide-react";

interface ConnectWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ConnectWalletDialog = ({
  open,
  onOpenChange,
}: ConnectWalletDialogProps) => {
  const [tonConnectUI] = useTonConnectUI();
  
  const handleConnect = () => {
    onOpenChange(false);
    setTimeout(() => {
      tonConnectUI.openModal();
    }, 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Wallet className="h-6 w-6" />
            Conecta tu wallet
          </DialogTitle>
          <DialogDescription>
            Para continuar con la compra, necesitas conectar tu wallet TON
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-6">
          <div className="text-6xl">👛</div>
          
          <p className="text-sm text-center text-muted-foreground">
            Conecta tu wallet de Telegram para poder comprar corrales y gestionar tus gallinas
          </p>

          <div className="flex justify-center">
            <Button size="lg" onClick={handleConnect}>
              Conectar Wallet TON
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
