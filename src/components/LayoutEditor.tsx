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
  const [paintDirection, setPaintDirection] = useState<'north' | 'south' | 'east' | 'west'>('east');
  const [paintType, setPaintType] = useState<'straight' | 'curve-ne' | 'curve-nw' | 'curve-se' | 'curve-sw' | 'turn' | 'turn-rt' | 'turn-lt' | 'turn-ne' | 'turn-nw' | 'turn-se' | 'turn-sw' | 'funnel'>('straight');
  const [paintObjectType, setPaintObjectType] = useState<'belt' | 'road'>('belt');
  
  // Listen to edit mode changes from header
  useEffect(() => {
    const handleEditModeChange = (e: CustomEvent<boolean>) => {
      setIsEditMode(e.detail);
    };
    
    window.addEventListener('layoutEditModeChange', handleEditModeChange as EventListener);
    
    // Initialize from localStorage or default
    const saved = localStorage.getItem('layoutEditMode');
    if (saved) {
      const savedMode = JSON.parse(saved);
      setIsEditMode(savedMode);
    }
    
    return () => {
      window.removeEventListener('layoutEditModeChange', handleEditModeChange as EventListener);
    };
  }, []);
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
    localStorage.setItem('layoutEditMode', JSON.stringify(newMode));
    window.dispatchEvent(new CustomEvent('layoutEditModeChange', { detail: newMode }));
  };

  const addBelt = () => {
    window.dispatchEvent(new CustomEvent('addBelt'));
  };

  const addRoad = () => {
    window.dispatchEvent(new CustomEvent('addRoad'));
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
  };

  const handlePaintDirectionChange = (direction: 'north' | 'south' | 'east' | 'west') => {
    setPaintDirection(direction);
    window.dispatchEvent(new CustomEvent('paintOptionsChange', { 
      detail: { direction, type: paintType, objectType: paintObjectType } 
    }));
  };

  const handlePaintTypeChange = (type: 'straight' | 'curve-ne' | 'curve-nw' | 'curve-se' | 'curve-sw' | 'turn' | 'turn-rt' | 'turn-lt' | 'turn-ne' | 'turn-nw' | 'turn-se' | 'turn-sw' | 'funnel') => {
    setPaintType(type);
    window.dispatchEvent(new CustomEvent('paintOptionsChange', { 
      detail: { direction: paintDirection, type, objectType: paintObjectType } 
    }));
  };

  const handlePaintObjectTypeChange = (objectType: 'belt' | 'road') => {
    setPaintObjectType(objectType);
    window.dispatchEvent(new CustomEvent('paintOptionsChange', { 
      detail: { direction: paintDirection, type: paintType, objectType } 
    }));
  };

  const toggleVisibility = () => {
    const newState = !isVisible;
    setIsVisible(newState);
    localStorage.setItem('layoutEditorVisible', JSON.stringify(newState));
  };

  const resetLayout = () => {
    const defaultConfig = {
      house: { gridColumn: '5 / 11', gridRow: '1 / 7' },
      warehouse: { gridColumn: '1 / 6', gridRow: '7 / 13' },
      market: { gridColumn: '10 / 16', gridRow: '7 / 13' },
      boxes: { gridColumn: '4 / 6', gridRow: '10 / 13' },
      leftCorrals: { gridColumn: '1 / 7', gap: '20px', startRow: 16, rowSpan: 7 },
      rightCorrals: { gridColumn: '10 / 16', gap: '20px', startRow: 16, rowSpan: 7 },
      belts: [
        { id: 'belt-1762856883705', gridColumn: '7 / 8', gridRow: '14 / 15', direction: 'west', type: 'straight', isOutput: false, isDestiny: false, isTransport: false },
        { id: 'belt-1762856884083', gridColumn: '6 / 7', gridRow: '14 / 15', direction: 'west', type: 'straight', isOutput: false, isDestiny: false, isTransport: false },
        { id: 'belt-1762856884637', gridColumn: '5 / 6', gridRow: '14 / 15', direction: 'west', type: 'straight', isOutput: false, isDestiny: false, isTransport: false },
        { id: 'belt-1762856885181', gridColumn: '4 / 5', gridRow: '14 / 15', direction: 'west', type: 'straight', isOutput: false, isDestiny: false, isTransport: true },
        { id: 'belt-1762856885543', gridColumn: '3 / 4', gridRow: '14 / 15', direction: 'west', type: 'straight', isOutput: false, isDestiny: false, isTransport: false },
        { id: 'belt-1762856923052', gridColumn: '2 / 3', gridRow: '11 / 12', direction: 'north', type: 'curve-se', isOutput: false, isDestiny: true, isTransport: false },
        { id: 'belt-1762856948463', gridColumn: '2 / 3', gridRow: '14 / 15', direction: 'north', type: 'curve-se', isOutput: false, isDestiny: false, isTransport: false },
        { id: 'belt-1762962088940', gridColumn: '2 / 3', gridRow: '12 / 13', direction: 'north', type: 'curve-se', isOutput: false, isDestiny: false, isTransport: false },
        { id: 'belt-1762962092810', gridColumn: '2 / 3', gridRow: '13 / 14', direction: 'north', type: 'curve-se', isOutput: false, isDestiny: false, isTransport: false },
        { id: 'belt-1762962102824', gridColumn: '8 / 9', gridRow: '15 / 16', direction: 'north', type: 'curve-se', isOutput: false, isDestiny: false, isTransport: false },
        { id: 'belt-1762962114650', gridColumn: '8 / 9', gridRow: '14 / 15', direction: 'west', type: 'straight', isOutput: false, isDestiny: false, isTransport: true },
      ],
      roads: [
        { id: 'road-1762963056253', gridColumn: '4 / 6', gridRow: '9 / 11', direction: 'east', type: 'straight', isPointA: false, isPointB: true, isTransport: false },
        { id: 'road-1762963732985', gridColumn: '10 / 12', gridRow: '9 / 11', direction: 'east', type: 'straight', isPointA: true, isPointB: false, isTransport: false },
        { id: 'road-1762970448472', gridColumn: '6 / 8', gridRow: '9 / 11', direction: 'east', type: 'straight', isPointA: false, isPointB: false, isTransport: true },
        { id: 'road-1762970460604', gridColumn: '8 / 10', gridRow: '9 / 11', direction: 'east', type: 'straight', isPointA: false, isPointB: false, isTransport: true },
      ],
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
          className="cursor-move bg-background/95 backdrop-blur-sm rounded-lg border border-primary shadow-2xl p-1.5 flex flex-col gap-1 min-w-[120px]"
          onMouseDown={handleMouseDown}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-1 pb-1 border-b">
            <h3 className="text-xs font-semibold text-primary">Editor</h3>
            <Button
              onClick={toggleVisibility}
              size="sm"
              variant="ghost"
              className="h-5 w-5 p-0"
              title="Ocultar editor"
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>

          {/* Edit Mode Toggle */}
          <Button
            onClick={toggleEditMode}
            size="sm"
            variant="default"
            className="gap-1 h-6 text-xs w-full justify-start px-2"
          >
            <Layout className="h-3 w-3" />
            <span className="text-[10px]">Desactivar</span>
          </Button>

          {/* Divider */}
          <div className="h-px bg-border my-0.5" />

          {/* Hide Buildings */}
          <Button
            onClick={toggleHideBuildings}
            size="sm"
            variant={hideBuildings ? "default" : "outline"}
            className="gap-1 h-6 text-xs w-full justify-start px-2"
            title={hideBuildings ? "Mostrar edificios" : "Ocultar edificios"}
          >
            {hideBuildings ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            <span className="text-[10px]">{hideBuildings ? "Mostrar" : "Ocultar"}</span>
          </Button>

          {/* Add Belt */}
          <Button
            onClick={addBelt}
            size="sm"
            variant="outline"
            className="gap-1 h-6 text-xs w-full justify-start px-2"
            title={t('layoutEditor.addBeltTitle')}
          >
            <Plus className="h-3 w-3" />
            <span className="text-[10px]">Cinta</span>
          </Button>

          <Button
            onClick={addRoad}
            size="sm"
            variant="outline"
            className="gap-1 h-6 text-xs w-full justify-start px-2"
            title="Agregar carretera"
          >
            <Plus className="h-3 w-3" />
            <span className="text-[10px]">Carretera</span>
          </Button>

          {/* Paint Mode */}
          <Button
            onClick={togglePaintMode}
            size="sm"
            variant={paintMode ? "default" : "outline"}
            className="gap-1 h-6 text-xs w-full justify-start px-2"
            title={paintMode ? "Desactivar modo pintado" : "Activar modo pintado"}
          >
            <Paintbrush className="h-3 w-3" />
            <span className="text-[10px]">{paintMode ? "ON" : "Pintar"}</span>
          </Button>

          {/* Paint Mode Options - Only show when paint mode is active */}
          {paintMode && (
            <>
              {/* Object Type Selector */}
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] font-medium text-muted-foreground">Objeto:</label>
                <div className="grid grid-cols-2 gap-0.5">
                  <Button
                    onClick={() => handlePaintObjectTypeChange('belt')}
                    size="sm"
                    variant={paintObjectType === 'belt' ? "default" : "outline"}
                    className="h-6 text-[10px]"
                    title="Pintar cintas"
                  >
                    Cinta
                  </Button>
                  <Button
                    onClick={() => handlePaintObjectTypeChange('road')}
                    size="sm"
                    variant={paintObjectType === 'road' ? "default" : "outline"}
                    className="h-6 text-[10px]"
                    title="Pintar carreteras"
                  >
                    Carretera
                  </Button>
                </div>
              </div>

              {/* Direction Selector */}
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] font-medium text-muted-foreground">Dirección:</label>
                <div className="grid grid-cols-2 gap-0.5">
                  <Button
                    onClick={() => handlePaintDirectionChange('north')}
                    size="sm"
                    variant={paintDirection === 'north' ? "default" : "outline"}
                    className="h-6 text-xs"
                    title="Norte (↑)"
                  >
                    ↑
                  </Button>
                  <Button
                    onClick={() => handlePaintDirectionChange('south')}
                    size="sm"
                    variant={paintDirection === 'south' ? "default" : "outline"}
                    className="h-6 text-xs"
                    title="Sur (↓)"
                  >
                    ↓
                  </Button>
                  <Button
                    onClick={() => handlePaintDirectionChange('east')}
                    size="sm"
                    variant={paintDirection === 'east' ? "default" : "outline"}
                    className="h-6 text-xs"
                    title="Este (→)"
                  >
                    →
                  </Button>
                  <Button
                    onClick={() => handlePaintDirectionChange('west')}
                    size="sm"
                    variant={paintDirection === 'west' ? "default" : "outline"}
                    className="h-6 text-xs"
                    title="Oeste (←)"
                  >
                    ←
                  </Button>
                </div>
              </div>

              {/* Type Selector */}
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] font-medium text-muted-foreground">Tipo:</label>
                <div className="grid grid-cols-2 gap-0.5">
                  <Button
                    onClick={() => handlePaintTypeChange('straight')}
                    size="sm"
                    variant={paintType === 'straight' ? "default" : "outline"}
                    className="h-6 text-xs"
                    title="Recta"
                  >
                    ─
                  </Button>
                  <Button
                    onClick={() => handlePaintTypeChange('funnel')}
                    size="sm"
                    variant={paintType === 'funnel' ? "default" : "outline"}
                    className="h-6 text-xs"
                    title="Embudo"
                  >
                    ╬
                  </Button>
                  <Button
                    onClick={() => handlePaintTypeChange('curve-sw')}
                    size="sm"
                    variant={paintType === 'curve-sw' ? "default" : "outline"}
                    className="h-6 text-xs"
                    title="Curva SW (BL)"
                  >
                    BL
                  </Button>
                  <Button
                    onClick={() => handlePaintTypeChange('curve-se')}
                    size="sm"
                    variant={paintType === 'curve-se' ? "default" : "outline"}
                    className="h-6 text-xs"
                    title="Curva SE (BR)"
                  >
                    BR
                  </Button>
                </div>
              </div>
            </>
          )}

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

  // When edit mode is inactive, don't show anything (button is now in the header)
  return null;
};

export default LayoutEditor;
