import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
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
  direction: 'north' | 'south' | 'east' | 'west';
  type: 'straight' | 'curve-ne' | 'curve-nw' | 'curve-se' | 'curve-sw';
}

export interface LayoutConfig {
  warehouse: { gridColumn: string; gridRow: string };
  market: { gridColumn: string; gridRow: string };
  house: { gridColumn: string; gridRow: string };
  boxes: { gridColumn: string; gridRow: string };
  leftCorrals: { gridColumn: string; gap: string };
  rightCorrals: { gridColumn: string; gap: string };
  belts: BeltConfig[];
  grid: { gap: string; maxWidth: string };
}

const DEFAULT_LAYOUT: LayoutConfig = {
  warehouse: { gridColumn: '1 / 7', gridRow: '1 / 4' },
  market: { gridColumn: '20 / 26', gridRow: '1 / 4' },
  house: { gridColumn: '11 / 16', gridRow: '1 / 3' },
  boxes: { gridColumn: '6 / 8', gridRow: '3 / 5' },
  leftCorrals: { gridColumn: '1 / 7', gap: '20px' },
  rightCorrals: { gridColumn: '20 / 26', gap: '20px' },
  belts: [{ id: 'belt-1', gridColumn: '13 / 14', gridRow: '1 / span 20', direction: 'south', type: 'straight' }],
  grid: { gap: '20px', maxWidth: '1600px' },
};

const TOTAL_COLUMNS = 25;

export const useLayoutEditor = (beltSpanForRows: number = 20) => {
  const { toast } = useToast();
  const { t } = useLanguage();
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
  const [draggedBelt, setDraggedBelt] = useState<string | null>(null);
  const [beltTempPosition, setBeltTempPosition] = useState<{ col: number; row: number } | null>(null);

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
    building: keyof Pick<LayoutConfig, 'warehouse' | 'market' | 'house' | 'boxes'>,
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
          title: t('layoutEditor.outOfBounds'),
          description: t('layoutEditor.outOfBoundsDesc'),
          variant: "destructive",
        });
        return false;
      }

      // Check collisions
      const collision = wouldCollide(newArea, layoutConfig, building);
      if (collision.collides) {
        toast({
          title: t('layoutEditor.collisionDetected'),
          description: t('layoutEditor.collisionDesc', { building: collision.collidingWith || '' }),
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

  // Handle belt drag start
  const handleBeltMouseDown = (e: React.MouseEvent, beltId: string) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    setDraggedBelt(beltId);
    setIsDragging(true);
    
    const gridPos = pixelToGrid(e.clientX, e.clientY);
    setDragOffset({ x: e.clientX, y: e.clientY });
    setBeltTempPosition(gridPos);
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

      if (isDragging && draggedBelt) {
        const gridPos = pixelToGrid(e.clientX, e.clientY);
        setBeltTempPosition(gridPos);
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
            title: t('layoutEditor.buildingMoved'),
            description: t('layoutEditor.buildingMovedDesc', { 
              building: draggedBuilding, 
              col: tempPosition.col.toString(), 
              row: tempPosition.row.toString() 
            }),
          });
        }
      }

      if (isDragging && draggedBelt && beltTempPosition) {
        const belt = layoutConfig.belts.find(b => b.id === draggedBelt);
        if (belt) {
          const colSpan = parseGridNotation(belt.gridColumn);
          const rowSpan = parseGridNotation(belt.gridRow);
          
          const width = colSpan.end - colSpan.start;
          const height = rowSpan.end - rowSpan.start;
          
          updateBelt(draggedBelt, {
            gridColumn: createGridNotation(beltTempPosition.col, beltTempPosition.col + width),
            gridRow: createGridNotation(beltTempPosition.row, beltTempPosition.row + height),
          });

          toast({
            title: t('layoutEditor.beltMoved'),
            description: t('layoutEditor.beltMovedDesc', { 
              col: beltTempPosition.col.toString(), 
              row: beltTempPosition.row.toString() 
            }),
          });
        }
      }
      
      setIsDragging(false);
      setDraggedBuilding(null);
      setDraggedBelt(null);
      setResizing(null);
      setTempPosition(null);
      setBeltTempPosition(null);
    };

    if (isDragging || resizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, draggedBuilding, draggedBelt, resizing, tempPosition, beltTempPosition, layoutConfig]);

  // Belt management
  const addBelt = () => {
    setLayoutConfig(prev => {
      const newBelt: BeltConfig = {
        id: `belt-${Date.now()}`,
        gridColumn: '13 / 14',
        gridRow: '1 / span 20',
        direction: 'south',
        type: 'straight',
      };
      const newConfig = {
        ...prev,
        belts: [...prev.belts, newBelt],
      };
      saveLayoutToStorage(newConfig);
      toast({
        title: t('layoutEditor.beltAdded'),
        description: t('layoutEditor.beltAddedDesc'),
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
        title: t('layoutEditor.beltRemoved'),
        description: t('layoutEditor.beltRemovedDesc'),
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

  // Update corral column layout
  const updateCorralColumn = (column: 'left' | 'right', updates: Partial<{ gridColumn: string; gap: string }>) => {
    const key = column === 'left' ? 'leftCorrals' : 'rightCorrals';
    setLayoutConfig(prev => {
      const newConfig = {
        ...prev,
        [key]: {
          ...prev[key],
          ...updates,
        },
      };
      saveLayoutToStorage(newConfig);
      return newConfig;
    });
  };

  // Handle grid cell click to add belt
  const handleGridClick = (e: React.MouseEvent) => {
    if (!isEditMode) return;
    
    // Check if click is on an element with specific classes (building or belt)
    const target = e.target as HTMLElement;
    const isBuilding = target.closest('[data-building]');
    const isBelt = target.closest('[data-belt]');
    
    if (isBuilding || isBelt) {
      return; // Don't add belt if clicking on a building or belt
    }
    
    const gridPos = pixelToGrid(e.clientX, e.clientY);
    
    // Trigger dialog instead of prompt
    window.dispatchEvent(new CustomEvent('openAddBeltDialog', { 
      detail: { col: gridPos.col, row: gridPos.row } 
    }));
  };

  // Add belt with specified direction and type
  const addBeltAtPosition = (
    col: number, 
    row: number, 
    direction: 'north' | 'south' | 'east' | 'west',
    type: 'straight' | 'curve-ne' | 'curve-nw' | 'curve-se' | 'curve-sw'
  ) => {
    const totalRows = getTotalRows();
    const isVertical = direction === 'north' || direction === 'south';
    
    const newBelt: BeltConfig = {
      id: `belt-${Date.now()}`,
      gridColumn: isVertical 
        ? `${col} / ${col + 1}` 
        : `${col} / span 3`,
      gridRow: isVertical 
        ? `${row} / span 3` 
        : `${row} / ${row + 1}`,
      direction,
      type,
    };
    
    setLayoutConfig(prev => {
      const newConfig = {
        ...prev,
        belts: [...prev.belts, newBelt],
      };
      saveLayoutToStorage(newConfig);
      toast({
        title: t('layoutEditor.beltAdded'),
        description: t('layoutEditor.beltAddedAt', { 
          direction: t(`layoutEditor.direction_${direction}`),
          col: col.toString(), 
          row: row.toString() 
        }),
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
    draggedBelt,
    resizing,
    tempPosition,
    beltTempPosition,
    hasCollision,
    gridRef,
    
    // Methods
    getTotalRows,
    handleBuildingMouseDown,
    handleBeltMouseDown,
    handleResizeStart,
    updateBuildingLayout,
    updateCorralColumn,
    addBelt,
    removeBelt,
    updateBelt,
    setLayoutConfig,
    handleGridClick,
    addBeltAtPosition,
  };
};
