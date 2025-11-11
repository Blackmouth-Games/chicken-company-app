import { useEffect, useState } from "react";

interface EggProps {
  id: string;
  gridColumn: string;
  gridRow: string;
  progress: number; // 0 to 1, progress along the current belt
  onReachDestiny?: () => void;
}

export const Egg = ({ id, gridColumn, gridRow, progress, onReachDestiny }: EggProps) => {
  const [isVisible, setIsVisible] = useState(true);

  // Calculate position within the cell based on progress
  const getPosition = () => {
    // Progress determines position within the cell (0 = start, 1 = end)
    return {
      left: `${progress * 100}%`,
      top: '50%',
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
      <div className="w-4 h-4 bg-yellow-400 rounded-full border-2 border-yellow-600 shadow-md animate-pulse" />
    </div>
  ) : null;
};

