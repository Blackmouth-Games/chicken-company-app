import { X, RotateCw } from "lucide-react";
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
  onRotate?: () => void;
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
  onRotate,
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

  // Get gradient for belt animation based on direction
  const getBeltAnimationGradient = () => {
    switch (belt.direction) {
      case 'east':
        return 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 30%, rgba(255,255,255,0.5) 70%, transparent 100%)';
      case 'west':
        return 'linear-gradient(270deg, transparent 0%, rgba(255,255,255,0.5) 30%, rgba(255,255,255,0.5) 70%, transparent 100%)';
      case 'south':
        return 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.5) 30%, rgba(255,255,255,0.5) 70%, transparent 100%)';
      case 'north':
        return 'linear-gradient(0deg, transparent 0%, rgba(255,255,255,0.5) 30%, rgba(255,255,255,0.5) 70%, transparent 100%)';
      default:
        return 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 30%, rgba(255,255,255,0.5) 70%, transparent 100%)';
    }
  };

  // Get pattern gradient for additional movement effect
  const getBeltPatternGradient = () => {
    switch (belt.direction) {
      case 'east':
      case 'west':
        return 'repeating-linear-gradient(0deg, transparent 0px, transparent 8px, rgba(0,0,0,0.1) 8px, rgba(0,0,0,0.1) 10px)';
      case 'south':
      case 'north':
        return 'repeating-linear-gradient(90deg, transparent 0px, transparent 8px, rgba(0,0,0,0.1) 8px, rgba(0,0,0,0.1) 10px)';
      default:
        return 'repeating-linear-gradient(0deg, transparent 0px, transparent 8px, rgba(0,0,0,0.1) 8px, rgba(0,0,0,0.1) 10px)';
    }
  };

  return (
    <div 
      className={`flex justify-center relative w-full h-full group z-20 ${isEditMode ? 'ring-2 ring-cyan-500' : ''} ${
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
      }`}>
        {/* Belt image */}
        <img 
          src={beltImage} 
          alt="Conveyor belt" 
          className="w-full h-full object-cover"
          style={{
            transform: getArrowTransform(),
            width: '100%',
            height: '100%',
          }}
        />
        
        {/* Animated moving overlay to simulate belt movement */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: getBeltAnimationGradient(),
            backgroundSize: '200% 200%',
            animation: `beltMove${belt.direction} 1.5s linear infinite`,
            opacity: 0.4,
            mixBlendMode: 'screen',
          }}
        />
        
        {/* Additional moving pattern for more realistic effect */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: getBeltPatternGradient(),
            backgroundSize: '100% 20px',
            animation: `beltMove${belt.direction} 1.5s linear infinite`,
            opacity: 0.2,
            mixBlendMode: 'multiply',
          }}
        />
        
        {isEditMode && (
          <>
            {tempPosition && isDragging && (
              <div className="absolute top-8 right-2 bg-yellow-500 text-black text-xs px-2 py-1 rounded font-bold pointer-events-none z-10">
                → Col {tempPosition.col}, Row {tempPosition.row}
              </div>
            )}
          </>
        )}
        
        {/* Tooltip with actions when belt is selected */}
        {isEditMode && isSelected && !isDragging && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-background/95 backdrop-blur-sm border-2 border-yellow-400 rounded-lg shadow-lg p-2 flex gap-2 z-50 whitespace-nowrap">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              size="sm"
              variant="destructive"
              className="h-8 px-3"
              title="Eliminar cinta"
            >
              <X className="h-4 w-4 mr-1" />
              Eliminar
            </Button>
            {onRotate && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onRotate();
                }}
                size="sm"
                variant="default"
                className="h-8 px-3"
                title="Rotar cinta"
              >
                <RotateCw className="h-4 w-4 mr-1" />
                Rotar
              </Button>
            )}
          </div>
        )}
      </div>
    
      
      <style>{`
        @keyframes beltMoveeast {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        
        @keyframes beltMovewest {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
        
        @keyframes beltMovesouth {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(100%);
          }
        }
        
        @keyframes beltMovenorth {
          0% {
            transform: translateY(100%);
          }
          100% {
            transform: translateY(-100%);
          }
        }
      `}</style>
    </div>
  );
};
