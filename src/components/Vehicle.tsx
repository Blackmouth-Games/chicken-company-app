import { useEffect, useState } from "react";
import truckEmpty from "@/assets/vehicles/truck_empty.png";
import truckFilled from "@/assets/vehicles/truck_filled.png";

interface VehicleProps {
  id: string;
  gridColumn: string;
  gridRow: string;
  progress: number; // 0 to 1, progress along the current road
  direction: 'north' | 'south' | 'east' | 'west'; // Direction of the road
  isLoaded: boolean; // true when going from B to A (lleno), false when going from A to B (vacío)
  reverseDirection?: boolean; // true if moving in reverse direction (from 1 to 0)
  goingToB?: boolean; // true if going A->B, false if going B->A (for visual flip)
  onReachDestination?: () => void;
}

export const Vehicle = ({ id, gridColumn, gridRow, progress, direction, isLoaded, reverseDirection = false, goingToB = true, onReachDestination }: VehicleProps) => {
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
    const transforms = [
      'translate(-50%, -50%)',
      `rotate(${rotation}deg)`,
    ].filter(Boolean).join(' ');
    
    switch (direction) {
      case 'east':
        // Move from left (0%) to right (100%)
        return {
          left: `${progress * 100}%`,
          top: '50%',
          transform: transforms,
        };
      case 'west':
        // Move from right (100%) to left (0%)
        return {
          left: `${(1 - progress) * 100}%`,
          top: '50%',
          transform: transforms,
        };
      case 'south':
        // Move from top (0%) to bottom (100%)
        return {
          left: '50%',
          top: `${progress * 100}%`,
          transform: transforms,
        };
      case 'north':
        // Move from bottom (100%) to top (0%)
        return {
          left: '50%',
          top: `${(1 - progress) * 100}%`,
          transform: transforms,
        };
      default:
        // Default to east
        return {
          left: `${progress * 100}%`,
          top: '50%',
          transform: transforms,
        };
    }
  };

  // Get vehicle image based on load state
  const getVehicleImage = () => {
    return isLoaded ? truckFilled : truckEmpty;
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
      <img
        src={getVehicleImage()}
        alt={isLoaded ? "Truck loaded" : "Truck empty"}
        className="object-contain"
        style={{
          width: '64px',
          height: '64px',
          transform: 'scaleX(-1) scaleY(-1)', // Mirror both vehicle images horizontally and vertically
        }}
      />
    </div>
  ) : null;
};

