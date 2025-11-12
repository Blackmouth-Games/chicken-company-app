import { useEffect, useState } from "react";

interface VehicleProps {
  id: string;
  gridColumn: string;
  gridRow: string;
  progress: number; // 0 to 1, progress along the current road
  direction: 'north' | 'south' | 'east' | 'west'; // Direction of the road
  isLoaded: boolean; // true when going from B to A (lleno), false when going from A to B (vacío)
  onReachDestination?: () => void;
}

export const Vehicle = ({ id, gridColumn, gridRow, progress, direction, isLoaded, onReachDestination }: VehicleProps) => {
  const [isVisible, setIsVisible] = useState(true);

  // Calculate position within the cell based on progress and road direction
  const getPosition = () => {
    // Progress determines position within the cell (0 = start, 1 = end)
    // Position changes based on road direction
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

  // Get vehicle emoji based on load state
  const getVehicleEmoji = () => {
    return isLoaded ? '🚛' : '🚚'; // 🚛 = loaded truck, 🚚 = empty truck
  };

  return isVisible ? (
    <div
      className="absolute z-5 pointer-events-none"
      style={{
        gridColumn,
        gridRow,
        ...getPosition(),
      }}
    >
      <div className="text-lg">{getVehicleEmoji()}</div>
    </div>
  ) : null;
};

