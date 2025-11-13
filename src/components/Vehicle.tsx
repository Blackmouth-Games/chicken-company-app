import { useEffect, useState } from "react";

interface VehicleProps {
  id: string;
  gridColumn: string;
  gridRow: string;
  progress: number; // 0 to 1, progress along the current road
  direction: 'north' | 'south' | 'east' | 'west'; // Direction of the road
  isLoaded: boolean; // true when going from B to A (lleno), false when going from A to B (vacío)
  reverseDirection?: boolean; // true if moving in reverse direction (from 1 to 0)
  onReachDestination?: () => void;
}

export const Vehicle = ({ id, gridColumn, gridRow, progress, direction, isLoaded, reverseDirection = false, onReachDestination }: VehicleProps) => {
  const [isVisible, setIsVisible] = useState(true);

  // Get rotation based on direction and reverse movement
  const getRotation = () => {
    let baseRotation = 0;
    switch (direction) {
      case 'east': baseRotation = 0; break;
      case 'west': baseRotation = 180; break;
      case 'south': baseRotation = 90; break;
      case 'north': baseRotation = -90; break;
      default: baseRotation = 0;
    }
    // If moving in reverse, flip the vehicle 180 degrees
    return reverseDirection ? baseRotation + 180 : baseRotation;
  };

  // Calculate position within the cell based on progress and road direction
  const getPosition = () => {
    // Progress determines position within the cell (0 = start, 1 = end)
    // Position changes based on road direction
    const rotation = getRotation();
    switch (direction) {
      case 'east':
        // Move from left (0%) to right (100%)
        return {
          left: `${progress * 100}%`,
          top: '50%',
          transform: `translate(-50%, -50%) rotate(${rotation})`,
        };
      case 'west':
        // Move from right (100%) to left (0%)
        return {
          left: `${(1 - progress) * 100}%`,
          top: '50%',
          transform: `translate(-50%, -50%) rotate(${rotation})`,
        };
      case 'south':
        // Move from top (0%) to bottom (100%)
        return {
          left: '50%',
          top: `${progress * 100}%`,
          transform: `translate(-50%, -50%) rotate(${rotation})`,
        };
      case 'north':
        // Move from bottom (100%) to top (0%)
        return {
          left: '50%',
          top: `${(1 - progress) * 100}%`,
          transform: `translate(-50%, -50%) rotate(${rotation})`,
        };
      default:
        // Default to east
        return {
          left: `${progress * 100}%`,
          top: '50%',
          transform: `translate(-50%, -50%) rotate(${rotation})`,
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
      <div className="text-3xl">{getVehicleEmoji()}</div>
    </div>
  ) : null;
};

