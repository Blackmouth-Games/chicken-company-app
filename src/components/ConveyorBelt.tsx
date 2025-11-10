import { X } from "lucide-react";
import { Button } from "./ui/button";
import beltImage from "@/assets/belt_A.png";

interface ConveyorBeltProps {
  belt: {
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
  onMouseDown: (e: React.MouseEvent) => void;
  onClick: () => void;
  onRemove: () => void;
  onUpdateColumn: (value: string) => void;
  onUpdateRow: (value: string) => void;
}

export const ConveyorBelt = ({
  belt,
  idx,
  isEditMode,
  isDragging,
  isSelected,
  tempPosition,
  onMouseDown,
  onClick,
  onRemove,
  onUpdateColumn,
  onUpdateRow,
}: ConveyorBeltProps) => {
  // Get arrow direction based on belt direction
  const getArrowTransform = () => {
    switch (belt.direction) {
      case 'north': return 'rotate(270deg)';
      case 'south': return 'rotate(90deg)';
      case 'east': return 'rotate(0deg)';
      case 'west': return 'rotate(180deg)';
      default: return 'rotate(0deg)';
    }
  };

  // Get curve path for curved belts
  const getCurvePath = () => {
    switch (belt.type) {
      case 'curve-ne': return 'M 10 50 Q 10 10, 50 10 L 90 10';
      case 'curve-nw': return 'M 90 50 Q 90 10, 50 10 L 10 10';
      case 'curve-se': return 'M 10 50 Q 10 90, 50 90 L 90 90';
      case 'curve-sw': return 'M 90 50 Q 90 90, 50 90 L 10 90';
      default: return '';
    }
  };

  const isCurve = belt.type.startsWith('curve-');
  const isVertical = belt.direction === 'north' || belt.direction === 'south';

  return (
    <div 
      className={`flex justify-center relative w-full h-full group ${isEditMode ? 'ring-2 ring-cyan-500' : ''} ${
        isDragging ? 'ring-4 ring-cyan-600 ring-offset-4 opacity-50' : ''
      } ${isSelected ? 'ring-4 ring-yellow-400 ring-offset-4' : ''}`}
      style={{ 
        gridColumn: belt.gridColumn,
        gridRow: belt.gridRow
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onMouseDown={onMouseDown}
      data-belt={belt.id}
    >
      <div className={`w-full h-full relative overflow-hidden ${
        isEditMode ? 'cursor-move' : ''
      } ${isVertical ? 'min-w-[20px]' : 'min-h-[20px]'}`}>
        {/* Belt image */}
        <img 
          src={beltImage} 
          alt="Conveyor belt" 
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            transform: getArrowTransform(),
          }}
        />
        
        {isEditMode && (
          <>
            <div className="absolute top-2 right-2 bg-cyan-600 text-white text-xs px-2 py-1 rounded font-mono pointer-events-none z-10">
              {belt.direction.toUpperCase()} - {belt.type}
            </div>
            {tempPosition && isDragging && (
              <div className="absolute top-8 right-2 bg-yellow-500 text-black text-xs px-2 py-1 rounded font-bold pointer-events-none z-10">
                → Col {tempPosition.col}, Row {tempPosition.row}
              </div>
            )}
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              size="sm"
              variant="destructive"
              className="absolute top-2 left-2 h-7 w-7 p-0 z-10"
              title="Eliminar cinta"
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    
      
      <style>{`
        @keyframes beltMove {
          0% {
            transform: ${getArrowTransform()} translateY(-10px);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: ${getArrowTransform()} translateY(10px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};
