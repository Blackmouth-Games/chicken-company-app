import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

interface AddBeltDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gridPosition: { col: number; row: number } | null;
  onAddBelt: (direction: 'vertical' | 'horizontal') => void;
}

export const AddBeltDialog = ({ open, onOpenChange, gridPosition, onAddBelt }: AddBeltDialogProps) => {
  const { t } = useLanguage();

  const handleDirection = (direction: 'vertical' | 'horizontal') => {
    onAddBelt(direction);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle>{t('layoutEditor.addBelt')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {gridPosition && (
            <p className="text-sm text-muted-foreground text-center">
              {t('layoutEditor.addBeltPrompt', { 
                col: gridPosition.col.toString(), 
                row: gridPosition.row.toString() 
              })}
            </p>
          )}

          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => handleDirection('vertical')}
              variant="outline"
              className="flex-1"
            >
              {t('layoutEditor.vertical')}
            </Button>
            <Button
              onClick={() => handleDirection('horizontal')}
              variant="outline"
              className="flex-1"
            >
              {t('layoutEditor.horizontal')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
