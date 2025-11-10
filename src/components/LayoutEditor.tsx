import { useState, useEffect } from "react";
import { Layout, Copy, Plus, RotateCcw, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

const LayoutEditor = () => {
  const { t } = useLanguage();
  const [isEditMode, setIsEditMode] = useState(false);
  const [hideBuildings, setHideBuildings] = useState(false);
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

  const toggleHideBuildings = () => {
    const newState = !hideBuildings;
    setHideBuildings(newState);
    window.dispatchEvent(new CustomEvent('hideBuildingsChange', { detail: newState }));
  };

  const resetLayout = () => {
    const defaultConfig = {
      house: { gridColumn: '8 / 18', gridRow: '1 / 8' },
      warehouse: { gridColumn: '1 / 8', gridRow: '8 / 15' },
      market: { gridColumn: '16 / 25', gridRow: '8 / 15' },
      boxes: { gridColumn: '8 / 11', gridRow: '11 / 15' },
      leftCorrals: { gridColumn: '1 / 12', gap: '20px', startRow: 16, rowSpan: 8 },
      rightCorrals: { gridColumn: '15 / 26', gap: '20px', startRow: 16, rowSpan: 8 },
      belts: [],
      grid: { gap: '1px', maxWidth: '1600px', totalRows: 40 },
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
  const handleMouseDown = (e: MouseEvent) => {
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

  // Keep menu visible: clamp saved position on mount and window resize
  useEffect(() => {
    const clampPosition = () => {
      setPosition((prev) => {
        const maxX = Math.max(8, window.innerWidth - 200);
        const maxY = Math.max(8, window.innerHeight - 56);
        const x = Math.min(Math.max(prev.x, 8), maxX);
        const y = Math.min(Math.max(prev.y, 8), maxY);
        if (x !== prev.x || y !== prev.y) {
          localStorage.setItem('layoutEditorPosition', JSON.stringify({ x, y }));
        }
        return { x, y };
      });
    };

    clampPosition();
    window.addEventListener('resize', clampPosition);
    return () => window.removeEventListener('resize', clampPosition);
  }, []);

  return (
    <div
      className="fixed z-50 flex gap-2"
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
              <Button
                onClick={toggleHideBuildings}
                size="sm"
                variant={hideBuildings ? "default" : "outline"}
                className="gap-2"
                title={hideBuildings ? "Mostrar edificios" : "Ocultar edificios"}
              >
                {hideBuildings ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {hideBuildings ? "Mostrar" : "Ocultar"}
              </Button>
              <div className="flex items-center gap-2 bg-background/50 px-2 py-1 rounded border">
                <label className="text-xs whitespace-nowrap">Gap:</label>
                <input
                  type="text"
                  defaultValue="20px"
                  onChange={(e) => {
                    const savedLayout = localStorage.getItem('debugLayoutConfig');
                    if (savedLayout) {
                      const config = JSON.parse(savedLayout);
                      config.grid.gap = e.target.value;
                      localStorage.setItem('debugLayoutConfig', JSON.stringify(config));
                      window.dispatchEvent(new CustomEvent('layoutConfigUpdate', { detail: config }));
                    }
                  }}
                  className="w-16 px-1 py-0.5 text-xs border rounded bg-background"
                  placeholder="20px"
                />
              </div>
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
