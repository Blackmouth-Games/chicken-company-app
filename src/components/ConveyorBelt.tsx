import { X, RotateCw } from "lucide-react";
import { Button } from "./ui/button";
import beltImage from "@/assets/Belt_A.jpg";

interface ConveyorBeltProps {
  belt: {
    id: string;
    gridColumn: string;
    gridRow: string;
    direction: 'north' | 'south' | 'east' | 'west';
    type: 'straight' | 'curve-ne' | 'curve-nw' | 'curve-se' | 'curve-sw';
  isOutput?: boolean;
  isDestiny?: boolean;
  isTransport?: boolean;
  corralId?: string;
  };
  idx: number;
  isEditMode: boolean;
  isDragging: boolean;
  isSelected: boolean;
  tempPosition: { col: number; row: number } | null;
  dragOffset: { x: number; y: number } | null;
  beltDragOffset: { x: number; y: number } | null;
  onMouseDown: (e: React.MouseEvent) => void;
  onClick: () => void;
  onRemove?: () => void;
  onRotate?: () => void;
  onUpdateColumn: (value: string) => void;
  onUpdateRow: (value: string) => void;
  onToggleOutput?: () => void;
  onToggleDestiny?: () => void;
  onToggleTransport?: () => void;
}

export const ConveyorBelt = ({
  belt,
  idx,
  isEditMode,
  isDragging,
  isSelected,
  tempPosition,
  dragOffset,
  beltDragOffset,
  onMouseDown,
  onClick,
  onRemove,
  onRotate,
  onUpdateColumn,
  onUpdateRow,
  onToggleOutput,
  onToggleDestiny,
  onToggleTransport,
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

  // Get gradient for belt animation based on direction - designed for seamless loop
  const getBeltAnimationGradient = () => {
    switch (belt.direction) {
      case 'east':
        // Gradient that repeats seamlessly - bright spot moves from left to right
        return 'repeating-linear-gradient(90deg, transparent 0%, transparent 40%, rgba(255,255,255,0.5) 45%, rgba(255,255,255,0.5) 55%, transparent 60%, transparent 100%)';
      case 'west':
        // Gradient that repeats seamlessly - bright spot moves from right to left
        return 'repeating-linear-gradient(270deg, transparent 0%, transparent 40%, rgba(255,255,255,0.5) 45%, rgba(255,255,255,0.5) 55%, transparent 60%, transparent 100%)';
      case 'south':
        // Gradient that repeats seamlessly - bright spot moves from top to bottom
        return 'repeating-linear-gradient(180deg, transparent 0%, transparent 40%, rgba(255,255,255,0.5) 45%, rgba(255,255,255,0.5) 55%, transparent 60%, transparent 100%)';
      case 'north':
        // Gradient that repeats seamlessly - bright spot moves from bottom to top
        return 'repeating-linear-gradient(0deg, transparent 0%, transparent 40%, rgba(255,255,255,0.5) 45%, rgba(255,255,255,0.5) 55%, transparent 60%, transparent 100%)';
      default:
        return 'repeating-linear-gradient(90deg, transparent 0%, transparent 40%, rgba(255,255,255,0.5) 45%, rgba(255,255,255,0.5) 55%, transparent 60%, transparent 100%)';
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

  // Calculate position for smooth mouse following during drag
  const getDragStyle = () => {
    if (isDragging && dragOffset && beltDragOffset) {
      // Calculate absolute position based on mouse position minus the offset
      // This ensures the belt follows the mouse smoothly while maintaining the offset
      const left = dragOffset.x - beltDragOffset.x;
      const top = dragOffset.y - beltDragOffset.y;
      return {
        position: 'fixed' as const,
        left: `${left}px`,
        top: `${top}px`,
        width: 'var(--cell-size, 40px)',
        height: 'var(--cell-size, 40px)',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none' as const,
        zIndex: 1000,
      };
    }
    return {};
  };

  // Get border color based on belt type when in edit mode
  const getEditModeBorderColor = () => {
    if (!isEditMode) return '';
    
    if (belt.isOutput) {
      return 'ring-2 ring-green-500';
    } else if (belt.isDestiny) {
      return 'ring-2 ring-red-500';
    } else if (belt.isTransport) {
      return 'ring-2 ring-blue-500';
    } else {
      return 'ring-2 ring-cyan-500'; // Default color
    }
  };

  // Get dragging border color based on belt type
  const getDraggingBorderColor = () => {
    if (!isDragging) return '';
    
    if (belt.isOutput) {
      return 'ring-4 ring-green-600 ring-offset-4 opacity-50';
    } else if (belt.isDestiny) {
      return 'ring-4 ring-red-600 ring-offset-4 opacity-50';
    } else if (belt.isTransport) {
      return 'ring-4 ring-blue-600 ring-offset-4 opacity-50';
    } else {
      return 'ring-4 ring-cyan-600 ring-offset-4 opacity-50'; // Default color
    }
  };

  return (
    <div 
      className={`flex justify-center relative w-full h-full group z-5 ${getEditModeBorderColor()} ${
        getDraggingBorderColor()
      } ${isSelected ? 'ring-4 ring-yellow-400 ring-offset-4' : ''}`}
      style={{ 
        ...(isDragging ? {} : {
          gridColumn: belt.gridColumn,
          gridRow: belt.gridRow,
        }),
        ...getDragStyle(),
      }}
      onClick={(e) => {
        // Don't trigger click if clicking on action buttons
        const target = e.target as HTMLElement;
        if (target.closest('.absolute.left-full')) {
          return;
        }
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
            backgroundSize: belt.direction === 'east' || belt.direction === 'west' ? '50px 100%' : '100% 50px',
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
            backgroundSize: belt.direction === 'east' || belt.direction === 'west' ? '20px 100%' : '100% 20px',
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
        
        {/* No tooltip inside the belt */}
      </div>
      
      {/* Action buttons outside the belt - positioned to the right */}
      {isEditMode && isSelected && !isDragging && (
        <div 
          className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-background/95 backdrop-blur-sm border-2 border-yellow-400 rounded-lg shadow-lg p-2 flex flex-col gap-2 z-50 whitespace-nowrap"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
        >
          {onRemove && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
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
          )}
          {onRotate && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
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
          {onToggleOutput && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onToggleOutput();
              }}
              size="sm"
              variant={belt.isOutput ? "default" : "outline"}
              className="h-8 px-3"
              title="Marcar como salida de corral"
            >
              🥚 Output
            </Button>
          )}
          {onToggleDestiny && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onToggleDestiny();
              }}
              size="sm"
              variant={belt.isDestiny ? "default" : "outline"}
              className="h-8 px-3"
              title="Marcar como destino final"
            >
              🎯 Destiny
            </Button>
          )}
          {onToggleTransport && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onToggleTransport();
              }}
              size="sm"
              variant={belt.isTransport ? "default" : "outline"}
              className="h-8 px-3"
              title="Marcar como cinta de transporte"
            >
              🚚 Transporte
            </Button>
          )}
        </div>
      )}
      
      <style>{`
        @keyframes beltMoveeast {
          0% {
            backgroundPosition: 0% 0%;
          }
          100% {
            backgroundPosition: 50px 0%;
          }
        }
        
        @keyframes beltMovewest {
          0% {
            backgroundPosition: 0% 0%;
          }
          100% {
            backgroundPosition: -50px 0%;
          }
        }
        
        @keyframes beltMovesouth {
          0% {
            backgroundPosition: 0% 0%;
          }
          100% {
            backgroundPosition: 0% 50px;
          }
        }
        
        @keyframes beltMovenorth {
          0% {
            backgroundPosition: 0% 0%;
          }
          100% {
            backgroundPosition: 0% -50px;
          }
        }
      `}</style>
    </div>
  );
};
