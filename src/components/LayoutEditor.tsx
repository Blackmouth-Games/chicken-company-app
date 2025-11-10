import { useState, useEffect } from "react";
import { Layout, Copy, Plus, RotateCcw, Eye, EyeOff, ChevronDown, ChevronUp, Paintbrush } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

const LayoutEditor = () => {
  const { t } = useLanguage();
  const [isEditMode, setIsEditMode] = useState(false);
  const [hideBuildings, setHideBuildings] = useState(false);
  const [paintMode, setPaintMode] = useState(false);
  const [isVisible, setIsVisible] = useState(() => {
    const saved = localStorage.getItem('layoutEditorVisible');
    return saved ? JSON.parse(saved) : true;
  });
  const [position, setPosition] = useState(() => {
    const savedPosition = localStorage.getItem('layoutEditorPosition');
    if (savedPosition) {
      const parsed = JSON.parse(savedPosition);
      return { x: parsed.x || window.innerWidth - 100, y: parsed.y || window.innerHeight / 2 };
    }
    return { x: window.innerWidth - 100, y: window.innerHeight / 2 };
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

  const togglePaintMode = () => {
    const newState = !paintMode;
    setPaintMode(newState);
    window.dispatchEvent(new CustomEvent('paintModeChange', { detail: newState }));
    toast({
      title: newState ? 'Modo pintado activado' : 'Modo pintado desactivado',
      description: newState 
        ? 'Haz clic en las celdas vacías para colocar cintas'
        : 'Modo pintado desactivado',
    });
  };

  const toggleVisibility = () => {
    const newState = !isVisible;
    setIsVisible(newState);
    localStorage.setItem('layoutEditorVisible', JSON.stringify(newState));
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
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const toolbarWidth = isEditMode ? 180 : 200;
      const toolbarHeight = isEditMode ? 400 : 56;
      // Calculate position from center of toolbar
      const newX = Math.max(toolbarWidth / 2, Math.min(window.innerWidth - toolbarWidth / 2, e.clientX - dragOffset.x));
      const newY = Math.max(toolbarHeight / 2, Math.min(window.innerHeight - toolbarHeight / 2, e.clientY - dragOffset.y));
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
  }, [isDragging, dragOffset, isEditMode]);

  // Keep menu visible: clamp saved position on mount and window resize
  useEffect(() => {
    const clampPosition = () => {
      setPosition((prev) => {
        const toolbarWidth = isEditMode ? 180 : 200;
        const toolbarHeight = isEditMode ? 400 : 56;
        const maxX = Math.max(8, window.innerWidth - toolbarWidth);
        const maxY = Math.max(8, window.innerHeight - toolbarHeight);
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
  }, [isEditMode]);

  if (!isVisible) {
    return (
      <div
        className="fixed z-50"
        style={{
          right: '16px',
          top: '16px',
        }}
      >
        <Button
          onClick={toggleVisibility}
          size="sm"
          variant="outline"
          className="gap-2"
          title="Mostrar editor de layout"
        >
          <ChevronUp className="h-4 w-4" />
          Layout
        </Button>
      </div>
    );
  }

  // When edit mode is active, show vertical toolbar
  if (isEditMode) {
    return (
      <div
        className="fixed z-50"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div
          className="cursor-move bg-background/95 backdrop-blur-sm rounded-lg border-2 border-primary shadow-2xl p-3 flex flex-col gap-2 min-w-[180px]"
          onMouseDown={handleMouseDown}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2 pb-2 border-b">
            <h3 className="text-sm font-semibold text-primary">Editor</h3>
            <Button
              onClick={toggleVisibility}
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              title="Ocultar editor"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>

          {/* Edit Mode Toggle */}
          <Button
            onClick={toggleEditMode}
            size="sm"
            variant="default"
            className="gap-2 w-full justify-start"
          >
            <Layout className="h-4 w-4" />
            {t('layoutEditor.deactivateEdit')}
          </Button>

          {/* Divider */}
          <div className="h-px bg-border my-1" />

          {/* Hide Buildings */}
          <Button
            onClick={toggleHideBuildings}
            size="sm"
            variant={hideBuildings ? "default" : "outline"}
            className="gap-2 w-full justify-start"
            title={hideBuildings ? "Mostrar edificios" : "Ocultar edificios"}
          >
            {hideBuildings ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {hideBuildings ? "Mostrar" : "Ocultar"} Edificios
          </Button>

          {/* Add Belt */}
          <Button
            onClick={addBelt}
            size="sm"
            variant="outline"
            className="gap-2 w-full justify-start"
            title={t('layoutEditor.addBeltTitle')}
          >
            <Plus className="h-4 w-4" />
            {t('layoutEditor.addBelt')}
          </Button>

          {/* Paint Mode */}
          <Button
            onClick={togglePaintMode}
            size="sm"
            variant={paintMode ? "default" : "outline"}
            className="gap-2 w-full justify-start"
            title={paintMode ? "Desactivar modo pintado" : "Activar modo pintado"}
          >
            <Paintbrush className="h-4 w-4" />
            {paintMode ? "Pintar ON" : "Modo Pintar"}
          </Button>

          {/* Divider */}
          <div className="h-px bg-border my-1" />

          {/* Gap Input */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Gap:</label>
            <input
              type="text"
              defaultValue="1px"
              onChange={(e) => {
                const savedLayout = localStorage.getItem('debugLayoutConfig');
                if (savedLayout) {
                  const config = JSON.parse(savedLayout);
                  config.grid.gap = e.target.value;
                  localStorage.setItem('debugLayoutConfig', JSON.stringify(config));
                  window.dispatchEvent(new CustomEvent('layoutConfigUpdate', { detail: config }));
                }
              }}
              className="w-full px-2 py-1 text-xs border rounded bg-background"
              placeholder="1px"
            />
          </div>

          {/* Divider */}
          <div className="h-px bg-border my-1" />

          {/* Reset Layout */}
          <Button
            onClick={resetLayout}
            size="sm"
            variant="outline"
            className="gap-2 w-full justify-start text-orange-600 hover:text-orange-700 hover:bg-orange-50"
            title={t('layoutEditor.resetTitle')}
          >
            <RotateCcw className="h-4 w-4" />
            {t('layoutEditor.reset')}
          </Button>

          {/* Export Layout */}
          <Button
            onClick={exportLayout}
            size="sm"
            variant="outline"
            className="gap-2 w-full justify-start"
            title={t('layoutEditor.copy')}
          >
            <Copy className="h-4 w-4" />
            {t('layoutEditor.copy')}
          </Button>
        </div>
      </div>
    );
  }

  // When edit mode is inactive, show compact button
  return (
    <div
      className="fixed z-50"
      style={{
        right: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <div
        className="cursor-move bg-background/95 backdrop-blur-sm rounded-lg border shadow-lg p-2"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <Button
            onClick={toggleVisibility}
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            title="Ocultar editor"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button
            onClick={toggleEditMode}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            <Layout className="h-4 w-4" />
            {t('layoutEditor.activateEdit')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LayoutEditor;
