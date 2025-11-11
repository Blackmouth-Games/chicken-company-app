import { useEffect, useState } from "react";

interface EggProps {
  id: string;
  gridColumn: string;
  gridRow: string;
  progress: number; // 0 to 1, progress along the current belt
  direction: 'north' | 'south' | 'east' | 'west'; // Direction of the belt
  onReachDestiny?: () => void;
}

export const Egg = ({ id, gridColumn, gridRow, progress, direction, onReachDestiny }: EggProps) => {
  const [isVisible, setIsVisible] = useState(true);

  // Calculate position within the cell based on progress and belt direction
  const getPosition = () => {
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

  return isVisible ? (
    <div
      className="absolute z-15 pointer-events-none"
      style={{
        gridColumn,
        gridRow,
        ...getPosition(),
      }}
    >
      <div className="w-4 h-4 bg-yellow-400 rounded-full border-2 border-yellow-600 shadow-md animate-pulse" />
    </div>
  ) : null;
};

