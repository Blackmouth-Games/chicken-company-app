import { useEffect, useState } from "react";
import truckEmpty from "@/assets/vehicles/truck_empty_1A.png";
import truckFilled from "@/assets/vehicles/truck_filled_1A.png";

interface VehicleProps {
  id: string;
  gridColumn: string;
  gridRow: string;
  progress: number; // 0 to 1, progress along the current road
  direction: 'north' | 'south' | 'east' | 'west'; // Direction of the road
  isLoaded: boolean; // true when going from B to A (lleno), false when going from A to B (vacío)
  reverseDirection?: boolean; // true if moving in reverse direction (from 1 to 0)
  goingToB?: boolean; // true if going A->B, false if going B->A (for visual flip)
  cellSize?: number; // Size of a grid cell in pixels for offset calculation
  onReachDestination?: () => void;
  isAtDestination?: boolean; // true if vehicle is at final destination (Point A when returning)
}

export const Vehicle = ({ id, gridColumn, gridRow, progress, direction, isLoaded, reverseDirection = false, goingToB = true, cellSize = 20, onReachDestination, isAtDestination = false }: VehicleProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [opacity, setOpacity] = useState(0); // Start with 0 for fade in
  const [isRemoving, setIsRemoving] = useState(false);

  // Calculate position within the cell based on progress and road direction
  // Apply -1 cell offset in Y axis (upward)
  const getPosition = () => {
    // Progress determines position within the cell (0 = start, 1 = end)
    // Position changes based on road direction and reverseDirection
    // Apply translate for centering and -1 cell offset in Y axis
    const yOffset = -cellSize; // -1 cell in Y axis (upward)
    
    // Calculate position based on road direction and whether we're reversing
    switch (direction) {
      case 'east':
        // Road points east: normally move left to right (0% to 100%)
        // If reverseDirection, move right to left (100% to 0%)
        if (reverseDirection) {
          // Moving from right to left: progress goes from 1 to 0
          return {
            left: `${(1 - progress) * 100}%`,
            top: `calc(50% + ${yOffset}px)`,
            transform: 'translate(-50%, -50%)',
          };
        } else {
          // Moving from left to right: progress goes from 0 to 1
          return {
            left: `${progress * 100}%`,
            top: `calc(50% + ${yOffset}px)`,
            transform: 'translate(-50%, -50%)',
          };
        }
      case 'west':
        // Road points west: normally move right to left (1 to 0)
        // If reverseDirection, move left to right (0 to 1)
        if (reverseDirection) {
          // Moving from left to right: progress goes from 0 to 1
          return {
            left: `${progress * 100}%`,
            top: `calc(50% + ${yOffset}px)`,
            transform: 'translate(-50%, -50%)',
          };
        } else {
          // Moving from right to left: progress goes from 1 to 0
          return {
            left: `${(1 - progress) * 100}%`,
            top: `calc(50% + ${yOffset}px)`,
            transform: 'translate(-50%, -50%)',
          };
        }
      case 'south':
        // Road points south: normally move top to bottom (0% to 100%)
        // If reverseDirection, move bottom to top (100% to 0%)
        if (reverseDirection) {
          // Moving from bottom to top: progress goes from 1 to 0
          return {
            left: '50%',
            top: `calc(${(1 - progress) * 100}% + ${yOffset}px)`,
            transform: 'translate(-50%, -50%)',
          };
        } else {
          // Moving from top to bottom: progress goes from 0 to 1
          return {
            left: '50%',
            top: `calc(${progress * 100}% + ${yOffset}px)`,
            transform: 'translate(-50%, -50%)',
          };
        }
      case 'north':
        // Road points north: normally move bottom to top (1 to 0)
        // If reverseDirection, move top to bottom (0 to 1)
        if (reverseDirection) {
          // Moving from top to bottom: progress goes from 0 to 1
          return {
            left: '50%',
            top: `calc(${progress * 100}% + ${yOffset}px)`,
            transform: 'translate(-50%, -50%)',
          };
        } else {
          // Moving from bottom to top: progress goes from 1 to 0
          return {
            left: '50%',
            top: `calc(${(1 - progress) * 100}% + ${yOffset}px)`,
            transform: 'translate(-50%, -50%)',
          };
        }
      default:
        // Default to east (left to right)
        return {
          left: `${progress * 100}%`,
          top: `calc(50% + ${yOffset}px)`,
          transform: 'translate(-50%, -50%)',
        };
    }
  };

  // Get image rotation based on actual movement direction
  const getImageRotation = () => {
    // Determine actual movement direction based on road direction and reverseDirection
    let actualDirection = direction;
    if (reverseDirection) {
      // Invert the direction when reversing
      switch (direction) {
        case 'east': actualDirection = 'west'; break;
        case 'west': actualDirection = 'east'; break;
        case 'south': actualDirection = 'north'; break;
        case 'north': actualDirection = 'south'; break;
      }
    }
    
    // Rotate image to face the direction of movement
    switch (actualDirection) {
      case 'east': return 'rotate(0deg)'; // Right
      case 'west': return 'rotate(180deg)'; // Left
      case 'south': return 'rotate(90deg)'; // Down
      case 'north': return 'rotate(270deg)'; // Up
      default: return 'rotate(0deg)';
    }
  };

  // Get vehicle image based on load state
  const getVehicleImage = () => {
    return isLoaded ? truckFilled : truckEmpty;
  };

  // Fade in when vehicle appears
  useEffect(() => {
    // Start fade in animation
    const timer = setTimeout(() => {
      setOpacity(1);
    }, 10); // Small delay to trigger animation
    
    return () => clearTimeout(timer);
  }, []);

  // Handle fade out when vehicle is being removed
  useEffect(() => {
    if (isRemoving) {
      setOpacity(0);
      // After fade out animation completes, hide the vehicle
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 300); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [isRemoving]);

  // Detect when vehicle should be removed (e.g., when progress reaches end or at destination)
  useEffect(() => {
    // Check if vehicle is at final destination or near the end of its journey
    // Start fade out earlier to ensure animation completes before removal
    const isNearEnd = reverseDirection 
      ? progress <= 0.1  // Near start (0) when reversing
      : progress >= 0.9; // Near end (1) when going forward
    
    // Start fade out if vehicle is at destination or near the end
    if ((isAtDestination || isNearEnd) && !isRemoving) {
      setIsRemoving(true);
      // Call onReachDestination if provided
      if (onReachDestination) {
        const timer = setTimeout(() => {
          onReachDestination();
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [progress, reverseDirection, isAtDestination, onReachDestination, isRemoving]);

  return isVisible ? (
    <div
      className="absolute z-5 pointer-events-none"
      style={{
        gridColumn,
        gridRow,
        ...getPosition(),
        width: 0,
        height: 0,
        opacity,
        transition: 'opacity 0.3s ease-in-out',
      }}
    >
      <img
        src={getVehicleImage()}
        alt={isLoaded ? "Truck loaded" : "Truck empty"}
        style={{
          width: '64px',
          height: '64px',
          minWidth: '64px',
          minHeight: '64px',
          maxWidth: '64px',
          maxHeight: '64px',
          display: 'block',
          flexShrink: 0,
          objectFit: 'contain',
          transform: getImageRotation(),
        }}
      />
    </div>
  ) : null;
};

