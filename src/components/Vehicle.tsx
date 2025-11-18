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
  cellSize?: number; // Size of a grid cell in pixels for offset calculation
  onReachDestination?: () => void;
  isAtDestination?: boolean; // true if vehicle is at final destination (Point A when returning)
}

export const Vehicle = ({ id, gridColumn, gridRow, progress, direction, isLoaded, reverseDirection = false, goingToB = true, cellSize = 20, onReachDestination, isAtDestination = false }: VehicleProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [opacity, setOpacity] = useState(0); // Start with 0 for fade in
  const [isRemoving, setIsRemoving] = useState(false);

  // Calculate position within the cell based on progress and road direction
  // No rotation or flip - image orientation is as default
  // Apply -1 cell offset in Y axis (upward)
  const getPosition = () => {
    // Progress determines position within the cell (0 = start, 1 = end)
    // Position changes based on road direction
    // Apply translate for centering and -1 cell offset in Y axis
    const yOffset = -cellSize; // -1 cell in Y axis (upward)
    
    switch (direction) {
      case 'east':
        // Move from left (0%) to right (100%)
        return {
          left: `${progress * 100}%`,
          top: `calc(50% + ${yOffset}px)`,
          transform: 'translate(-50%, -50%)',
        };
      case 'west':
        // Move from right (100%) to left (0%)
        return {
          left: `${(1 - progress) * 100}%`,
          top: `calc(50% + ${yOffset}px)`,
          transform: 'translate(-50%, -50%)',
        };
      case 'south':
        // Move from top (0%) to bottom (100%)
        return {
          left: '50%',
          top: `calc(${progress * 100}% + ${yOffset}px)`,
          transform: 'translate(-50%, -50%)',
        };
      case 'north':
        // Move from bottom (100%) to top (0%)
        return {
          left: '50%',
          top: `calc(${(1 - progress) * 100}% + ${yOffset}px)`,
          transform: 'translate(-50%, -50%)',
        };
      default:
        // Default to east
        return {
          left: `${progress * 100}%`,
          top: `calc(50% + ${yOffset}px)`,
          transform: 'translate(-50%, -50%)',
        };
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
        }}
      />
    </div>
  ) : null;
};

