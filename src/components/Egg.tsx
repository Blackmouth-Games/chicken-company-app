import { useEffect, useState } from "react";

interface EggProps {
  id: string;
  gridColumn: string;
  gridRow: string;
  progress: number; // 0 to 1, progress along the current belt
  direction: 'north' | 'south' | 'east' | 'west'; // Direction of the belt
  beltType?: 'straight' | 'curve-ne' | 'curve-nw' | 'curve-se' | 'curve-sw' | 'turn' | 'funnel';
  entryDirection?: 'north' | 'south' | 'east' | 'west'; // Direction from which egg entered (for turn belts)
  onReachDestiny?: () => void;
}

export const Egg = ({ id, gridColumn, gridRow, progress, direction, beltType, entryDirection, onReachDestiny }: EggProps) => {
  const [isVisible, setIsVisible] = useState(true);

  // Calculate position within the cell based on progress and belt direction
  const getPosition = () => {
    // For turn belts, use curved movement
    if (beltType === 'turn' && entryDirection) {
      return getCurvedPosition(progress, entryDirection);
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

  // Calculate curved position for turn belts (90 degree turn)
  const getCurvedPosition = (prog: number, entryDir: 'north' | 'south' | 'east' | 'west') => {
    // Calculate exit direction (90 degrees clockwise from entry)
    const directions: ('north' | 'south' | 'east' | 'west')[] = ['north', 'east', 'south', 'west'];
    const entryIndex = directions.indexOf(entryDir);
    const exitIndex = (entryIndex + 1) % 4;
    const exitDir = directions[exitIndex];
    
    // Use quadratic curve for smooth 90-degree turn
    // Start at entry side, end at exit side
    const t = prog; // 0 to 1
    
    let startX = 0.5, startY = 0.5;
    let endX = 0.5, endY = 0.5;
    
    // Set start position based on entry direction
    switch (entryDir) {
      case 'east': startX = 0; startY = 0.5; break;
      case 'west': startX = 1; startY = 0.5; break;
      case 'south': startX = 0.5; startY = 0; break;
      case 'north': startX = 0.5; startY = 1; break;
    }
    
    // Set end position based on exit direction
    switch (exitDir) {
      case 'east': endX = 1; endY = 0.5; break;
      case 'west': endX = 0; endY = 0.5; break;
      case 'south': endX = 0.5; endY = 1; break;
      case 'north': endX = 0.5; endY = 0; break;
    }
    
    // Control point for smooth curve (corner of the cell)
    const controlX = (startX === 0.5) ? (endX === 1 ? 1 : 0) : startX;
    const controlY = (startY === 0.5) ? (endY === 1 ? 1 : 0) : startY;
    
    // Quadratic bezier curve: (1-t)²P₀ + 2(1-t)tP₁ + t²P₂
    const x = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * controlX + t * t * endX;
    const y = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * controlY + t * t * endY;
    
    return {
      left: `${x * 100}%`,
      top: `${y * 100}%`,
      transform: 'translate(-50%, -50%)',
    };
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
      <div className="text-lg">🥚</div>
    </div>
  ) : null;
};

