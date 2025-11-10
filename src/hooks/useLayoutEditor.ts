import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  parseGridNotation,
  createGridNotation,
  parseGridArea,
  wouldCollide,
  isWithinBounds,
  type GridArea,
} from "@/lib/layoutCollisions";

interface BeltConfig {
  id: string;
  gridColumn: string;
  gridRow: string;
}

export interface LayoutConfig {
  warehouse: { gridColumn: string; gridRow: string; minHeight: string };
  market: { gridColumn: string; gridRow: string; minHeight: string };
  leftCorrals: { gridColumn: string; gap: string; minHeight: string };
  rightCorrals: { gridColumn: string; gap: string; minHeight: string };
  belts: BeltConfig[];
  grid: { gap: string; maxWidth: string };
}

const DEFAULT_LAYOUT: LayoutConfig = {
  warehouse: { gridColumn: '1 / 7', gridRow: '1 / 4', minHeight: '120px' },
  market: { gridColumn: '20 / 26', gridRow: '1 / 4', minHeight: '120px' },
  leftCorrals: { gridColumn: '1 / 7', gap: '20px', minHeight: '260px' },
  rightCorrals: { gridColumn: '20 / 26', gap: '20px', minHeight: '260px' },
  belts: [{ id: 'belt-1', gridColumn: '13 / 14', gridRow: '1 / span 20' }],
  grid: { gap: '20px', maxWidth: '1600px' },
};

const TOTAL_COLUMNS = 25;

export const useLayoutEditor = (beltSpanForRows: number = 20) => {
  const { toast } = useToast();
  const gridRef = useRef<HTMLDivElement>(null);
  
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(() => {
    const saved = localStorage.getItem('debugLayoutConfig');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.belts) {
          parsed.belts = DEFAULT_LAYOUT.belts;
        }
        return parsed;
      } catch {
        return DEFAULT_LAYOUT;
      }
    }
    return DEFAULT_LAYOUT;
  });

  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedBuilding, setDraggedBuilding] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [resizing, setResizing] = useState<{ building: string; handle: string } | null>(null);
  const [tempPosition, setTempPosition] = useState<{ col: number; row: number } | null>(null);
  const [hasCollision, setHasCollision] = useState(false);

  // Calculate total rows based on belt configuration
  const getTotalRows = (): number => {
    let rows = 0;
    try {
      layoutConfig.belts?.forEach((belt) => {
        const parsed = parseGridNotation(belt.gridRow);
        rows = Math.max(rows, parsed.end - parsed.start);
      });
    } catch {}
    return rows || beltSpanForRows;
  };

  // Save layout to localStorage
  const saveLayoutToStorage = (config: LayoutConfig) => {
    localStorage.setItem('debugLayoutConfig', JSON.stringify(config));
  };

  // Convert pixel position to grid coordinates
  const pixelToGrid = (x: number, y: number): { col: number; row: number } => {
    if (!gridRef.current) return { col: 1, row: 1 };
    
    const rect = gridRef.current.getBoundingClientRect();
    const relativeX = x - rect.left;
    const relativeY = y - rect.top;
    
    const totalRows = getTotalRows();
    const columnWidth = rect.width / TOTAL_COLUMNS;
    const rowHeight = rect.height / totalRows;
    
    const col = Math.max(1, Math.min(TOTAL_COLUMNS, Math.floor(relativeX / columnWidth) + 1));
    const row = Math.max(1, Math.min(totalRows, Math.floor(relativeY / rowHeight) + 1));
    
    return { col, row };
  };

  // Update building layout with collision detection
  const updateBuildingLayout = (
    building: keyof Pick<LayoutConfig, 'warehouse' | 'market'>,
    updates: Partial<LayoutConfig['warehouse']>,
    skipCollisionCheck = false
  ): boolean => {
    const newConfig = {
      ...layoutConfig[building],
      ...updates,
    };

    // Check for collisions
    if (!skipCollisionCheck && (updates.gridColumn || updates.gridRow)) {
      const newArea = parseGridArea(
        updates.gridColumn || layoutConfig[building].gridColumn,
        updates.gridRow || layoutConfig[building].gridRow
      );

      // Check bounds
      if (!isWithinBounds(newArea, TOTAL_COLUMNS, getTotalRows())) {
        toast({
          title: "Fuera de límites",
          description: "El edificio no puede colocarse fuera del grid",
          variant: "destructive",
        });
        return false;
      }

      // Check collisions
      const collision = wouldCollide(newArea, layoutConfig, building);
      if (collision.collides) {
        toast({
          title: "Colisión detectada",
          description: `No puede superponerse con ${collision.collidingWith}`,
          variant: "destructive",
        });
        setHasCollision(true);
        setTimeout(() => setHasCollision(false), 500);
        return false;
      }
    }

    setLayoutConfig(prev => {
      const updated = {
        ...prev,
        [building]: {
          minHeight: prev[building].minHeight,
          ...prev[building],
          ...updates,
        }
      };
      saveLayoutToStorage(updated);
      return updated;
    });

    return true;
  };

  // Handle drag start
  const handleBuildingMouseDown = (e: React.MouseEvent, buildingName: string) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    setDraggedBuilding(buildingName);
    setIsDragging(true);
    
    const gridPos = pixelToGrid(e.clientX, e.clientY);
    setDragOffset({ x: e.clientX, y: e.clientY });
    setTempPosition(gridPos);
  };

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent, buildingName: string, handle: string) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent resizing from triggering on the building itself
    const target = e.target as HTMLElement;
    if (target.classList.contains('resize-handle') || target.closest('.resize-handle')) {
      setResizing({ building: buildingName, handle });
      setDragOffset({ x: e.clientX, y: e.clientY });
    }
  };

  // Handle mouse move for drag and resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!gridRef.current) return;

      if (isDragging && draggedBuilding) {
        const gridPos = pixelToGrid(e.clientX, e.clientY);
        setTempPosition(gridPos);
      }

      if (resizing) {
        const buildingKey = resizing.building as keyof Pick<LayoutConfig, 'warehouse' | 'market'>;
        const currentConfig = layoutConfig[buildingKey];
        
        const colPos = parseGridNotation(currentConfig.gridColumn);
        const rowPos = parseGridNotation(currentConfig.gridRow);
        const gridPos = pixelToGrid(e.clientX, e.clientY);
        
        let newColStart = colPos.start;
        let newColEnd = colPos.end;
        let newRowStart = rowPos.start;
        let newRowEnd = rowPos.end;
        
        // Calculate new dimensions based on handle (minimum 1x1)
        switch (resizing.handle) {
          case 'nw':
            newColStart = Math.min(gridPos.col, colPos.end - 1);
            newRowStart = Math.min(gridPos.row, rowPos.end - 1);
            break;
          case 'ne':
            newColEnd = Math.max(gridPos.col, colPos.start + 1);
            newRowStart = Math.min(gridPos.row, rowPos.end - 1);
            break;
          case 'sw':
            newColStart = Math.min(gridPos.col, colPos.end - 1);
            newRowEnd = Math.max(gridPos.row, rowPos.start + 1);
            break;
          case 'se':
            newColEnd = Math.max(gridPos.col, colPos.start + 1);
            newRowEnd = Math.max(gridPos.row, rowPos.start + 1);
            break;
          case 'n':
            newRowStart = Math.min(gridPos.row, rowPos.end - 1);
            break;
          case 's':
            newRowEnd = Math.max(gridPos.row, rowPos.start + 1);
            break;
          case 'w':
            newColStart = Math.min(gridPos.col, colPos.end - 1);
            break;
          case 'e':
            newColEnd = Math.max(gridPos.col, colPos.start + 1);
            break;
        }
        
        updateBuildingLayout(buildingKey, {
          gridColumn: createGridNotation(newColStart, newColEnd),
          gridRow: createGridNotation(newRowStart, newRowEnd),
        });
      }
    };

    const handleMouseUp = () => {
      if (isDragging && draggedBuilding && tempPosition) {
        const buildingKey = draggedBuilding as keyof Pick<LayoutConfig, 'warehouse' | 'market'>;
        const currentConfig = layoutConfig[buildingKey];
        
        const colSpan = parseGridNotation(currentConfig.gridColumn);
        const rowSpan = parseGridNotation(currentConfig.gridRow);
        
        const width = colSpan.end - colSpan.start;
        const height = rowSpan.end - rowSpan.start;
        
        // Try to update position
        const success = updateBuildingLayout(buildingKey, {
          gridColumn: createGridNotation(tempPosition.col, tempPosition.col + width),
          gridRow: createGridNotation(tempPosition.row, tempPosition.row + height),
        });

        if (success) {
          toast({
            title: "Edificio movido",
            description: `${draggedBuilding} movido a columna ${tempPosition.col}, fila ${tempPosition.row}`,
          });
        }
      }
      
      setIsDragging(false);
      setDraggedBuilding(null);
      setResizing(null);
      setTempPosition(null);
    };

    if (isDragging || resizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, draggedBuilding, resizing, tempPosition, layoutConfig]);

  // Belt management
  const addBelt = () => {
    setLayoutConfig(prev => {
      const newBelt: BeltConfig = {
        id: `belt-${Date.now()}`,
        gridColumn: '13 / 14',
        gridRow: '1 / span 20',
      };
      const newConfig = {
        ...prev,
        belts: [...prev.belts, newBelt],
      };
      saveLayoutToStorage(newConfig);
      toast({
        title: "Cinta agregada",
        description: "Nueva cinta transportadora agregada",
      });
      return newConfig;
    });
  };

  const removeBelt = (beltId: string) => {
    setLayoutConfig(prev => {
      const newConfig = {
        ...prev,
        belts: prev.belts.filter(b => b.id !== beltId),
      };
      saveLayoutToStorage(newConfig);
      toast({
        title: "Cinta eliminada",
        description: "Cinta transportadora eliminada",
      });
      return newConfig;
    });
  };

  const updateBelt = (beltId: string, updates: Partial<BeltConfig>) => {
    setLayoutConfig(prev => {
      const newConfig = {
        ...prev,
        belts: prev.belts.map(b => b.id === beltId ? { ...b, ...updates } : b),
      };
      saveLayoutToStorage(newConfig);
      return newConfig;
    });
  };

  // Update minHeight for buildings
  const updateMinHeight = (building: 'warehouse' | 'market', minHeight: string) => {
    setLayoutConfig(prev => {
      const newConfig = {
        ...prev,
        [building]: {
          ...prev[building],
          minHeight,
        },
      };
      saveLayoutToStorage(newConfig);
      return newConfig;
    });
  };

  // Handle grid cell click to add belt
  const handleGridClick = (e: React.MouseEvent) => {
    if (!isEditMode) return;
    
    const gridPos = pixelToGrid(e.clientX, e.clientY);
    
    // Show direction picker dialog
    const direction = window.prompt(
      `Agregar cinta en Col ${gridPos.col}, Row ${gridPos.row}\n\nEscribe la dirección:\n- "vertical" o "v" para vertical\n- "horizontal" o "h" para horizontal`,
      "vertical"
    );
    
    if (!direction) return;
    
    const isVertical = direction.toLowerCase().startsWith('v');
    const totalRows = getTotalRows();
    
    const newBelt: BeltConfig = {
      id: `belt-${Date.now()}`,
      gridColumn: isVertical 
        ? `${gridPos.col} / ${gridPos.col + 1}` 
        : `${gridPos.col} / span 6`,
      gridRow: isVertical 
        ? `${gridPos.row} / span ${totalRows - gridPos.row + 1}` 
        : `${gridPos.row} / ${gridPos.row + 1}`,
    };
    
    setLayoutConfig(prev => {
      const newConfig = {
        ...prev,
        belts: [...prev.belts, newBelt],
      };
      saveLayoutToStorage(newConfig);
      toast({
        title: "Cinta agregada",
        description: `Nueva cinta ${isVertical ? 'vertical' : 'horizontal'} en Col ${gridPos.col}, Row ${gridPos.row}`,
      });
      return newConfig;
    });
  };

  // Listen for external events
  useEffect(() => {
    const handleEditModeChange = (event: CustomEvent<boolean>) => {
      setIsEditMode(event.detail);
    };

    const handleAddBelt = () => {
      addBelt();
    };

    const handleLayoutUpdate = (event: CustomEvent<LayoutConfig>) => {
      setLayoutConfig(event.detail);
    };

    window.addEventListener('layoutEditModeChange', handleEditModeChange as EventListener);
    window.addEventListener('addBelt', handleAddBelt as EventListener);
    window.addEventListener('layoutConfigUpdate', handleLayoutUpdate as EventListener);

    return () => {
      window.removeEventListener('layoutEditModeChange', handleEditModeChange as EventListener);
      window.removeEventListener('addBelt', handleAddBelt as EventListener);
      window.removeEventListener('layoutConfigUpdate', handleLayoutUpdate as EventListener);
    };
  }, []);

  return {
    // State
    layoutConfig,
    isEditMode,
    isDragging,
    draggedBuilding,
    resizing,
    tempPosition,
    hasCollision,
    gridRef,
    
    // Methods
    getTotalRows,
    handleBuildingMouseDown,
    handleResizeStart,
    updateBuildingLayout,
    updateMinHeight,
    addBelt,
    removeBelt,
    updateBelt,
    setLayoutConfig,
    handleGridClick,
  };
};
