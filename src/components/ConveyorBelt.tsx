import { X, RotateCw } from "lucide-react";
import { Button } from "./ui/button";
import beltImage from "@/assets/Belt_A.jpg";
import beltRT from "@/assets/belts/Belt_RT.png";
import beltLT from "@/assets/belts/Belt_LT.png";
import beltFunnel from "@/assets/belts/Belt_funnel.jpg";

interface ConveyorBeltProps {
  belt: {
    id: string;
    gridColumn: string;
    gridRow: string;
    direction: 'north' | 'south' | 'east' | 'west';
    type: 'straight' | 'curve-ne' | 'curve-nw' | 'curve-se' | 'curve-sw' | 'turn' | 'funnel';
    entryDirection?: 'north' | 'south' | 'east' | 'west'; // For turn belts: direction from which items enter
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

  // Get transform for funnel belt image
  // Belt_funnel.jpg: entrada desde West (izquierda), North (arriba), South (abajo) -> salida East (derecha)
  // For other exit directions, rotate the image
  const getFunnelBeltTransform = () => {
    // Base image: West/North/South -> East
    // Rotate based on exit direction
    switch (belt.direction) {
      case 'east':
        // Exit east - image is already correct
        return 'rotate(0deg)';
      case 'south':
        // Exit south - rotate 90° clockwise
        return 'rotate(90deg)';
      case 'west':
        // Exit west - rotate 180°
        return 'rotate(180deg)';
      case 'north':
        // Exit north - rotate 270° (or -90°)
        return 'rotate(270deg)';
      default:
        return 'rotate(0deg)';
    }
  };

  // Get transform for turn belt image based on exit direction
  // RT image base: East -> North (entra desde la derecha, sale hacia arriba)
  // LT image base: West -> North (entra desde la izquierda, sale hacia arriba)
  // Las imágenes están diseñadas para salir hacia North, así que solo necesitamos rotarlas según la salida
  // IMPORTANTE: La rotación solo orienta la salida, NO cambia el giro de 90° de la cinta
  const getTurnBeltTransform = () => {
    // Las imágenes LT y RT están diseñadas para salir hacia North (arriba)
    // Solo necesitamos rotar la imagen según la dirección de salida
    // La cinta siempre hace un giro de 90° (no 180°), solo rotamos la imagen para orientar la salida
    switch (belt.direction) {
      case 'north':
        // Salida norte - imagen ya está correcta (sin rotación)
        return 'rotate(0deg)';
      case 'east':
        // Salida este - rotar 90° en sentido horario desde north
        return 'rotate(90deg)';
      case 'south':
        // Salida sur - rotar 180° desde north (esto orienta la salida hacia abajo, pero el giro sigue siendo 90°)
        return 'rotate(180deg)';
      case 'west':
        // Salida oeste - rotar 270° (o -90°) desde north
        return 'rotate(270deg)';
      default:
        return 'rotate(0deg)';
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
  const isTurn = belt.type === 'turn';
  const isFunnel = belt.type === 'funnel';
  const isVertical = belt.direction === 'north' || belt.direction === 'south';

  // Get turn belt image based on entry and exit directions
  // RT: Right to Top (entra desde East, sale hacia North) - giro antihorario
  // LT: Left to Top (entra desde West, sale hacia North) - giro horario
  // For clockwise 90° turn, we need to select the correct base image
  // The images are designed for North exit, so we need to:
  // 1. Determine the actual entry direction (from belt.entryDirection or calculate from exit)
  // 2. For North exit: use RT if entry is East, LT if entry is West
  // 3. For other exits: we need to "rotate" the entry/exit conceptually to match North exit pattern
  const getTurnBeltImage = () => {
    // Calculate expected entry direction from exit direction (clockwise 90°)
    const getEntryFromExit = (exit: 'north' | 'south' | 'east' | 'west'): 'north' | 'south' | 'east' | 'west' => {
      const directions: ('north' | 'south' | 'east' | 'west')[] = ['north', 'east', 'south', 'west'];
      const exitIndex = directions.indexOf(exit);
      const entryIndex = (exitIndex - 1 + 4) % 4; // -1 for clockwise (go back one)
      return directions[entryIndex];
    };
    
    const expectedEntry = getEntryFromExit(belt.direction);
    
    // Use entry direction from belt if available, otherwise use calculated
    const entryDir = belt.entryDirection || expectedEntry;
    
    // RT and LT images are designed for North exit
    // RT: East -> North (entra desde la derecha, sale hacia arriba)
    // LT: West -> North (entra desde la izquierda, sale hacia arriba)
    
    // For North exit, choose based on entry
    if (belt.direction === 'north') {
      if (entryDir === 'east') {
        return beltRT; // East -> North (RT)
      } else if (entryDir === 'west') {
        return beltLT; // West -> North (LT)
      }
    }
    
    // For other exits, we need to conceptually "rotate" to match North exit pattern
    // East exit: entry should be North -> use RT (North is "right" relative to East exit)
    // South exit: entry should be West -> use LT (West is "left" relative to South exit)  
    // West exit: entry should be South -> use RT (South is "right" relative to West exit)
    if (belt.direction === 'east') {
      // East exit: if entry is North, use RT; if entry is South, use LT
      if (entryDir === 'north') {
        return beltRT; // North -> East (conceptually like East -> North)
      } else if (entryDir === 'south') {
        return beltLT; // South -> East (conceptually like West -> North)
      }
    } else if (belt.direction === 'south') {
      // South exit: if entry is West, use LT; if entry is East, use RT
      if (entryDir === 'west') {
        return beltLT; // West -> South (conceptually like West -> North)
      } else if (entryDir === 'east') {
        return beltRT; // East -> South (conceptually like East -> North)
      }
    } else if (belt.direction === 'west') {
      // West exit: if entry is South, use RT; if entry is North, use LT
      if (entryDir === 'south') {
        return beltRT; // South -> West (conceptually like East -> North)
      } else if (entryDir === 'north') {
        return beltLT; // North -> West (conceptually like West -> North)
      }
    }
    
    // Fallback: use LT for consistency
    return beltLT;
  };

  // Get gradient for belt animation based on direction - designed for seamless 100% loop
  // Pattern size: 60px for perfect loop
  const getBeltAnimationGradient = () => {
    switch (belt.direction) {
      case 'east':
        // Gradient that repeats seamlessly - bright spot moves from left to right
        return 'repeating-linear-gradient(90deg, transparent 0%, transparent 40%, rgba(255,255,255,0.6) 45%, rgba(255,255,255,0.6) 55%, transparent 60%, transparent 100%)';
      case 'west':
        // Gradient that repeats seamlessly - bright spot moves from right to left
        return 'repeating-linear-gradient(270deg, transparent 0%, transparent 40%, rgba(255,255,255,0.6) 45%, rgba(255,255,255,0.6) 55%, transparent 60%, transparent 100%)';
      case 'south':
        // Gradient that repeats seamlessly - bright spot moves from top to bottom
        return 'repeating-linear-gradient(180deg, transparent 0%, transparent 40%, rgba(255,255,255,0.6) 45%, rgba(255,255,255,0.6) 55%, transparent 60%, transparent 100%)';
      case 'north':
        // Gradient that repeats seamlessly - bright spot moves from bottom to top
        return 'repeating-linear-gradient(0deg, transparent 0%, transparent 40%, rgba(255,255,255,0.6) 45%, rgba(255,255,255,0.6) 55%, transparent 60%, transparent 100%)';
      default:
        return 'repeating-linear-gradient(90deg, transparent 0%, transparent 40%, rgba(255,255,255,0.6) 45%, rgba(255,255,255,0.6) 55%, transparent 60%, transparent 100%)';
    }
  };

  // Get pattern gradient for additional movement effect - 20px pattern for perfect loop
  const getBeltPatternGradient = () => {
    switch (belt.direction) {
      case 'east':
      case 'west':
        return 'repeating-linear-gradient(0deg, transparent 0px, transparent 8px, rgba(0,0,0,0.15) 8px, rgba(0,0,0,0.15) 10px, transparent 10px, transparent 18px, rgba(0,0,0,0.15) 18px, rgba(0,0,0,0.15) 20px)';
      case 'south':
      case 'north':
        return 'repeating-linear-gradient(90deg, transparent 0px, transparent 8px, rgba(0,0,0,0.15) 8px, rgba(0,0,0,0.15) 10px, transparent 10px, transparent 18px, rgba(0,0,0,0.15) 18px, rgba(0,0,0,0.15) 20px)';
      default:
        return 'repeating-linear-gradient(0deg, transparent 0px, transparent 8px, rgba(0,0,0,0.15) 8px, rgba(0,0,0,0.15) 10px, transparent 10px, transparent 18px, rgba(0,0,0,0.15) 18px, rgba(0,0,0,0.15) 20px)';
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
      onAuxClick={(e) => {
        // Middle mouse button click (button 1) - open edit modal
        if (e.button === 1 && isEditMode) {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        }
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
      data-belt={belt.id}
    >
      <div 
        className={`w-full h-full relative overflow-hidden ${
          isEditMode ? 'cursor-move' : ''
        }`}
        onMouseDown={onMouseDown}
        style={{
          // Extend slightly beyond boundaries to cover gaps
          margin: '-0.5px',
          width: 'calc(100% + 1px)',
          height: 'calc(100% + 1px)',
        }}
      >
        {/* Belt image */}
        {!isTurn && !isFunnel && (
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
        )}
        
        {/* Turn belt visual - shows curved belt image */}
        {isTurn && (
          <img 
            src={getTurnBeltImage()} 
            alt="Turn belt" 
            className="w-full h-full object-cover"
            style={{
              transform: getTurnBeltTransform(),
            }}
          />
        )}
        
        {/* Funnel belt visual - uses Belt_funnel.jpg image */}
        {isFunnel && (
          <img 
            src={beltFunnel} 
            alt="Funnel belt" 
            className="w-full h-full object-cover"
            style={{
              transform: getFunnelBeltTransform(),
            }}
          />
        )}
        
        {/* Animated moving overlay to simulate belt movement - 100% perfect loop */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: getBeltAnimationGradient(),
            backgroundSize: belt.direction === 'east' || belt.direction === 'west' ? '60px 100%' : '100% 60px',
            animation: `beltMove${belt.direction} 1.2s linear infinite`,
            opacity: 0.5,
            mixBlendMode: 'screen',
          }}
        />
        
        {/* Additional moving pattern for more realistic effect - 100% perfect loop */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: getBeltPatternGradient(),
            backgroundSize: belt.direction === 'east' || belt.direction === 'west' ? '20px 100%' : '100% 20px',
            animation: `beltPatternMove${belt.direction} 0.8s linear infinite`,
            opacity: 0.25,
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
          className="absolute left-full ml-1 top-1/2 -translate-y-1/2 bg-background/95 backdrop-blur-sm border border-yellow-400 rounded shadow-lg p-1 flex flex-col gap-1 z-50 whitespace-nowrap"
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
              className="h-6 px-2 text-xs"
              title="Eliminar cinta"
            >
              <X className="h-3 w-3 mr-0.5" />
              <span className="text-[10px]">Eliminar</span>
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
              className="h-6 px-2 text-xs"
              title="Rotar cinta"
            >
              <RotateCw className="h-3 w-3 mr-0.5" />
              <span className="text-[10px]">Rotar</span>
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
              className="h-6 px-2 text-xs"
              title="Marcar como salida de corral"
            >
              <span className="text-[10px]">🥚 Out</span>
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
              className="h-6 px-2 text-xs"
              title="Marcar como destino final"
            >
              <span className="text-[10px]">🎯 Dest</span>
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
              className="h-6 px-2 text-xs"
              title="Marcar como cinta de transporte"
            >
              <span className="text-[10px]">🚚 Trans</span>
            </Button>
          )}
        </div>
      )}
      
      <style>{`
        /* Main gradient animation - 100% perfect loop (60px pattern) */
        @keyframes beltMoveeast {
          0% {
            backgroundPosition: 0px 0%;
          }
          100% {
            backgroundPosition: 60px 0%;
          }
        }
        
        @keyframes beltMovewest {
          0% {
            backgroundPosition: 0px 0%;
          }
          100% {
            backgroundPosition: -60px 0%;
          }
        }
        
        @keyframes beltMovesouth {
          0% {
            backgroundPosition: 0% 0px;
          }
          100% {
            backgroundPosition: 0% 60px;
          }
        }
        
        @keyframes beltMovenorth {
          0% {
            backgroundPosition: 0% 0px;
          }
          100% {
            backgroundPosition: 0% -60px;
          }
        }
        
        /* Pattern animation - 100% perfect loop (20px pattern) */
        @keyframes beltPatternMoveeast {
          0% {
            backgroundPosition: 0px 0%;
          }
          100% {
            backgroundPosition: 20px 0%;
          }
        }
        
        @keyframes beltPatternMovewest {
          0% {
            backgroundPosition: 0px 0%;
          }
          100% {
            backgroundPosition: -20px 0%;
          }
        }
        
        @keyframes beltPatternMovesouth {
          0% {
            backgroundPosition: 0% 0px;
          }
          100% {
            backgroundPosition: 0% 20px;
          }
        }
        
        @keyframes beltPatternMovenorth {
          0% {
            backgroundPosition: 0% 0px;
          }
          100% {
            backgroundPosition: 0% -20px;
          }
        }
      `}</style>
    </div>
  );
};
