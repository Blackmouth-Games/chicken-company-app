import { useState, useEffect } from "react";
import { Layout, Copy, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

const LayoutEditor = () => {
  const { t } = useLanguage();
  const [isEditMode, setIsEditMode] = useState(false);
  const [position, setPosition] = useState(() => {
    const savedPosition = localStorage.getItem('layoutEditorPosition');
    return savedPosition ? JSON.parse(savedPosition) : { x: 16, y: 200 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const toggleEditMode = () => {
    const newMode = !isEditMode;
    setIsEditMode(newMode);
    window.dispatchEvent(new CustomEvent('layoutEditModeChange', { detail: newMode }));
    toast({
      title: newMode ? t('layoutEditor.editModeActivated') : t('layoutEditor.editModeDeactivated'),
      description: newMode 
        ? t('layoutEditor.editDescription')
        : t('layoutEditor.changesSaved'),
    });
  };

  const addBelt = () => {
    window.dispatchEvent(new CustomEvent('addBelt'));
  };

  const resetLayout = () => {
    const defaultConfig = {
      warehouse: { gridColumn: '1 / 7', gridRow: '1 / 4' },
      market: { gridColumn: '20 / 26', gridRow: '1 / 4' },
      house: { gridColumn: '11 / 16', gridRow: '1 / 3' },
      boxes: { gridColumn: '6 / 8', gridRow: '3 / 5' },
      leftCorrals: { gridColumn: '1 / 7', gap: '20px', startRow: 4 },
      rightCorrals: { gridColumn: '20 / 26', gap: '20px', startRow: 4 },
      belts: [{ id: 'belt-1', gridColumn: '13 / 14', gridRow: '10 / 11', direction: 'east', type: 'straight' }],
      grid: { gap: '20px', maxWidth: '1600px' },
    };
    
    localStorage.setItem('debugLayoutConfig', JSON.stringify(defaultConfig));
    window.dispatchEvent(new CustomEvent('layoutConfigUpdate', { detail: defaultConfig }));
    
    toast({
      title: t('layoutEditor.layoutRestored'),
      description: t('layoutEditor.layoutRestoredDesc'),
    });
  };

  const exportLayout = () => {
    const savedLayout = localStorage.getItem('debugLayoutConfig');
    if (savedLayout) {
      navigator.clipboard.writeText(savedLayout)
        .then(() => {
          toast({
            title: t('layoutEditor.layoutCopied'),
            description: t('layoutEditor.layoutCopiedDesc'),
          });
        })
        .catch(() => {
          toast({
            title: t('common.error'),
            description: t('layoutEditor.copyError'),
            variant: 'destructive',
          });
        });
    }
  };

  // Drag handlers for button
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newX = Math.max(0, Math.min(window.innerWidth - 200, e.clientX - dragOffset.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 56, e.clientY - dragOffset.y));
      setPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      localStorage.setItem('layoutEditorPosition', JSON.stringify(position));
    }
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  return (
    <div
      className="fixed z-40 flex gap-2"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <div
        className="cursor-move p-1 bg-background/80 rounded-lg border"
        onMouseDown={handleMouseDown}
      >
        <div className="flex gap-2">
          <Button
            onClick={toggleEditMode}
            size="sm"
            variant={isEditMode ? "default" : "outline"}
            className="gap-2"
          >
            <Layout className="h-4 w-4" />
            {isEditMode ? t('layoutEditor.deactivateEdit') : t('layoutEditor.activateEdit')}
          </Button>
          {isEditMode && (
            <>
              <Button
                onClick={addBelt}
                size="sm"
                variant="outline"
                className="gap-2"
                title={t('layoutEditor.addBeltTitle')}
              >
                <Plus className="h-4 w-4" />
                {t('layoutEditor.addBelt')}
              </Button>
              <Button
                onClick={resetLayout}
                size="sm"
                variant="outline"
                className="gap-2 text-orange-600 hover:text-orange-700"
                title={t('layoutEditor.resetTitle')}
              >
                <RotateCcw className="h-4 w-4" />
                {t('layoutEditor.reset')}
              </Button>
            </>
          )}
          <Button
            onClick={exportLayout}
            size="sm"
            variant="outline"
            className="gap-2"
            title={t('layoutEditor.copy')}
          >
            <Copy className="h-4 w-4" />
            {t('layoutEditor.copy')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LayoutEditor;
