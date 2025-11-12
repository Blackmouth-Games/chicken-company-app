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
  isOutput?: boolean; // Marks this belt as output for a corral
  isDestiny?: boolean; // Marks this belt as final destination where eggs are removed
  isTransport?: boolean; // Marks this belt as transport belt
  slotPosition?: number; // Position index of the slot this output belt belongs to (0, 1, 2, ...)
  corralId?: string; // Deprecated: use slotPosition instead. Kept for backwards compatibility
}

interface RoadConfig {
  id: string;
  gridColumn: string;
  gridRow: string;
  direction: 'north' | 'south' | 'east' | 'west';
  type: 'straight' | 'curve-ne' | 'curve-nw' | 'curve-se' | 'curve-sw';
  rotation?: number; // 0, 90, 180, 270
  isPointA?: boolean; // Marks this road as point A (start point)
  isTransport?: boolean; // Marks this road as transport (middle section)
  isPointB?: boolean; // Marks this road as point B (destination point)
}

type SelectableObject = {
  type: 'building' | 'belt' | 'road' | 'box';
  id: string; // belt id, road id, or building name (warehouse, market, house, boxes)
};

export interface LayoutConfig {
  warehouse: { gridColumn: string; gridRow: string };
  market: { gridColumn: string; gridRow: string };
  house: { gridColumn: string; gridRow: string };
  boxes: { gridColumn: string; gridRow: string };
  leftCorrals: { gridColumn: string; gap: string; startRow: number; rowSpan?: number };
  rightCorrals: { gridColumn: string; gap: string; startRow: number; rowSpan?: number };
  belts: BeltConfig[];
  roads: RoadConfig[];
  grid: { gap: string; maxWidth: string; totalRows?: number };
}

const DEFAULT_LAYOUT: LayoutConfig = {
  house: { gridColumn: '5 / 11', gridRow: '1 / 7' },
  warehouse: { gridColumn: '1 / 6', gridRow: '7 / 13' },
  market: { gridColumn: '10 / 15', gridRow: '7 / 11' },
  boxes: { gridColumn: '6 / 8', gridRow: '10 / 13' },
  leftCorrals: { gridColumn: '1 / 7', gap: '20px', startRow: 16, rowSpan: 7 },
  rightCorrals: { gridColumn: '10 / 16', gap: '20px', startRow: 16, rowSpan: 7 },
  belts: [
    { id: 'belt-1762856883705', gridColumn: '7 / 8', gridRow: '14 / 15', direction: 'west', type: 'straight' },
    { id: 'belt-1762856884083', gridColumn: '6 / 7', gridRow: '14 / 15', direction: 'west', type: 'straight' },
    { id: 'belt-1762856884637', gridColumn: '5 / 6', gridRow: '14 / 15', direction: 'west', type: 'straight' },
    { id: 'belt-1762856885181', gridColumn: '4 / 5', gridRow: '14 / 15', direction: 'west', type: 'straight' },
    { id: 'belt-1762856885543', gridColumn: '3 / 4', gridRow: '14 / 15', direction: 'west', type: 'straight' },
    { id: 'belt-1762856923052', gridColumn: '2 / 3', gridRow: '13 / 14', direction: 'north', type: 'curve-se' },
    { id: 'belt-1762856948463', gridColumn: '2 / 3', gridRow: '14 / 15', direction: 'north', type: 'curve-se' },
  ],
  roads: [],
  grid: { gap: '1px', maxWidth: '1600px', totalRows: 40 },
};

const TOTAL_COLUMNS = 16;
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
            ? parsed.belts.map((belt: any) => {
                // Preserve all belt properties, including isOutput, isDestiny, isTransport, slotPosition
                const defaultBelt = DEFAULT_LAYOUT.belts.find((b: any) => b.id === belt.id);
                return {
                  id: belt.id,
                  gridColumn: belt.gridColumn,
                  gridRow: belt.gridRow,
                  direction: belt.direction || defaultBelt?.direction || 'south',
                  type: belt.type || defaultBelt?.type || 'straight',
                  isOutput: belt.isOutput ?? defaultBelt?.isOutput ?? false,
                  isDestiny: belt.isDestiny ?? defaultBelt?.isDestiny ?? false,
                  isTransport: belt.isTransport ?? defaultBelt?.isTransport ?? false,
                  slotPosition: belt.slotPosition ?? defaultBelt?.slotPosition,
                  corralId: belt.corralId ?? defaultBelt?.corralId,
                };
              })
            : DEFAULT_LAYOUT.belts,
          roads: Array.isArray(parsed.roads) 
            ? parsed.roads.map((road: any) => ({
                id: road.id,
                gridColumn: road.gridColumn,
                gridRow: road.gridRow,
                direction: road.direction || 'east',
                type: road.type || 'straight',
              }))
            : (parsed.roads || DEFAULT_LAYOUT.roads),
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
  const [draggedRoad, setDraggedRoad] = useState<string | null>(null);
  const [roadTempPosition, setRoadTempPosition] = useState<{ col: number; row: number } | null>(null);
  const [lastRoadGridPos, setLastRoadGridPos] = useState<{ col: number; row: number } | null>(null);
  const [roadDragOffset, setRoadDragOffset] = useState<{ x: number; y: number } | null>(null);
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
  // Uses getBoundingClientRect which automatically accounts for scroll
  // Both clientX/clientY and getBoundingClientRect are relative to viewport
  const pixelToGrid = (x: number, y: number): { col: number; row: number } => {
    if (!gridRef.current) return { col: 1, row: 1 };
    
    const rect = gridRef.current.getBoundingClientRect();
    
    // Calculate position relative to grid element
    // getBoundingClientRect() already accounts for scroll, so this is correct
    const relativeX = x - rect.left;
    const relativeY = y - rect.top;
    
    const totalRows = getTotalRows();
    const gapPx = parseInt((layoutConfig.grid.gap || '0').toString());
    
    // Calculate cell dimensions from actual grid size
    const totalGapWidth = gapPx * (TOTAL_COLUMNS - 1);
    const totalGapHeight = gapPx * (totalRows - 1);
    const cellWidth = (rect.width - totalGapWidth) / TOTAL_COLUMNS;
    const cellHeight = (rect.height - totalGapHeight) / totalRows;
    
    // Calculate column: divide relative position by (cellWidth + gap), add 1 for 1-based indexing
    // Add gapPx/2 to account for rounding and ensure we get the correct cell
    const col = Math.max(1, Math.min(TOTAL_COLUMNS, Math.floor((relativeX + gapPx / 2) / (cellWidth + gapPx)) + 1));
    const row = Math.max(1, Math.min(totalRows, Math.floor((relativeY + gapPx / 2) / (cellHeight + gapPx)) + 1));
    
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

  // Handle road click for selection
  const handleRoadClick = (roadId: string) => {
    if (!isEditMode) return;
    setSelectedObject({ type: 'road', id: roadId });
  };

  // Handle drag start
  const handleBuildingMouseDown = (e: React.MouseEvent | MouseEvent, buildingName: string) => {
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
  const handleBeltMouseDown = (e: React.MouseEvent | MouseEvent, beltId: string) => {
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
    
    // Calculate cell dimensions using the same logic as pixelToGrid for consistency
    const totalRows = getTotalRows();
    const gapPx = parseInt((layoutConfig.grid.gap || '0').toString());
    const totalGapWidth = gapPx * (TOTAL_COLUMNS - 1);
    const totalGapHeight = gapPx * (totalRows - 1);
    const cellWidth = (gridRect.width - totalGapWidth) / TOTAL_COLUMNS;
    const cellHeight = (gridRect.height - totalGapHeight) / totalRows;
    
    // Calculate the center position of the belt in pixels (using same calculation as grid)
    const beltCenterX = gridRect.left + (beltCol.start - 1) * (cellWidth + gapPx) + cellWidth / 2;
    const beltCenterY = gridRect.top + (beltRow.start - 1) * (cellHeight + gapPx) + cellHeight / 2;
    
    // Calculate offset from mouse click position to belt center
    // This ensures the belt follows the mouse correctly without desviation
    const offsetX = e.clientX - beltCenterX;
    const offsetY = e.clientY - beltCenterY;
    
    setBeltDragOffset({ x: offsetX, y: offsetY });
    setDragOffset({ x: e.clientX, y: e.clientY });
    
    const gridPos = pixelToGrid(e.clientX, e.clientY);
    setBeltTempPosition(gridPos);
    setLastBeltGridPos(gridPos);
  };

  // Handle road drag start
  const handleRoadMouseDown = (e: React.MouseEvent | MouseEvent, roadId: string) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    setSelectedObject({ type: 'road', id: roadId });
    setDraggedRoad(roadId);
    setIsDragging(true);
    
    const road = layoutConfig.roads.find(r => r.id === roadId);
    if (!road || !gridRef.current) return;
    
    const gridRect = gridRef.current.getBoundingClientRect();
    const roadCol = parseGridNotation(road.gridColumn);
    const roadRow = parseGridNotation(road.gridRow);
    
    // Calculate cell dimensions using the same logic as pixelToGrid for consistency
    const totalRows = getTotalRows();
    const gapPx = parseInt((layoutConfig.grid.gap || '0').toString());
    const totalGapWidth = gapPx * (TOTAL_COLUMNS - 1);
    const totalGapHeight = gapPx * (totalRows - 1);
    const cellWidth = (gridRect.width - totalGapWidth) / TOTAL_COLUMNS;
    const cellHeight = (gridRect.height - totalGapHeight) / totalRows;
    
    // Roads are 2x2, so calculate center from the first cell
    const roadCenterX = gridRect.left + (roadCol.start - 1) * (cellWidth + gapPx) + cellWidth;
    const roadCenterY = gridRect.top + (roadRow.start - 1) * (cellHeight + gapPx) + cellHeight;
    
    // Calculate offset from mouse click position to road center
    const offsetX = e.clientX - roadCenterX;
    const offsetY = e.clientY - roadCenterY;
    
    setRoadDragOffset({ x: offsetX, y: offsetY });
    setDragOffset({ x: e.clientX, y: e.clientY });
    
    const gridPos = pixelToGrid(e.clientX, e.clientY);
    setRoadTempPosition(gridPos);
    setLastRoadGridPos(gridPos);
  };

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent | MouseEvent, buildingName: string, handle: string) => {
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
        
        // Calculate the visual center position of the belt (where it appears on screen)
        // This is the mouse position minus the offset, which gives us the center of the belt
        const beltCenterX = e.clientX - beltDragOffset.x;
        const beltCenterY = e.clientY - beltDragOffset.y;
        
        // Update grid position based on the visual center of the belt, not the mouse position
        const gridPos = pixelToGrid(beltCenterX, beltCenterY);
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

        // Removed toast notification for building movement
      }

      if (isDragging && draggedBelt) {
        const belt = layoutConfig.belts.find(b => b.id === draggedBelt);
        if (belt && gridRef.current && e && beltDragOffset && dragOffset) {
          // Calculate the visual center position of the belt (where it appears on screen)
          // This is the mouse position minus the offset, which gives us the center of the belt
          const beltCenterX = dragOffset.x - beltDragOffset.x;
          const beltCenterY = dragOffset.y - beltDragOffset.y;
          
          // Calculate final position from the visual center of the belt, not the mouse position
          const finalGridPos = pixelToGrid(beltCenterX, beltCenterY);
          
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

            // Removed toast notification for belt movement
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

          // Removed toast notification for belt movement
        }
      }
      
      if (isDragging && draggedRoad) {
        const road = layoutConfig.roads.find(r => r.id === draggedRoad);
        if (road && gridRef.current && e && roadDragOffset && dragOffset) {
          // Calculate the visual center position of the road (where it appears on screen)
          const roadCenterX = dragOffset.x - roadDragOffset.x;
          const roadCenterY = dragOffset.y - roadDragOffset.y;
          
          // Calculate final position from the visual center of the road, not the mouse position
          const finalGridPos = pixelToGrid(roadCenterX, roadCenterY);
          
          const colSpan = parseGridNotation(road.gridColumn);
          const rowSpan = parseGridNotation(road.gridRow);
          
          const width = colSpan.end - colSpan.start; // Should be 2 for roads
          const height = rowSpan.end - rowSpan.start; // Should be 2 for roads
          
          const newCol = Math.max(1, Math.min(TOTAL_COLUMNS - width + 1, finalGridPos.col));
          const newRow = Math.max(1, Math.min(getTotalRows() - height + 1, finalGridPos.row));
          
          // Only update if position actually changed
          if (newCol !== colSpan.start || newRow !== rowSpan.start) {
            updateRoad(draggedRoad, {
              gridColumn: createGridNotation(newCol, newCol + width),
              gridRow: createGridNotation(newRow, newRow + height),
            });
          }
        } else if (road && roadTempPosition) {
          // Fallback to roadTempPosition if no event
          const colSpan = parseGridNotation(road.gridColumn);
          const rowSpan = parseGridNotation(road.gridRow);
          
          const width = colSpan.end - colSpan.start;
          const height = rowSpan.end - rowSpan.start;
          
          updateRoad(draggedRoad, {
            gridColumn: createGridNotation(roadTempPosition.col, roadTempPosition.col + width),
            gridRow: createGridNotation(roadTempPosition.row, roadTempPosition.row + height),
          });
        }
      }

      setIsDragging(false);
      setDraggedBuilding(null);
      setDraggedBelt(null);
      setDraggedRoad(null);
      setResizing(null);
      setTempPosition(null);
      setBeltTempPosition(null);
      setRoadTempPosition(null);
      setLastBeltGridPos(null);
      setLastRoadGridPos(null);
      setBeltDragOffset(null);
      setRoadDragOffset(null);
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
  }, [isDragging, draggedBuilding, draggedBelt, draggedRoad, resizing, tempPosition, beltTempPosition, roadTempPosition, layoutConfig]);

  // Belt management - Add belt with default position
  const addBelt = () => {
    setLayoutConfig(prev => {
      const newBelt: BeltConfig = {
        id: `belt-${Date.now()}`,
        gridColumn: '13 / 14',
        gridRow: '10 / 11',
        direction: 'east',
        type: 'straight',
        isTransport: true, // Default: all manual belts are transport
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

  // Road management - Add road with default position (2x2)
  // Each time a road is added, find an empty position to avoid overlaps
  const addRoad = () => {
    setLayoutConfig(prev => {
      // Find an empty position for the new road (2x2 cells)
      let foundPosition = false;
      let newCol = 13;
      let newRow = 10;
      
      // Try to find an empty 2x2 area
      for (let row = 1; row <= getTotalRows() - 1 && !foundPosition; row++) {
        for (let col = 1; col <= TOTAL_COLUMNS - 1 && !foundPosition; col++) {
          // Check if this 2x2 area is empty
          const areaCol = parseGridNotation(`${col} / ${col + 2}`);
          const areaRow = parseGridNotation(`${row} / ${row + 2}`);
          
          // Check for collisions with existing roads
          const hasRoadCollision = prev.roads.some(road => {
            const roadCol = parseGridNotation(road.gridColumn);
            const roadRow = parseGridNotation(road.gridRow);
            return !(
              areaCol.end <= roadCol.start || 
              areaCol.start >= roadCol.end ||
              areaRow.end <= roadRow.start || 
              areaRow.start >= roadRow.end
            );
          });
          
          // Check for collisions with buildings
          const testArea: GridArea = {
            colStart: areaCol.start,
            colEnd: areaCol.end,
            rowStart: areaRow.start,
            rowEnd: areaRow.end,
          };
          const hasBuildingCollision = wouldCollide(
            testArea,
            prev,
            'house' // Just check, doesn't matter which building type
          );
          
          if (!hasRoadCollision && !hasBuildingCollision.collides) {
            newCol = col;
            newRow = row;
            foundPosition = true;
          }
        }
      }
      
      const newRoad: RoadConfig = {
        id: `road-${Date.now()}`,
        gridColumn: `${newCol} / ${newCol + 2}`,
        gridRow: `${newRow} / ${newRow + 2}`,
        direction: 'east',
        type: 'straight',
      };
      const newConfig = {
        ...prev,
        roads: [...prev.roads, newRoad],
      };
      saveLayoutToStorage(newConfig);
      toast({
        title: t('layoutEditor.roadAdded'),
        description: t('layoutEditor.roadAddedDesc'),
      });
      return newConfig;
    });
  };

  const removeRoad = (roadId: string) => {
    setLayoutConfig(prev => {
      const newConfig = {
        ...prev,
        roads: prev.roads.filter(r => r.id !== roadId),
      };
      saveLayoutToStorage(newConfig);
      toast({
        title: t('layoutEditor.roadRemoved'),
        description: t('layoutEditor.roadRemovedDesc'),
      });
      return newConfig;
    });
  };

  const updateRoad = (roadId: string, updates: Partial<RoadConfig>) => {
    setLayoutConfig(prev => {
      const newConfig = {
        ...prev,
        roads: prev.roads.map(r => r.id === roadId ? { ...r, ...updates } : r),
      };
      saveLayoutToStorage(newConfig);
      return newConfig;
    });
  };

  const toggleRoadPointA = (roadId: string) => {
    setLayoutConfig(prev => {
      const road = prev.roads.find(r => r.id === roadId);
      if (!road) return prev;
      
      const newConfig = {
        ...prev,
        roads: prev.roads.map(r => {
          if (r.id === roadId) {
            // Toggle point A, clear point B and transport if setting point A
            const isSettingPointA = !r.isPointA;
            return {
              ...r,
              isPointA: isSettingPointA,
              isPointB: isSettingPointA ? false : r.isPointB,
              isTransport: isSettingPointA ? false : r.isTransport,
            };
          }
          return r;
        }),
      };
      saveLayoutToStorage(newConfig);
      return newConfig;
    });
  };

  const toggleRoadPointB = (roadId: string) => {
    setLayoutConfig(prev => {
      const road = prev.roads.find(r => r.id === roadId);
      if (!road) return prev;
      
      const newConfig = {
        ...prev,
        roads: prev.roads.map(r => {
          if (r.id === roadId) {
            // Toggle point B, clear point A and transport if setting point B
            const isSettingPointB = !r.isPointB;
            return {
              ...r,
              isPointB: isSettingPointB,
              isPointA: isSettingPointB ? false : r.isPointA,
              isTransport: isSettingPointB ? false : r.isTransport,
            };
          }
          return r;
        }),
      };
      saveLayoutToStorage(newConfig);
      return newConfig;
    });
  };

  const toggleRoadTransport = (roadId: string) => {
    setLayoutConfig(prev => {
      const road = prev.roads.find(r => r.id === roadId);
      if (!road) return prev;
      
      const newConfig = {
        ...prev,
        roads: prev.roads.map(r => {
          if (r.id === roadId) {
            // Toggle transport, clear point A and point B if setting transport
            const isSettingTransport = !r.isTransport;
            return {
              ...r,
              isTransport: isSettingTransport,
              isPointA: isSettingTransport ? false : r.isPointA,
              isPointB: isSettingTransport ? false : r.isPointB,
            };
          }
          return r;
        }),
      };
      saveLayoutToStorage(newConfig);
      return newConfig;
    });
  };

  const toggleBeltOutput = (beltId: string, slotPosition?: number) => {
    setLayoutConfig(prev => {
      const belt = prev.belts.find(b => b.id === beltId);
      if (!belt) return prev;
      
      const newConfig = {
        ...prev,
        belts: prev.belts.map(b => {
          if (b.id === beltId) {
            // Toggle output, clear destiny and transport if setting output
            const isSettingOutput = !b.isOutput;
            return {
              ...b,
              isOutput: isSettingOutput,
              isDestiny: isSettingOutput ? false : b.isDestiny, // Clear destiny if setting output
              isTransport: isSettingOutput ? false : b.isTransport, // Clear transport if setting output
              slotPosition: isSettingOutput ? slotPosition : undefined,
              corralId: isSettingOutput ? undefined : b.corralId, // Clear old corralId when setting
            };
          }
          // If this belt was output for the same slot, clear it (only one output per slot)
          if (b.slotPosition === slotPosition && b.id !== beltId && slotPosition !== undefined) {
            return { ...b, isOutput: false, slotPosition: undefined, corralId: undefined };
          }
          return b;
        }),
      };
      saveLayoutToStorage(newConfig);
      return newConfig;
    });
  };

  const toggleBeltDestiny = (beltId: string) => {
    setLayoutConfig(prev => {
      const belt = prev.belts.find(b => b.id === beltId);
      if (!belt) return prev;
      
      const newConfig = {
        ...prev,
        belts: prev.belts.map(b => {
          if (b.id === beltId) {
            // Toggle destiny, clear output and transport if setting destiny
            const isSettingDestiny = !b.isDestiny;
            return {
              ...b,
              isDestiny: isSettingDestiny,
              isOutput: isSettingDestiny ? false : b.isOutput, // Clear output if setting destiny
              isTransport: isSettingDestiny ? false : b.isTransport, // Clear transport if setting destiny
              slotPosition: isSettingDestiny ? undefined : b.slotPosition, // Clear slotPosition if setting destiny
              corralId: isSettingDestiny ? undefined : b.corralId,
            };
          }
          return b;
        }),
      };
      saveLayoutToStorage(newConfig);
      return newConfig;
    });
  };

  const toggleBeltTransport = (beltId: string) => {
    setLayoutConfig(prev => {
      const belt = prev.belts.find(b => b.id === beltId);
      if (!belt) return prev;
      
      const newConfig = {
        ...prev,
        belts: prev.belts.map(b => {
          if (b.id === beltId) {
            // Toggle transport, clear output and destiny if setting transport
            const isSettingTransport = !b.isTransport;
            return {
              ...b,
              isTransport: isSettingTransport,
              isOutput: isSettingTransport ? false : b.isOutput, // Clear output if setting transport
              isDestiny: isSettingTransport ? false : b.isDestiny, // Clear destiny if setting transport
              slotPosition: isSettingTransport ? undefined : b.slotPosition, // Clear slotPosition if setting transport
              corralId: isSettingTransport ? undefined : b.corralId,
            };
          }
          return b;
        }),
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
      isTransport: true, // Default: all manual belts are transport
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

  // Add road at position - support all directions (2x2)
  const addRoadAtPosition = (
    col: number, 
    row: number, 
    direction: 'north' | 'south' | 'east' | 'west',
    type: 'straight' | 'curve-ne' | 'curve-nw' | 'curve-se' | 'curve-sw'
  ) => {
    const newRoad: RoadConfig = {
      id: `road-${Date.now()}`,
      gridColumn: `${col} / ${col + 2}`, // Roads are 2x2
      gridRow: `${row} / ${row + 2}`,
      direction,
      type,
    };
    
    setLayoutConfig(prev => {
      const newConfig = {
        ...prev,
        roads: [...prev.roads, newRoad],
      };
      saveLayoutToStorage(newConfig);
      toast({
        title: t('layoutEditor.roadAdded'),
        description: t('layoutEditor.roadAddedAt', { 
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
    } else if (selectedObject.type === 'road') {
      const road = layoutConfig.roads.find(r => r.id === selectedObject.id);
      if (road) {
        const parsed = parseGridNotation(road.gridColumn);
        const newRoad: RoadConfig = {
          ...road,
          id: `road-${Date.now()}`,
          gridColumn: createGridNotation(parsed.start + 3, parsed.end + 3), // Offset by 3 columns for 2x2 road
        };
        
        setLayoutConfig(prev => {
          const newConfig = {
            ...prev,
            roads: [...prev.roads, newRoad],
          };
          saveLayoutToStorage(newConfig);
          setSelectedObject({ type: 'road', id: newRoad.id });
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

    const handleAddRoad = () => {
      addRoad();
    };

    const handleLayoutUpdate = (event: CustomEvent<LayoutConfig>) => {
      setLayoutConfig(event.detail);
    };

    window.addEventListener('layoutEditModeChange', handleEditModeChange as EventListener);
    window.addEventListener('addBelt', handleAddBelt as EventListener);
    window.addEventListener('addRoad', handleAddRoad as EventListener);
    window.addEventListener('layoutConfigUpdate', handleLayoutUpdate as EventListener);

    return () => {
      window.removeEventListener('layoutEditModeChange', handleEditModeChange as EventListener);
      window.removeEventListener('addBelt', handleAddBelt as EventListener);
      window.removeEventListener('addRoad', handleAddRoad as EventListener);
      window.removeEventListener('layoutConfigUpdate', handleLayoutUpdate as EventListener);
    };
  }, [addBelt, addRoad]);

  return {
    // State
    layoutConfig,
    isEditMode,
    isDragging,
    draggedBuilding,
    draggedBelt,
    draggedRoad,
    resizing,
    tempPosition,
    beltTempPosition,
    roadTempPosition,
    beltDragOffset,
    roadDragOffset,
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
    handleRoadMouseDown,
    handleRoadClick,
    handleResizeStart,
    updateBuildingLayout,
    updateCorralColumn,
    addBelt,
    removeBelt,
    updateBelt,
    toggleBeltOutput,
    toggleBeltDestiny,
    toggleBeltTransport,
    setLayoutConfig,
    addBeltAtPosition,
    addRoad,
    removeRoad,
    updateRoad,
    toggleRoadPointA,
    toggleRoadPointB,
    toggleRoadTransport,
    addRoadAtPosition,
    deleteSelected,
    duplicateSelected,
    rotateSelected,
    setSelectedObject,
    pixelToGrid,
  };
};
