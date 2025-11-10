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
  rotation?: number; // 0, 90, 180, 270
}

type SelectableObject = {
  type: 'building' | 'belt';
  id: string; // belt id or building name (warehouse, market, house, boxes)
};

export interface LayoutConfig {
  warehouse: { gridColumn: string; gridRow: string };
  market: { gridColumn: string; gridRow: string };
  house: { gridColumn: string; gridRow: string };
  boxes: { gridColumn: string; gridRow: string };
  leftCorrals: { gridColumn: string; gap: string; startRow: number; rowSpan?: number };
  rightCorrals: { gridColumn: string; gap: string; startRow: number; rowSpan?: number };
  belts: BeltConfig[];
  grid: { gap: string; maxWidth: string; totalRows?: number };
}

const DEFAULT_LAYOUT: LayoutConfig = {
  house: { gridColumn: '8 / 18', gridRow: '1 / 8' },
  warehouse: { gridColumn: '1 / 8', gridRow: '8 / 15' },
  market: { gridColumn: '16 / 25', gridRow: '8 / 15' },
  boxes: { gridColumn: '8 / 11', gridRow: '11 / 15' },
  leftCorrals: { gridColumn: '1 / 12', gap: '20px', startRow: 16, rowSpan: 8 },
  rightCorrals: { gridColumn: '15 / 26', gap: '20px', startRow: 16, rowSpan: 8 },
  belts: [],
  grid: { gap: '1px', maxWidth: '1600px', totalRows: 40 },
};

const TOTAL_COLUMNS = 30;
const MAX_TOTAL_ROWS = 40;

export const useLayoutEditor = (beltSpanForRows: number = 20) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const gridRef = useRef<HTMLDivElement>(null);
  
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(() => {
    const saved = localStorage.getItem('debugLayoutConfig');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        
        // Migrate old structure to new structure
        const migrated: LayoutConfig = {
          house: {
            gridColumn: parsed.house?.gridColumn || DEFAULT_LAYOUT.house.gridColumn,
            gridRow: parsed.house?.gridRow || DEFAULT_LAYOUT.house.gridRow,
          },
          warehouse: {
            gridColumn: parsed.warehouse?.gridColumn || DEFAULT_LAYOUT.warehouse.gridColumn,
            gridRow: parsed.warehouse?.gridRow || DEFAULT_LAYOUT.warehouse.gridRow,
          },
          market: {
            gridColumn: parsed.market?.gridColumn || DEFAULT_LAYOUT.market.gridColumn,
            gridRow: parsed.market?.gridRow || DEFAULT_LAYOUT.market.gridRow,
          },
          boxes: {
            gridColumn: parsed.boxes?.gridColumn || DEFAULT_LAYOUT.boxes.gridColumn,
            gridRow: parsed.boxes?.gridRow || DEFAULT_LAYOUT.boxes.gridRow,
          },
          leftCorrals: {
            gridColumn: parsed.leftCorrals?.gridColumn || DEFAULT_LAYOUT.leftCorrals.gridColumn,
            gap: parsed.leftCorrals?.gap || DEFAULT_LAYOUT.leftCorrals.gap,
            startRow: parsed.leftCorrals?.startRow || DEFAULT_LAYOUT.leftCorrals.startRow,
            rowSpan: parsed.leftCorrals?.rowSpan || DEFAULT_LAYOUT.leftCorrals.rowSpan,
          },
          rightCorrals: {
            gridColumn: parsed.rightCorrals?.gridColumn || DEFAULT_LAYOUT.rightCorrals.gridColumn,
            gap: parsed.rightCorrals?.gap || DEFAULT_LAYOUT.rightCorrals.gap,
            startRow: parsed.rightCorrals?.startRow || DEFAULT_LAYOUT.rightCorrals.startRow,
            rowSpan: parsed.rightCorrals?.rowSpan || DEFAULT_LAYOUT.rightCorrals.rowSpan,
          },
          belts: Array.isArray(parsed.belts) 
            ? parsed.belts.map((belt: any) => ({
                id: belt.id,
                gridColumn: belt.gridColumn,
                gridRow: belt.gridRow,
                direction: belt.direction || 'south',
                type: belt.type || 'straight',
              }))
            : DEFAULT_LAYOUT.belts,
          grid: {
            gap: parsed.grid?.gap || DEFAULT_LAYOUT.grid.gap,
            maxWidth: parsed.grid?.maxWidth || DEFAULT_LAYOUT.grid.maxWidth,
            totalRows: Math.min(
              MAX_TOTAL_ROWS,
              parsed.grid?.totalRows ?? DEFAULT_LAYOUT.grid.totalRows ?? MAX_TOTAL_ROWS
            ),
          },
        };
        
        return migrated;
      } catch (error) {
        console.error('Error parsing layout config, using default:', error);
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
  const [lastBeltGridPos, setLastBeltGridPos] = useState<{ col: number; row: number } | null>(null);
  const [beltDragOffset, setBeltDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [selectedObject, setSelectedObject] = useState<SelectableObject | null>(null);

  const getTotalRows = (): number => {
    const rows = layoutConfig.grid?.totalRows || beltSpanForRows;
    return Math.min(rows, MAX_TOTAL_ROWS);
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
    const gapPx = parseInt((layoutConfig.grid.gap || '0').toString());
    
    // Calculate cell dimensions from actual grid size
    const totalGapWidth = gapPx * (TOTAL_COLUMNS - 1);
    const totalGapHeight = gapPx * (totalRows - 1);
    const cellWidth = (rect.width - totalGapWidth) / TOTAL_COLUMNS;
    const cellHeight = (rect.height - totalGapHeight) / totalRows;
    
    const col = Math.max(1, Math.min(TOTAL_COLUMNS, Math.floor(relativeX / (cellWidth + gapPx)) + 1));
    const row = Math.max(1, Math.min(totalRows, Math.floor(relativeY / (cellHeight + gapPx)) + 1));
    
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

      // Check bounds against fixed grid size
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

  // Handle building click for selection
  const handleBuildingClick = (buildingName: string) => {
    if (!isEditMode) return;
    setSelectedObject({ type: 'building', id: buildingName });
  };

  // Handle belt click for selection
  const handleBeltClick = (beltId: string) => {
    if (!isEditMode) return;
    setSelectedObject({ type: 'belt', id: beltId });
  };

  // Handle drag start
  const handleBuildingMouseDown = (e: MouseEvent, buildingName: string) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    setSelectedObject({ type: 'building', id: buildingName });
    setDraggedBuilding(buildingName);
    setIsDragging(true);
    
    const gridPos = pixelToGrid(e.clientX, e.clientY);
    setDragOffset({ x: e.clientX, y: e.clientY });
    setTempPosition(gridPos);
  };

  // Handle belt drag start
  const handleBeltMouseDown = (e: MouseEvent, beltId: string) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    setSelectedObject({ type: 'belt', id: beltId });
    setDraggedBelt(beltId);
    setIsDragging(true);
    
    const belt = layoutConfig.belts.find(b => b.id === beltId);
    if (!belt || !gridRef.current) return;
    
    const gridRect = gridRef.current.getBoundingClientRect();
    const beltCol = parseGridNotation(belt.gridColumn);
    const beltRow = parseGridNotation(belt.gridRow);
    
    // Calculate the center position of the belt in pixels
    const cellWidth = (gridRect.width - (parseFloat(layoutConfig.grid.gap.replace('px', '')) || 0) * (TOTAL_COLUMNS - 1)) / TOTAL_COLUMNS;
    const cellHeight = (gridRect.height - (parseFloat(layoutConfig.grid.gap.replace('px', '')) || 0) * (getTotalRows() - 1)) / getTotalRows();
    const gapPx = parseFloat(layoutConfig.grid.gap.replace('px', '')) || 0;
    
    const beltCenterX = gridRect.left + (beltCol.start - 1) * (cellWidth + gapPx) + cellWidth / 2;
    const beltCenterY = gridRect.top + (beltRow.start - 1) * (cellHeight + gapPx) + cellHeight / 2;
    
    // Calculate offset from mouse to belt center
    const offsetX = e.clientX - beltCenterX;
    const offsetY = e.clientY - beltCenterY;
    
    setBeltDragOffset({ x: offsetX, y: offsetY });
    setDragOffset({ x: e.clientX, y: e.clientY });
    
    const gridPos = pixelToGrid(e.clientX, e.clientY);
    setBeltTempPosition(gridPos);
    setLastBeltGridPos(gridPos);
  };

  // Handle resize start
  const handleResizeStart = (e: MouseEvent, buildingName: string, handle: string) => {
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

      if (isDragging && draggedBelt && beltDragOffset) {
        // Always update drag offset to follow mouse smoothly
        setDragOffset({ x: e.clientX, y: e.clientY });
        
        // Update grid position only when it changes
        const gridPos = pixelToGrid(e.clientX, e.clientY);
        if (!lastBeltGridPos || lastBeltGridPos.col !== gridPos.col || lastBeltGridPos.row !== gridPos.row) {
          setBeltTempPosition(gridPos);
          setLastBeltGridPos(gridPos);
        }
      }

      if (resizing) {
        const buildingKey = resizing.building as keyof Pick<LayoutConfig, 'warehouse' | 'market' | 'house' | 'boxes'>;
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

    const handleMouseUp = (e?: MouseEvent) => {
      if (isDragging && draggedBuilding && tempPosition) {
        const buildingKey = draggedBuilding as keyof Pick<LayoutConfig, 'warehouse' | 'market' | 'house' | 'boxes'>;
        const currentConfig = layoutConfig[buildingKey];
        
        const colSpan = parseGridNotation(currentConfig.gridColumn);
        const rowSpan = parseGridNotation(currentConfig.gridRow);
        
        const width = colSpan.end - colSpan.start;
        const height = rowSpan.end - rowSpan.start;
        
        // Move to exact grid position (snap to grid)
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

      if (isDragging && draggedBelt) {
        const belt = layoutConfig.belts.find(b => b.id === draggedBelt);
        if (belt && gridRef.current && e) {
          // Calculate final position from current mouse position
          const finalGridPos = pixelToGrid(e.clientX, e.clientY);
          
          const colSpan = parseGridNotation(belt.gridColumn);
          const rowSpan = parseGridNotation(belt.gridRow);
          
          const width = colSpan.end - colSpan.start;
          const height = rowSpan.end - rowSpan.start;
          
          const newCol = Math.max(1, Math.min(TOTAL_COLUMNS - width + 1, finalGridPos.col));
          const newRow = Math.max(1, Math.min(getTotalRows() - height + 1, finalGridPos.row));
          
          // Only update if position actually changed
          if (newCol !== colSpan.start || newRow !== rowSpan.start) {
            updateBelt(draggedBelt, {
              gridColumn: createGridNotation(newCol, newCol + width),
              gridRow: createGridNotation(newRow, newRow + height),
            });

            toast({
              title: t('layoutEditor.beltMoved'),
              description: t('layoutEditor.beltMovedDesc', { 
                col: newCol.toString(), 
                row: newRow.toString() 
              }),
            });
          }
        } else if (belt && beltTempPosition) {
          // Fallback to beltTempPosition if no event
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
      setLastBeltGridPos(null);
      setBeltDragOffset(null);
    };

    if (isDragging || resizing) {
      window.addEventListener('mousemove', handleMouseMove);
      const handleMouseUpEvent = (e: MouseEvent) => handleMouseUp(e);
      window.addEventListener('mouseup', handleMouseUpEvent);
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUpEvent);
      };
    }
  }, [isDragging, draggedBuilding, draggedBelt, resizing, tempPosition, beltTempPosition, layoutConfig]);

  // Belt management - Add belt with default position
  const addBelt = () => {
    setLayoutConfig(prev => {
      const newBelt: BeltConfig = {
        id: `belt-${Date.now()}`,
        gridColumn: '13 / 14',
        gridRow: '10 / 11',
        direction: 'east',
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
  const updateCorralColumn = (column: 'left' | 'right', updates: Partial<{ gridColumn: string; gap: string; startRow: number; rowSpan: number }>) => {
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

  // Remove handleGridClick - no longer needed

  // Add belt at position - support all directions
  const addBeltAtPosition = (
    col: number, 
    row: number, 
    direction: 'north' | 'south' | 'east' | 'west',
    type: 'straight' | 'curve-ne' | 'curve-nw' | 'curve-se' | 'curve-sw'
  ) => {
    const newBelt: BeltConfig = {
      id: `belt-${Date.now()}`,
      gridColumn: `${col} / ${col + 1}`,
      gridRow: `${row} / ${row + 1}`,
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

  // Delete selected object
  const deleteSelected = () => {
    if (!selectedObject) return;
    
    if (selectedObject.type === 'belt') {
      removeBelt(selectedObject.id);
      setSelectedObject(null);
    } else if (selectedObject.type === 'building') {
      // Buildings can't be deleted, only belts
      toast({
        title: t('layoutEditor.cannotDelete'),
        description: t('layoutEditor.cannotDeleteBuilding'),
        variant: "destructive",
      });
    }
  };

  // Duplicate selected object
  const duplicateSelected = () => {
    if (!selectedObject) return;
    
    if (selectedObject.type === 'belt') {
      const belt = layoutConfig.belts.find(b => b.id === selectedObject.id);
      if (belt) {
        const parsed = parseGridNotation(belt.gridColumn);
        const newBelt: BeltConfig = {
          ...belt,
          id: `belt-${Date.now()}`,
          gridColumn: createGridNotation(parsed.start + 2, parsed.end + 2), // Offset by 2 columns
        };
        
        setLayoutConfig(prev => {
          const newConfig = {
            ...prev,
            belts: [...prev.belts, newBelt],
          };
          saveLayoutToStorage(newConfig);
          setSelectedObject({ type: 'belt', id: newBelt.id });
          toast({
            title: t('layoutEditor.duplicated'),
            description: t('layoutEditor.duplicatedDesc'),
          });
          return newConfig;
        });
      }
    }
  };

  // Rotate selected object
  const rotateSelected = () => {
    if (!selectedObject) return;
    
    if (selectedObject.type === 'belt') {
      const belt = layoutConfig.belts.find(b => b.id === selectedObject.id);
      if (belt) {
        // Cycle through directions: east -> south -> west -> north -> east
        const directionCycle: Record<string, 'north' | 'south' | 'east' | 'west'> = {
          'east': 'south',
          'south': 'west',
          'west': 'north',
          'north': 'east',
        };
        
        updateBelt(belt.id, { direction: directionCycle[belt.direction] });
        toast({
          title: t('layoutEditor.rotated'),
          description: t('layoutEditor.rotatedDesc'),
        });
      }
    }
  };
  
  // External events (edit mode, add belt, config updates)
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
    beltDragOffset,
    dragOffset,
    hasCollision,
    gridRef,
    selectedObject,
    
    // Methods
    getTotalRows,
    handleBuildingMouseDown,
    handleBuildingClick,
    handleBeltMouseDown,
    handleBeltClick,
    handleResizeStart,
    updateBuildingLayout,
    updateCorralColumn,
    addBelt,
    removeBelt,
    updateBelt,
    setLayoutConfig,
    addBeltAtPosition,
    deleteSelected,
    duplicateSelected,
    rotateSelected,
    setSelectedObject,
  };
};
