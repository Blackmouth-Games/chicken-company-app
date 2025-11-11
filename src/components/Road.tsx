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
  };
  idx: number;
  isEditMode: boolean;
  isDragging: boolean;
  isSelected: boolean;
  tempPosition: { col: number; row: number } | null;
  dragOffset: { x: number; y: number } | null;
  roadDragOffset: { x: number; y: number } | null;
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  onClick: () => void;
  onRemove?: () => void;
  onRotate?: () => void;
  onUpdateColumn: (value: string) => void;
  onUpdateRow: (value: string) => void;
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

  // Get border color for edit mode
  const getEditModeBorderColor = () => {
    if (!isEditMode || !isSelected) return 'transparent';
    return 'border-gray-400';
  };

  // Get dragging border color
  const getDraggingBorderColor = () => {
    if (!isDragging) return 'transparent';
    return 'border-blue-400';
  };

  const position = getPosition();
  const isManualRoad = !road.id.startsWith('road-auto-');

  return (
    <div
      data-road={road.id}
      className={`absolute ${isDragging ? 'z-30' : 'z-5'} ${isEditMode && isSelected ? 'outline outline-2 outline-offset-2 outline-blue-500' : ''}`}
      style={{
        gridColumn: tempPosition ? `${tempPosition.col} / ${tempPosition.col + 2}` : road.gridColumn,
        gridRow: tempPosition ? `${tempPosition.row} / ${tempPosition.row + 2}` : road.gridRow,
        ...position,
        cursor: isEditMode ? 'move' : 'default',
      }}
      onMouseDown={onMouseDown}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {/* Main road div - 2x2 cells */}
      <div
        className={`
          relative w-full h-full
          ${getEditModeBorderColor() ? `border-2 ${getEditModeBorderColor()}` : ''}
          ${getDraggingBorderColor() ? `border-2 ${getDraggingBorderColor()}` : ''}
          ${isEditMode && isSelected ? 'ring-2 ring-blue-500' : ''}
        `}
        style={{
          backgroundColor: '#8B7355', // Road color (brown/gray) - fallback
          backgroundImage: `url(${roadImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          transform: getArrowTransform(),
        }}
      >
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
          className="absolute left-full ml-2 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-40"
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
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          {isManualRoad && onRotate && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRotate();
              }}
              className="h-8 w-8 p-0"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

