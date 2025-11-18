import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";

interface AddBeltDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gridPosition: { col: number; row: number } | null;
  onAddBelt: (direction: 'north' | 'south' | 'east' | 'west', type: 'straight' | 'curve-ne' | 'curve-nw' | 'curve-se' | 'curve-sw' | 'turn' | 'turn-rt' | 'turn-lt' | 'turn-ne' | 'turn-nw' | 'turn-se' | 'turn-sw' | 'funnel') => void;
  showVertical?: boolean;
}

export const AddBeltDialog = ({ open, onOpenChange, gridPosition, onAddBelt, showVertical = false }: AddBeltDialogProps) => {
  const { t } = useLanguage();
  const [selectedDirection, setSelectedDirection] = useState<'north' | 'south' | 'east' | 'west'>('east');
  const [selectedType, setSelectedType] = useState<'straight' | 'curve-ne' | 'curve-nw' | 'curve-se' | 'curve-sw' | 'turn' | 'turn-rt' | 'turn-lt' | 'turn-ne' | 'turn-nw' | 'turn-se' | 'turn-sw' | 'funnel'>('straight');

  const handleConfirm = () => {
    onAddBelt(selectedDirection, selectedType);
    onOpenChange(false);
    setSelectedDirection('east');
    setSelectedType('straight');
  };

  const allDirections = [
    { value: 'north' as const, icon: ArrowUp, label: t('layoutEditor.direction_north') },
    { value: 'south' as const, icon: ArrowDown, label: t('layoutEditor.direction_south') },
    { value: 'west' as const, icon: ArrowLeft, label: t('layoutEditor.direction_west') },
    { value: 'east' as const, icon: ArrowRight, label: t('layoutEditor.direction_east') },
  ];

  const directions = showVertical ? allDirections : allDirections.filter(d => d.value === 'east' || d.value === 'west');

  const types = [
    { value: 'straight' as const, label: t('layoutEditor.type_straight') || 'Recta' },
    { value: 'funnel' as const, label: 'Embudo' },
    { value: 'curve-sw' as const, label: 'BL' },
    { value: 'curve-se' as const, label: 'BR' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-sm">{t('layoutEditor.addBelt')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {gridPosition && (
            <p className="text-xs text-muted-foreground text-center">
              {t('layoutEditor.addBeltPrompt', { 
                col: gridPosition.col.toString(), 
                row: gridPosition.row.toString() 
              })}
            </p>
          )}

          {/* Direction Selection */}
          <div className="space-y-1">
            <label className="text-xs font-medium">{t('layoutEditor.selectDirection')}</label>
            <div className="grid grid-cols-2 gap-1">
              {directions.map(({ value, icon: Icon, label }) => (
                <Button
                  key={value}
                  onClick={() => setSelectedDirection(value)}
                  variant={selectedDirection === value ? "default" : "outline"}
                  className="h-8 flex flex-col gap-0.5 text-xs"
                >
                  <Icon className="h-3 w-3" />
                  <span className="text-[10px]">{label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Type Selection */}
          <div className="space-y-1">
            <label className="text-xs font-medium">{t('layoutEditor.selectType')}</label>
            <div className="grid grid-cols-2 gap-1">
              {types.map(({ value, label }) => (
                <Button
                  key={value}
                  onClick={() => setSelectedType(value)}
                  variant={selectedType === value ? "default" : "outline"}
                  className="h-7 text-xs"
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Confirm Button */}
          <div className="flex gap-1 pt-1">
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="flex-1 h-7 text-xs"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1 h-7 text-xs"
            >
              {t('common.confirm')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
