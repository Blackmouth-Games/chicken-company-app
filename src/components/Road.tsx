import { X, RotateCw } from "lucide-react";
import { Button } from "./ui/button";
import roadImage from "@/assets/Road_A.jpg";

interface RoadProps {
  road: {
    id: string;
    gridColumn: string;
    gridRow: string;
    direction: 'north' | 'south' | 'east' | 'west';
    type: 'straight' | 'curve-ne' | 'curve-nw' | 'curve-se' | 'curve-sw';
    isPointA?: boolean;
    isTransport?: boolean;
    isPointB?: boolean;
  };
  idx: number;
  isEditMode: boolean;
  isDragging: boolean;
  isSelected: boolean;
  tempPosition: { col: number; row: number } | null;
  dragOffset: { x: number; y: number } | null;
  roadDragOffset: { x: number; y: number } | null;
  onMouseDown: (e: React.MouseEvent) => void;
  onClick: () => void;
  onRemove?: () => void;
  onRotate?: () => void;
  onUpdateColumn: (value: string) => void;
  onUpdateRow: (value: string) => void;
  onTogglePointA?: () => void;
  onToggleTransport?: () => void;
  onTogglePointB?: () => void;
}

export const Road = ({
  road,
  idx,
  isEditMode,
  isDragging,
  isSelected,
  tempPosition,
  dragOffset,
  roadDragOffset,
  onMouseDown,
  onClick,
  onRemove,
  onRotate,
  onUpdateColumn,
  onUpdateRow,
  onTogglePointA,
  onToggleTransport,
  onTogglePointB,
}: RoadProps) => {
  // Get arrow direction based on road direction
  const getArrowTransform = () => {
    switch (road.direction) {
      case 'north': return 'rotate(270deg)';
      case 'south': return 'rotate(90deg)';
      case 'east': return 'rotate(0deg)';
      case 'west': return 'rotate(180deg)';
      default: return 'rotate(0deg)';
    }
  };

  const isCurve = road.type.startsWith('curve-');
  const isVertical = road.direction === 'north' || road.direction === 'south';

  // Calculate position for dragging
  const getPosition = () => {
    if (isDragging && dragOffset && roadDragOffset) {
      // Follow mouse directly during drag
      return {
        left: `${dragOffset.x - roadDragOffset.x}px`,
        top: `${dragOffset.y - roadDragOffset.y}px`,
        transform: 'translate(-50%, -50%)',
      };
    }
    return {};
  };

  // Get border color for edit mode based on road type
  const getEditModeBorderColor = () => {
    if (!isEditMode || !isSelected) return '';
    if (road.isPointA) return 'ring-2 ring-green-500';
    if (road.isPointB) return 'ring-2 ring-red-500';
    if (road.isTransport) return 'ring-2 ring-blue-500';
    return 'ring-2 ring-gray-400';
  };

  // Get dragging border color based on road type
  const getDraggingBorderColor = () => {
    if (!isDragging) return '';
    if (road.isPointA) return 'ring-2 ring-green-400';
    if (road.isPointB) return 'ring-2 ring-red-400';
    if (road.isTransport) return 'ring-2 ring-blue-400';
    return 'ring-2 ring-blue-400';
  };

  const position = getPosition();
  const isManualRoad = !road.id.startsWith('road-auto-');

  return (
    <div
      data-road={road.id}
      className={`absolute ${isDragging ? 'z-30' : 'z-0'} ${isEditMode && isSelected ? 'outline outline-2 outline-offset-2 outline-blue-500' : ''}`}
      style={{
        gridColumn: tempPosition ? `${tempPosition.col} / ${tempPosition.col + 2}` : road.gridColumn,
        gridRow: tempPosition ? `${tempPosition.row} / ${tempPosition.row + 2}` : road.gridRow,
        ...position,
        cursor: isEditMode ? 'move' : 'default',
      }}
      onAuxClick={(e) => {
        // Middle mouse button click (button 1) - open edit modal
        if (e.button === 1 && isEditMode) {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        }
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {/* Main road div - 2x2 cells */}
      <div
        className={`
          relative w-full h-full overflow-hidden
          ${getEditModeBorderColor()}
          ${getDraggingBorderColor()}
        `}
        onMouseDown={onMouseDown}
      >
        {/* Road image */}
        <img 
          src={roadImage} 
          alt="Road" 
          className="w-full h-full object-cover"
          style={{
            transform: getArrowTransform(),
            width: '100%',
            height: '100%',
          }}
        />
        
        {/* Direction indicator arrow */}
        {isEditMode && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="text-white text-xs font-bold"
              style={{ transform: getArrowTransform() }}
            >
              →
            </div>
          </div>
        )}
      </div>

      {/* Action buttons - outside the road */}
      {isEditMode && isSelected && !isDragging && (
        <div
          className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-background/95 backdrop-blur-sm border-2 border-blue-400 rounded-lg shadow-lg p-2 flex flex-col gap-2 z-50 whitespace-nowrap"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {isManualRoad && onRemove && (
            <Button
              size="sm"
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove();
              }}
              className="h-8 px-3"
              title="Eliminar carretera"
            >
              <X className="h-4 w-4 mr-1" />
              Eliminar
            </Button>
          )}
          {isManualRoad && onRotate && (
            <Button
              size="sm"
              variant="default"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRotate();
              }}
              className="h-8 px-3"
              title="Rotar carretera"
            >
              <RotateCw className="h-4 w-4 mr-1" />
              Rotar
            </Button>
          )}
          {isManualRoad && onTogglePointA && (
            <Button
              size="sm"
              variant={road.isPointA ? "default" : "outline"}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onTogglePointA();
              }}
              className="h-8 px-3"
              title="Marcar como punto A (inicio)"
            >
              🟢 Punto A
            </Button>
          )}
          {isManualRoad && onToggleTransport && (
            <Button
              size="sm"
              variant={road.isTransport ? "default" : "outline"}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleTransport();
              }}
              className="h-8 px-3"
              title="Marcar como transporte"
            >
              🚚 Transporte
            </Button>
          )}
          {isManualRoad && onTogglePointB && (
            <Button
              size="sm"
              variant={road.isPointB ? "default" : "outline"}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onTogglePointB();
              }}
              className="h-8 px-3"
              title="Marcar como punto B (destino)"
            >
              🔴 Punto B
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

