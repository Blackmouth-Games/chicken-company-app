import { X, RotateCw } from "lucide-react";
import { Button } from "./ui/button";
import beltImage from "@/assets/belts and roads/Belt_A.jpg";
import beltBL from "@/assets/belts and roads/Belt_BL.png";
import beltBR from "@/assets/belts and roads/Belt_BR.png";
import beltFunnel from "@/assets/belts and roads/Belt_funnel.jpg";

interface ConveyorBeltProps {
  belt: {
    id: string;
    gridColumn: string;
    gridRow: string;
    direction: 'north' | 'south' | 'east' | 'west';
    type: 'straight' | 'curve-ne' | 'curve-nw' | 'curve-se' | 'curve-sw' | 'turn' | 'turn-rt' | 'turn-lt' | 'turn-ne' | 'turn-nw' | 'turn-se' | 'turn-sw' | 'funnel';
    entryDirection?: 'north' | 'south' | 'east' | 'west'; // For turn belts: direction from which items enter
    isOutput?: boolean;
    isDestiny?: boolean;
    isTransport?: boolean;
    corralId?: string;
    slotPosition?: number; // Position of the slot this belt is associated with
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
  showSlotCorrelation?: boolean;
  eggDebugMode?: boolean;
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
  showSlotCorrelation = false,
  eggDebugMode = false,
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

  // Get transform for turn belt image based on type and direction
  const getTurnBeltTransform = () => {
    // Handle specific turn types
    if (belt.type === 'turn-rt') {
      // RT: East -> North (base orientation)
      switch (belt.direction) {
        case 'north': return 'rotate(0deg)';
        case 'east': return 'rotate(90deg)';
        case 'south': return 'rotate(180deg)';
        case 'west': return 'rotate(270deg)';
        default: return 'rotate(0deg)';
      }
    }
    if (belt.type === 'turn-lt') {
      // LT: West -> North (base orientation)
      switch (belt.direction) {
        case 'north': return 'rotate(0deg)';
        case 'east': return 'rotate(90deg)';
        case 'south': return 'rotate(180deg)';
        case 'west': return 'rotate(270deg)';
        default: return 'rotate(0deg)';
      }
    }
    
    // Handle directional turn types
    if (belt.type === 'turn-ne') {
      // North -> East: RT rotated 90° clockwise
      return 'rotate(90deg)';
    }
    if (belt.type === 'turn-nw') {
      // North -> West: LT rotated 270° (or -90°)
      return 'rotate(270deg)';
    }
    if (belt.type === 'turn-se') {
      // South -> East: LT rotated 90°
      return 'rotate(90deg)';
    }
    if (belt.type === 'turn-sw') {
      // South -> West: RT rotated 270°
      return 'rotate(270deg)';
    }
    
    // Legacy 'turn' type: rotate based on exit direction
    switch (belt.direction) {
      case 'north': return 'rotate(0deg)';
      case 'east': return 'rotate(90deg)';
      case 'south': return 'rotate(180deg)';
      case 'west': return 'rotate(270deg)';
      default: return 'rotate(0deg)';
    }
  };

  // Get curve belt image based on type (always use the correct image, never change based on direction)
  const getCurveBeltImage = () => {
    // BR and BL always use their respective images, regardless of rotation
    if (belt.type === 'curve-se') {
      return beltBR; // Bottom-Right - always use BR image
    }
    if (belt.type === 'curve-sw') {
      return beltBL; // Bottom-Left - always use BL image
    }
    if (belt.type === 'curve-nw') {
      return beltBR; // Top-Left (BR rotated 180°)
    }
    if (belt.type === 'curve-ne') {
      return beltBL; // Top-Right (BL rotated 180°)
    }
    return beltImage; // Fallback
  };

  // Get transform for curve belt image based on type and direction
  const getCurveBeltTransform = () => {
    // BL: South -> West (base orientation)
    // BR: South -> East (base orientation)
    if (belt.type === 'curve-sw') {
      // BL base: South -> West (entrada desde abajo, salida hacia la izquierda)
      // Rotate the BL image to match the desired direction
      // direction represents the exit direction of the curve
      // Rotación en sentido antihorario: west -> south -> east -> north -> west
      switch (belt.direction) {
        case 'west': return 'rotate(0deg)'; // South -> West (base orientation)
        case 'south': return 'rotate(90deg)'; // West -> South (rotación 90° horario de imagen: entrada desde izquierda, salida hacia abajo)
        case 'east': return 'rotate(180deg)'; // North -> East (rotación 180°: entrada desde arriba, salida hacia derecha)
        case 'north': return 'rotate(270deg)'; // East -> North (rotación 270° horario de imagen: entrada desde derecha, salida hacia arriba)
        default: return 'rotate(0deg)';
      }
    }
    if (belt.type === 'curve-se') {
      // BR base: South -> East (entrada desde abajo, salida hacia la derecha)
      // Rotate the BR image to match the desired direction
      // direction represents the exit direction of the curve
      // BR curve: entry is 90° clockwise from exit (antihorario en el sentido del movimiento)
      // Rotación de la imagen en sentido antihorario: east -> north -> west -> south -> east
      switch (belt.direction) {
        case 'east': return 'rotate(0deg)'; // South -> East (base orientation)
        case 'north': return 'rotate(270deg)'; // East -> North (rotación 270° antihorario: entrada desde derecha, salida hacia arriba)
        case 'west': return 'rotate(180deg)'; // North -> West (rotación 180°: entrada desde arriba, salida hacia izquierda)
        case 'south': return 'rotate(90deg)'; // West -> South (rotación 90° antihorario: entrada desde izquierda, salida hacia abajo)
        default: return 'rotate(0deg)';
      }
    }
    if (belt.type === 'curve-nw') {
      // Top-Left: North -> West (BR rotated 180°)
      switch (belt.direction) {
        case 'west': return 'rotate(180deg)'; // North -> West
        case 'north': return 'rotate(270deg)'; // West -> North (reversed)
        case 'east': return 'rotate(0deg)'; // South -> East
        case 'south': return 'rotate(90deg)'; // East -> South
        default: return 'rotate(180deg)';
      }
    }
    if (belt.type === 'curve-ne') {
      // Top-Right: North -> East (BL rotated 180°)
      switch (belt.direction) {
        case 'east': return 'rotate(180deg)'; // North -> East
        case 'north': return 'rotate(270deg)'; // East -> North (reversed)
        case 'west': return 'rotate(0deg)'; // South -> West
        case 'south': return 'rotate(90deg)'; // West -> South
        default: return 'rotate(180deg)';
      }
    }
    return 'rotate(0deg)';
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
  const isTurn = belt.type === 'turn' || belt.type.startsWith('turn-');
  const isFunnel = belt.type === 'funnel';
  const isVertical = belt.direction === 'north' || belt.direction === 'south';

  // Get turn belt image based on type
  const getTurnBeltImage = () => {
    const clockwiseTypes = ['turn-rt', 'turn-ne', 'turn-se', 'turn-sw'];
    const counterClockwiseTypes = ['turn-lt', 'turn-nw'];
    
    if (clockwiseTypes.includes(belt.type)) {
      return beltBR;
    }
    if (counterClockwiseTypes.includes(belt.type)) {
      return beltBL;
    }
    
    // Legacy 'turn' type: determine rotation based on entry/exit
    const getEntryFromExit = (exit: 'north' | 'south' | 'east' | 'west'): 'north' | 'south' | 'east' | 'west' => {
      const directions: ('north' | 'south' | 'east' | 'west')[] = ['north', 'east', 'south', 'west'];
      const exitIndex = directions.indexOf(exit);
      const entryIndex = (exitIndex - 1 + 4) % 4; // -1 for clockwise (go back one)
      return directions[entryIndex];
    };
    
    const expectedEntry = getEntryFromExit(belt.direction);
    const entryDir = belt.entryDirection || expectedEntry;
    
    const isClockwise =
      (belt.direction === 'north' && entryDir === 'east') ||
      (belt.direction === 'east' && entryDir === 'south') ||
      (belt.direction === 'south' && entryDir === 'west') ||
      (belt.direction === 'west' && entryDir === 'north');
    
    return isClockwise ? beltBR : beltBL;
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

  // Calculate input and output positions for edit mode indicators
  const getInputOutputPositions = () => {
    let inputDir: 'north' | 'south' | 'east' | 'west' | null = null;
    let outputDir: 'north' | 'south' | 'east' | 'west' | null = null;

    if (belt.type === 'straight') {
      // Straight belts: input is opposite of direction, output is direction
      const oppositeDir: Record<'north' | 'south' | 'east' | 'west', 'north' | 'south' | 'east' | 'west'> = {
        'north': 'south',
        'south': 'north',
        'east': 'west',
        'west': 'east',
      };
      inputDir = oppositeDir[belt.direction];
      outputDir = belt.direction;
    } else if (belt.type === 'funnel') {
      // Funnel: 3 inputs (north, south, west) and 1 output (east by default, but can be rotated)
      // The output is always in the belt's direction
      outputDir = belt.direction;
      // For display, we'll show the 3 input positions
      // Inputs are: opposite of direction, and the two adjacent directions
      const directions: ('north' | 'south' | 'east' | 'west')[] = ['north', 'east', 'south', 'west'];
      const outputIndex = directions.indexOf(belt.direction);
      // The 3 inputs are: the opposite direction and the two adjacent directions
      // We'll show the main input (opposite) for the single circle, but the logic will accept all 3
      const inputIndex = (outputIndex + 2) % 4; // Opposite direction
      inputDir = directions[inputIndex];
    } else if (belt.type === 'curve-se') {
      // BR curve: exit is 90° counterclockwise from entry
      // For display, we'll use the belt direction as the exit and calculate entry
      const directions: ('north' | 'south' | 'east' | 'west')[] = ['north', 'east', 'south', 'west'];
      const exitIndex = directions.indexOf(belt.direction);
      const entryIndex = (exitIndex + 1) % 4; // Entry is 90° clockwise from exit
      inputDir = directions[entryIndex];
      outputDir = belt.direction;
    } else if (belt.type === 'curve-sw') {
      // BL curve: exit is 90° clockwise from entry
      // For display, we'll use the belt direction as the exit and calculate entry
      const directions: ('north' | 'south' | 'east' | 'west')[] = ['north', 'east', 'south', 'west'];
      const exitIndex = directions.indexOf(belt.direction);
      const entryIndex = (exitIndex - 1 + 4) % 4; // Entry is 90° counterclockwise from exit
      inputDir = directions[entryIndex];
      outputDir = belt.direction;
    } else if (isTurn) {
      // Turn belts: similar logic to curves
      const directions: ('north' | 'south' | 'east' | 'west')[] = ['north', 'east', 'south', 'west'];
      const exitIndex = directions.indexOf(belt.direction);
      // Most turn belts are clockwise, so entry is one step back
      const entryIndex = (exitIndex - 1 + 4) % 4;
      inputDir = directions[entryIndex];
      outputDir = belt.direction;
    }

    // Convert direction to position (percentage from center)
    const getPosition = (dir: 'north' | 'south' | 'east' | 'west' | null) => {
      if (!dir) return null;
      switch (dir) {
        case 'north': return { left: '50%', top: '10%' };
        case 'south': return { left: '50%', top: '90%' };
        case 'east': return { left: '90%', top: '50%' };
        case 'west': return { left: '10%', top: '50%' };
      }
    };

    return {
      input: getPosition(inputDir),
      output: getPosition(outputDir),
    };
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
        {!isTurn && !isFunnel && !isCurve && (
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
        
        {/* Curve belt visual - shows curved belt image */}
        {isCurve && (
          <img 
            src={getCurveBeltImage()} 
            alt="Curve belt" 
            className="w-full h-full object-cover"
            style={{
              transform: getCurveBeltTransform(),
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
        
        
        {isEditMode && (() => {
          const { input, output } = getInputOutputPositions();
          return (
            <>
              {tempPosition && isDragging && (
                <div className="absolute top-8 right-2 bg-yellow-500 text-black text-xs px-2 py-1 rounded font-bold pointer-events-none z-10">
                  → Col {tempPosition.col}, Row {tempPosition.row}
                </div>
              )}
              {/* Show BR/BL label for curve belts in edit mode */}
              {isCurve && (belt.type === 'curve-sw' || belt.type === 'curve-se') && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <span className="text-xs font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                    {belt.type === 'curve-sw' ? 'BL' : 'BR'}
                  </span>
                </div>
              )}
              
              {/* Show slot number correlation in edit mode */}
              {showSlotCorrelation && belt.slotPosition !== undefined && belt.slotPosition !== null && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <div className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded shadow-lg border-2 border-white">
                    Slot #{belt.slotPosition + 1}
                  </div>
                </div>
              )}
              
              {/* Show cinta number in egg debug mode */}
              {eggDebugMode && belt.isOutput && belt.slotPosition !== undefined && belt.slotPosition !== null && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <div className="bg-emerald-600 text-white text-sm font-bold px-2 py-1 rounded shadow-lg border-2 border-white">
                    #{belt.slotPosition + 1}
                  </div>
                </div>
              )}
              {/* Input/Output indicators */}
              {belt.type === 'funnel' ? (
                // Funnel: show 3 inputs and 1 output
                <>
                  {(() => {
                    const directions: ('north' | 'south' | 'east' | 'west')[] = ['north', 'east', 'south', 'west'];
                    const outputIndex = directions.indexOf(belt.direction);
                    // 3 inputs: opposite direction and the two adjacent directions
                    const input1Index = (outputIndex + 2) % 4; // Opposite
                    const input2Index = (outputIndex + 1) % 4; // Adjacent clockwise
                    const input3Index = (outputIndex + 3) % 4; // Adjacent counterclockwise
                    
                    const getPosition = (dir: 'north' | 'south' | 'east' | 'west') => {
                      switch (dir) {
                        case 'north': return { left: '50%', top: '10%' };
                        case 'south': return { left: '50%', top: '90%' };
                        case 'east': return { left: '90%', top: '50%' };
                        case 'west': return { left: '10%', top: '50%' };
                      }
                    };
                    
                    return (
                      <>
                        <div
                          className="absolute w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-lg pointer-events-none z-20"
                          style={{
                            ...getPosition(directions[input1Index]),
                            transform: 'translate(-50%, -50%)',
                          }}
                          title="Input 1"
                        />
                        <div
                          className="absolute w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-lg pointer-events-none z-20"
                          style={{
                            ...getPosition(directions[input2Index]),
                            transform: 'translate(-50%, -50%)',
                          }}
                          title="Input 2"
                        />
                        <div
                          className="absolute w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-lg pointer-events-none z-20"
                          style={{
                            ...getPosition(directions[input3Index]),
                            transform: 'translate(-50%, -50%)',
                          }}
                          title="Input 3"
                        />
                        <div
                          className="absolute w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-lg pointer-events-none z-20"
                          style={{
                            ...getPosition(belt.direction),
                            transform: 'translate(-50%, -50%)',
                          }}
                          title="Output"
                        />
                      </>
                    );
                  })()}
                </>
              ) : (
                // Regular belts: single input and output
                <>
                  {input && (
                    <div
                      className="absolute w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-lg pointer-events-none z-20"
                      style={{
                        left: input.left,
                        top: input.top,
                        transform: 'translate(-50%, -50%)',
                      }}
                      title="Input"
                    />
                  )}
                  {output && (
                    <div
                      className="absolute w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-lg pointer-events-none z-20"
                      style={{
                        left: output.left,
                        top: output.top,
                        transform: 'translate(-50%, -50%)',
                      }}
                      title="Output"
                    />
                  )}
                </>
              )}
              
              {/* Direction line from input to output */}
              {input && output && (() => {
                // Convert percentage positions to SVG coordinates (0-100)
                const x1 = parseFloat(input.left.replace('%', ''));
                const y1 = parseFloat(input.top.replace('%', ''));
                const x2 = parseFloat(output.left.replace('%', ''));
                const y2 = parseFloat(output.top.replace('%', ''));
                
                return (
                  <svg
                    className="absolute inset-0 pointer-events-none z-10"
                    style={{ width: '100%', height: '100%' }}
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                  >
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="rgba(59, 130, 246, 0.5)"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                      markerEnd="url(#arrowhead)"
                    />
                    <defs>
                      <marker
                        id="arrowhead"
                        markerWidth="8"
                        markerHeight="8"
                        refX="7"
                        refY="2.5"
                        orient="auto"
                      >
                        <polygon
                          points="0 0, 8 2.5, 0 5"
                          fill="rgba(59, 130, 246, 0.5)"
                        />
                      </marker>
                    </defs>
                  </svg>
                );
              })()}
            </>
          );
        })()}
        
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
      
    </div>
  );
};
