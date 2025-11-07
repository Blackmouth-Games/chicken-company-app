import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";

interface HouseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const HouseDialog = ({ open, onOpenChange }: HouseDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Masia</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-8">
          {/* House Image */}
          <div className="flex justify-center">
            <div className="text-9xl">🏠</div>
          </div>

          {/* Coming Soon */}
          <div className="flex justify-center">
            <Button variant="outline" size="lg" className="text-lg font-medium" disabled>
              COMING SOON
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
