import { useEffect, useState } from "react";
import eggImage from "@/assets/egg.png";

interface EggProps {
  id: string;
  gridColumn: string;
  gridRow: string;
  progress: number; // 0 to 1, progress along the current belt
  direction: 'north' | 'south' | 'east' | 'west'; // Direction of the belt
  beltType?: 'straight' | 'curve-ne' | 'curve-nw' | 'curve-se' | 'curve-sw' | 'turn' | 'turn-rt' | 'turn-lt' | 'turn-ne' | 'turn-nw' | 'turn-se' | 'turn-sw' | 'funnel';
  entryDirection?: 'north' | 'south' | 'east' | 'west'; // Direction from which egg entered (for turn belts)
  onReachDestiny?: () => void;
}

export const Egg = ({ id, gridColumn, gridRow, progress, direction, beltType, entryDirection, onReachDestiny }: EggProps) => {
  const [isVisible, setIsVisible] = useState(true);

  // Calculate position within the cell based on progress and belt direction
  const getPosition = () => {
    // For all turn/curve belts, use curved movement
    const isCurveBelt = beltType && (
      beltType === 'turn' || 
      beltType === 'turn-rt' || 
      beltType === 'turn-lt' ||
      beltType === 'turn-ne' ||
      beltType === 'turn-nw' ||
      beltType === 'turn-se' ||
      beltType === 'turn-sw' ||
      beltType === 'curve-ne' ||
      beltType === 'curve-nw' ||
      beltType === 'curve-se' ||
      beltType === 'curve-sw'
    );
    
    if (isCurveBelt) {
      if (!entryDirection) {
        // Log warning if entryDirection is missing for curve belt
        console.warn(`[Egg] ${id} on curve belt ${beltType} (direction: ${direction}) has no entryDirection. Calculating from belt direction.`);
        // For BL: if belt direction is exit, calculate entry
        // For BL (curve-sw): entry is 90° counterclockwise from exit
        if (beltType === 'curve-sw') {
          const directions: ('north' | 'south' | 'east' | 'west')[] = ['north', 'east', 'south', 'west'];
          const exitIndex = directions.indexOf(direction);
          const entryIndex = (exitIndex - 1 + 4) % 4;
          const calculatedEntry = directions[entryIndex];
          console.log(`[Egg] Calculated entry direction for BL: ${calculatedEntry} (from exit: ${direction})`);
          return getCurvedPosition(progress, calculatedEntry, beltType);
        }
        // For BR (curve-se): entry is 90° clockwise from exit
        if (beltType === 'curve-se') {
          const directions: ('north' | 'south' | 'east' | 'west')[] = ['north', 'east', 'south', 'west'];
          const exitIndex = directions.indexOf(direction);
          const entryIndex = (exitIndex + 1) % 4;
          const calculatedEntry = directions[entryIndex];
          console.log(`[Egg] Calculated entry direction for BR: ${calculatedEntry} (from exit: ${direction})`);
          return getCurvedPosition(progress, calculatedEntry, beltType);
        }
        // Fallback: use belt direction as entry (not ideal, but better than no animation)
        return getCurvedPosition(progress, direction, beltType);
      }
      return getCurvedPosition(progress, entryDirection, beltType);
    }
    
    // Progress determines position within the cell (0 = start, 1 = end)
    // Position changes based on belt direction
    switch (direction) {
      case 'east':
        // Move from left (0%) to right (100%)
        return {
          left: `${progress * 100}%`,
          top: '50%',
          transform: 'translate(-50%, -50%)',
        };
      case 'west':
        // Move from right (100%) to left (0%)
        return {
          left: `${(1 - progress) * 100}%`,
          top: '50%',
          transform: 'translate(-50%, -50%)',
        };
      case 'south':
        // Move from top (0%) to bottom (100%)
        return {
          left: '50%',
          top: `${progress * 100}%`,
          transform: 'translate(-50%, -50%)',
        };
      case 'north':
        // Move from bottom (100%) to top (0%)
        return {
          left: '50%',
          top: `${(1 - progress) * 100}%`,
          transform: 'translate(-50%, -50%)',
        };
      default:
        // Default to east
        return {
          left: `${progress * 100}%`,
          top: '50%',
          transform: 'translate(-50%, -50%)',
        };
    }
  };

  // Check if this is an RT belt (Right to Top)
  // RT belt conditions based on getTurnBeltImage logic:
  // - direction === 'north' && entryDirection === 'east'
  // - direction === 'east' && entryDirection === 'north'
  // - direction === 'south' && entryDirection === 'east'
  // - direction === 'west' && entryDirection === 'south'
  const isRTBelt = () => {
    if (beltType !== 'turn' || !entryDirection) return false;
    
    if (direction === 'north' && entryDirection === 'east') return true;
    if (direction === 'east' && entryDirection === 'north') return true;
    if (direction === 'south' && entryDirection === 'east') return true;
    if (direction === 'west' && entryDirection === 'south') return true;
    
    return false;
  };

  // Get color filter for RT belt animation: red -> green -> blue
  const getRTColorFilter = (prog: number) => {
    // Progress 0 = red, 0.5 = green, 1 = blue
    let r, g, b;
    
    if (prog <= 0.5) {
      // Red to Green (0 to 0.5)
      const t = prog * 2; // 0 to 1
      r = Math.round(255 * (1 - t));
      g = Math.round(255 * t);
      b = 0;
    } else {
      // Green to Blue (0.5 to 1)
      const t = (prog - 0.5) * 2; // 0 to 1
      r = 0;
      g = Math.round(255 * (1 - t));
      b = Math.round(255 * t);
    }
    
    // Use a combination of filters to tint the emoji
    // We'll use a colored drop-shadow and a brightness/contrast adjustment
    const brightness = 1.2;
    const contrast = 1.1;
    
    // Create a color matrix filter to tint the emoji
    // This is a simplified approach using drop-shadow for the glow effect
    return `drop-shadow(0 0 6px rgb(${r}, ${g}, ${b})) drop-shadow(0 0 12px rgb(${r}, ${g}, ${b})) brightness(${brightness}) contrast(${contrast})`;
  };

  // Calculate curved position for turn belts (90 degree turn)
  const getCurvedPosition = (prog: number, entryDir: 'north' | 'south' | 'east' | 'west', beltType?: string) => {
    const directions: ('north' | 'south' | 'east' | 'west')[] = ['north', 'east', 'south', 'west'];
    const entryIndex = directions.indexOf(entryDir);
    let exitDir: 'north' | 'south' | 'east' | 'west';
    
    // Calculate exit direction based on belt type
    if (beltType === 'turn-lt') {
      // Counterclockwise: go back one direction
      const prevIndex = (entryIndex - 1 + 4) % 4;
      exitDir = directions[prevIndex];
    } else if (beltType === 'curve-ne' || beltType === 'turn-ne') {
      // North -> East curve
      // If entering from north, exit east; if entering from east, exit north (bidirectional)
      if (entryDir === 'north') exitDir = 'east';
      else if (entryDir === 'east') exitDir = 'north';
      else {
        // Default: assume north entry -> east exit
        exitDir = 'east';
      }
    } else if (beltType === 'curve-nw' || beltType === 'turn-nw') {
      // North -> West curve
      // If entering from north, exit west; if entering from west, exit north (bidirectional)
      if (entryDir === 'north') exitDir = 'west';
      else if (entryDir === 'west') exitDir = 'north';
      else {
        // Default: assume north entry -> west exit
        exitDir = 'west';
      }
    } else if (beltType === 'curve-se' || beltType === 'turn-se') {
      // BR curve: can be rotated, so we need to handle all entry/exit combinations
      // Base orientation: South -> East
      // When rotated, it can be: East -> North, North -> West, West -> South, South -> East
      // The curve always turns 90° counterclockwise from entry to exit
      const directions: ('north' | 'south' | 'east' | 'west')[] = ['north', 'east', 'south', 'west'];
      const entryIndex = directions.indexOf(entryDir);
      if (entryIndex === -1) {
        // Fallback: assume south entry -> east exit
        exitDir = 'east';
      } else {
        // For BR, exit is 90° counterclockwise from entry
        const exitIndex = (entryIndex - 1 + 4) % 4;
        exitDir = directions[exitIndex];
      }
    } else if (beltType === 'curve-sw' || beltType === 'turn-sw') {
      // BL curve: can be rotated, so we need to handle all entry/exit combinations
      // Base orientation: South -> West
      // When rotated, it can be: West -> North, North -> East, East -> South, South -> West
      // The curve always turns 90° clockwise from entry to exit
      const directions: ('north' | 'south' | 'east' | 'west')[] = ['north', 'east', 'south', 'west'];
      const entryIndex = directions.indexOf(entryDir);
      if (entryIndex === -1) {
        // Fallback: assume south entry -> west exit
        exitDir = 'west';
      } else {
        // For BL, exit is 90° clockwise from entry
        const exitIndex = (entryIndex + 1) % 4;
        exitDir = directions[exitIndex];
      }
    } else {
      // Default: clockwise (turn, turn-rt, and legacy)
      const exitIndex = (entryIndex + 1) % 4;
      exitDir = directions[exitIndex];
    }
    
    // Use quadratic curve for smooth 90-degree turn
    // Start at entry side, end at exit side
    const t = prog; // 0 to 1
    
    let startX = 0.5, startY = 0.5;
    let endX = 0.5, endY = 0.5;
    
    // Set start position based on entry direction (must match IN point visual)
    // IN point positions: north=10%, south=90%, east=90%, west=10%
    switch (entryDir) {
      case 'east': startX = 0.9; startY = 0.5; break;  // Right side (matches IN point at 90%)
      case 'west': startX = 0.1; startY = 0.5; break;  // Left side (matches IN point at 10%)
      case 'south': startX = 0.5; startY = 0.9; break; // Bottom (matches IN point at 90%)
      case 'north': startX = 0.5; startY = 0.1; break; // Top (matches IN point at 10%)
    }
    
    // Set end position based on exit direction (must match OUT point visual)
    // OUT point positions: north=10%, south=90%, east=90%, west=10%
    switch (exitDir) {
      case 'east': endX = 0.9; endY = 0.5; break;  // Right side (matches OUT point at 90%)
      case 'west': endX = 0.1; endY = 0.5; break;  // Left side (matches OUT point at 10%)
      case 'south': endX = 0.5; endY = 0.9; break; // Bottom (matches OUT point at 90%)
      case 'north': endX = 0.5; endY = 0.1; break; // Top (matches OUT point at 10%)
    }
    
    // Control point for smooth curve
    const getControlPoint = () => {
      // For BR and BL curve belts, control point is always at center (0.5, 0.5)
      // This ensures the control point doesn't rotate, only start/end points rotate
      if (beltType === 'curve-se' || beltType === 'curve-sw') {
        return { x: 0.5, y: 0.5 };
      }
      
      // Specific tuning for other belts que entran por abajo y salen a la izquierda (belt BL)
      if (
        (entryDir === 'south' && exitDir === 'west') ||
        (entryDir === 'west' && exitDir === 'south') ||
        (entryDir === 'south' && exitDir === 'east') ||
        (entryDir === 'east' && exitDir === 'south')
      ) {
        return { x: 0.5, y: 0.5 };
      }

      // Default behaviour (corner control point)
      return {
        x: (startX === 0.5) ? (endX === 1 ? 1 : 0) : startX,
        y: (startY === 0.5) ? (endY === 1 ? 1 : 0) : startY,
      };
    };

    const { x: controlX, y: controlY } = getControlPoint();
    
    // Quadratic bezier curve: (1-t)²P₀ + 2(1-t)tP₁ + t²P₂
    const x = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * controlX + t * t * endX;
    const y = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * controlY + t * t * endY;
    
    return {
      left: `${x * 100}%`,
      top: `${y * 100}%`,
      transform: 'translate(-50%, -50%)',
    };
  };

  const isRT = isRTBelt();
  const colorFilter = isRT ? getRTColorFilter(progress) : undefined;
  
  // Get background color for RT belt animation
  const getRTBackgroundColor = (prog: number) => {
    let r, g, b;
    
    if (prog <= 0.5) {
      // Red to Green (0 to 0.5)
      const t = prog * 2; // 0 to 1
      r = Math.round(255 * (1 - t));
      g = Math.round(255 * t);
      b = 0;
    } else {
      // Green to Blue (0.5 to 1)
      const t = (prog - 0.5) * 2; // 0 to 1
      r = 0;
      g = Math.round(255 * (1 - t));
      b = Math.round(255 * t);
    }
    
    return `rgb(${r}, ${g}, ${b})`;
  };

  return isVisible ? (
    <div
      className="absolute z-15 pointer-events-none"
      style={{
        gridColumn,
        gridRow,
        ...getPosition(),
      }}
    >
      {isRT ? (
        <div 
          className="relative"
          style={{
            filter: colorFilter,
          }}
        >
          <div
            className="absolute inset-0 rounded-full opacity-30 blur-sm"
            style={{
              backgroundColor: getRTBackgroundColor(progress),
            }}
          />
          <div className="relative z-10" style={{ width: '24px', height: '32px' }}>
            <img 
              src={eggImage} 
              alt="Egg" 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'contain',
                display: 'block'
              }} 
            />
          </div>
        </div>
      ) : (
        <div style={{ width: '24px', height: '32px' }}>
          <img 
            src={eggImage} 
            alt="Egg" 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'contain',
              display: 'block'
            }} 
          />
        </div>
      )}
    </div>
  ) : null;
};

