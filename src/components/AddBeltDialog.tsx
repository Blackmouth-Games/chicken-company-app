import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";

interface AddBeltDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gridPosition: { col: number; row: number } | null;
  onAddBelt: (direction: 'east' | 'west', type: 'straight' | 'curve-ne' | 'curve-nw' | 'curve-se' | 'curve-sw') => void;
}

export const AddBeltDialog = ({ open, onOpenChange, gridPosition, onAddBelt }: AddBeltDialogProps) => {
  const { t } = useLanguage();
  const [selectedDirection, setSelectedDirection] = useState<'east' | 'west'>('east');
  const [selectedType, setSelectedType] = useState<'straight' | 'curve-ne' | 'curve-nw' | 'curve-se' | 'curve-sw'>('straight');

  const handleConfirm = () => {
    onAddBelt(selectedDirection, selectedType);
    onOpenChange(false);
    setSelectedDirection('east');
    setSelectedType('straight');
  };

  const directions = [
    { value: 'west' as const, icon: ArrowLeft, label: t('layoutEditor.direction_west') },
    { value: 'east' as const, icon: ArrowRight, label: t('layoutEditor.direction_east') },
  ];

  const types = [
    { value: 'straight' as const, label: t('layoutEditor.type_straight') },
    { value: 'curve-ne' as const, label: t('layoutEditor.type_curve_ne') },
    { value: 'curve-nw' as const, label: t('layoutEditor.type_curve_nw') },
    { value: 'curve-se' as const, label: t('layoutEditor.type_curve_se') },
    { value: 'curve-sw' as const, label: t('layoutEditor.type_curve_sw') },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('layoutEditor.addBelt')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {gridPosition && (
            <p className="text-sm text-muted-foreground text-center">
              {t('layoutEditor.addBeltPrompt', { 
                col: gridPosition.col.toString(), 
                row: gridPosition.row.toString() 
              })}
            </p>
          )}

          {/* Direction Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('layoutEditor.selectDirection')}</label>
            <div className="grid grid-cols-2 gap-2">
              {directions.map(({ value, icon: Icon, label }) => (
                <Button
                  key={value}
                  onClick={() => setSelectedDirection(value)}
                  variant={selectedDirection === value ? "default" : "outline"}
                  className="h-16 flex flex-col gap-1"
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs">{label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Type Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('layoutEditor.selectType')}</label>
            <div className="grid grid-cols-2 gap-2">
              {types.map(({ value, label }) => (
                <Button
                  key={value}
                  onClick={() => setSelectedType(value)}
                  variant={selectedType === value ? "default" : "outline"}
                  className="h-12 text-xs"
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Confirm Button */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="flex-1"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1"
            >
              {t('common.confirm')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
