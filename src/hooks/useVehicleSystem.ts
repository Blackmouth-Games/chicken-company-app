import { useState, useEffect, useCallback, useRef } from "react";
import { parseGridNotation } from "@/lib/layoutCollisions";

interface Vehicle {
  id: string;
  currentRoadId: string;
  currentCol: number;
  currentRow: number;
  progress: number; // 0 to 1, progress along current road
  path: string[]; // Array of road IDs representing the path
  pathIndex: number; // Current index in the path
  isLoaded: boolean; // true when going from B to A (lleno), false when going from A to B (vacío)
  goingToB: boolean; // true if going A->B, false if going B->A
  pointAId: string; // ID of point A road
  pointBId: string; // ID of point B road
}

interface Road {
  id: string;
  gridColumn: string;
  gridRow: string;
  direction: 'north' | 'south' | 'east' | 'west';
  isPointA?: boolean;
  isPointB?: boolean;
  isTransport?: boolean;
}

const VEHICLE_SPEED = 0.015; // Progress increment per frame (slower than eggs)
const VEHICLE_SPAWN_INTERVAL = 5000; // Spawn vehicle every 5 seconds per route
const VEHICLE_WAIT_TIME = 2000; // Wait 2 seconds at destination before returning

export const useVehicleSystem = (roads: Road[]) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const animationFrameRef = useRef<number>();
  const lastSpawnTimeRef = useRef<Map<string, number>>(new Map());
  const vehicleWaitTimeRef = useRef<Map<string, number>>(new Map());

  // Find point A and point B roads
  const findPointA = useCallback((): Road | null => {
    return roads.find(r => r.isPointA) || null;
  }, [roads]);

  const findPointB = useCallback((): Road | null => {
    return roads.find(r => r.isPointB) || null;
  }, [roads]);

  // Find next road in the path based on direction (bidirectional)
  // Roads are 2x2, so we need to check adjacent roads
  const findNextRoad = useCallback((currentRoad: Road, roads: Road[], goingToB: boolean): Road | null => {
    const currentPos = parseGridNotation(currentRoad.gridColumn);
    const currentRow = parseGridNotation(currentRoad.gridRow);
    
    // Roads are 2x2, so we check adjacent positions
    // Check all 4 directions (north, south, east, west)
    const directions = [
      { col: currentPos.start, row: currentRow.start - 1, name: 'north' }, // Above
      { col: currentPos.start, row: currentRow.end, name: 'south' }, // Below
      { col: currentPos.end, row: currentRow.start, name: 'east' }, // Right
      { col: currentPos.start - 1, row: currentRow.start, name: 'west' }, // Left
    ];
    
    // Find all adjacent roads
    const adjacentRoads = directions
      .map(dir => {
        const road = roads.find(r => {
          const rCol = parseGridNotation(r.gridColumn);
          const rRow = parseGridNotation(r.gridRow);
          // Check if the adjacent position is within the road (roads are 2x2)
          return rCol.start <= dir.col && rCol.end > dir.col && rRow.start <= dir.row && rRow.end > dir.row;
        });
        return road ? { ...dir, road } : null;
      })
      .filter((item): item is { col: number; row: number; name: string; road: Road } => item !== null);
    
    // Filter roads based on destination
    for (const adjacent of adjacentRoads) {
      const nextRoad = adjacent.road;
      
      // If going to B, prioritize point B, then transport, then point A
      if (goingToB) {
        if (nextRoad.isPointB) return nextRoad;
        if (nextRoad.isTransport) return nextRoad;
        if (nextRoad.isPointA && nextRoad.id !== currentRoad.id) return nextRoad;
      } else {
        // If going to A, prioritize point A, then transport, then point B
        if (nextRoad.isPointA) return nextRoad;
        if (nextRoad.isTransport) return nextRoad;
        if (nextRoad.isPointB && nextRoad.id !== currentRoad.id) return nextRoad;
      }
    }
    
    // If no specific type found, return first adjacent road (for flexibility)
    return adjacentRoads.length > 0 ? adjacentRoads[0].road : null;
  }, []);

  // Calculate path from point A to point B (or reverse)
  const calculatePath = useCallback((startRoad: Road, targetRoad: Road, roads: Road[], goingToB: boolean): string[] => {
    const path: string[] = [startRoad.id];
    const visited = new Set<string>([startRoad.id]);
    let currentRoad = startRoad;
    const maxPathLength = 200; // Prevent infinite loops
    
    for (let i = 0; i < maxPathLength; i++) {
      // Check if we reached the target
      if (currentRoad.id === targetRoad.id) {
        return path;
      }
      
      const nextRoad = findNextRoad(currentRoad, roads, goingToB);
      if (!nextRoad || visited.has(nextRoad.id)) {
        // No path found or loop detected
        return path;
      }
      
      path.push(nextRoad.id);
      visited.add(nextRoad.id);
      currentRoad = nextRoad;
    }
    
    return path;
  }, [findNextRoad]);

  // Spawn vehicle from point A to point B (vacío)
  const spawnVehicle = useCallback((pointA: Road, pointB: Road) => {
    const path = calculatePath(pointA, pointB, roads, true);
    if (path.length === 0 || path[path.length - 1] !== pointB.id) return; // No valid path
    
    const roadPos = parseGridNotation(pointA.gridColumn);
    const roadRow = parseGridNotation(pointA.gridRow);
    
    const newVehicle: Vehicle = {
      id: `vehicle-${Date.now()}-${Math.random()}`,
      currentRoadId: pointA.id,
      currentCol: roadPos.start,
      currentRow: roadRow.start,
      progress: 0,
      path,
      pathIndex: 0,
      isLoaded: false, // Starting empty (vacío)
      goingToB: true, // Going from A to B
      pointAId: pointA.id,
      pointBId: pointB.id,
    };
    
    setVehicles(prev => [...prev, newVehicle]);
  }, [roads, calculatePath]);

  // Update vehicle positions
  const updateVehicles = useCallback(() => {
    setVehicles(prevVehicles => {
      return prevVehicles.map(vehicle => {
        // Check if vehicle is waiting at destination
        const waitKey = `${vehicle.id}-wait`;
        const waitStart = vehicleWaitTimeRef.current.get(waitKey);
        if (waitStart) {
          const waitElapsed = Date.now() - waitStart;
          if (waitElapsed < VEHICLE_WAIT_TIME) {
            // Still waiting, don't move
            return vehicle;
          } else {
            // Wait finished, start return journey
            vehicleWaitTimeRef.current.delete(waitKey);
            
            // Reverse the path and direction
            const pointA = roads.find(r => r.id === vehicle.pointAId);
            const pointB = roads.find(r => r.id === vehicle.pointBId);
            if (!pointA || !pointB) return null;
            
            const returnPath = calculatePath(pointB, pointA, roads, false);
            if (returnPath.length === 0) return null;
            
            const roadPos = parseGridNotation(pointB.gridColumn);
            const roadRow = parseGridNotation(pointB.gridRow);
            
            return {
              ...vehicle,
              currentRoadId: pointB.id,
              currentCol: roadPos.start,
              currentRow: roadRow.start,
              progress: 0,
              path: returnPath,
              pathIndex: 0,
              isLoaded: true, // Now loaded (lleno)
              goingToB: false, // Going from B to A
            };
          }
        }
        
        // Find current road
        const currentRoad = roads.find(r => r.id === vehicle.currentRoadId);
        if (!currentRoad) {
          // Road no longer exists, remove vehicle
          return null;
        }
        
        // Check if vehicle reached destination
        if (vehicle.goingToB && currentRoad.isPointB && vehicle.progress >= 1) {
          // Reached point B, start waiting
          vehicleWaitTimeRef.current.set(waitKey, Date.now());
          return vehicle;
        }
        
        if (!vehicle.goingToB && currentRoad.isPointA && vehicle.progress >= 1) {
          // Reached point A, remove vehicle (completed cycle)
          return null;
        }
        
        // Update progress
        let newProgress = vehicle.progress + VEHICLE_SPEED;
        
        // If progress >= 1, move to next road in path
        if (newProgress >= 1) {
          const nextPathIndex = vehicle.pathIndex + 1;
          if (nextPathIndex >= vehicle.path.length) {
            // Reached end of path
            if (vehicle.goingToB && currentRoad.isPointB) {
              // Start waiting at point B
              vehicleWaitTimeRef.current.set(waitKey, Date.now());
              return vehicle;
            }
            if (!vehicle.goingToB && currentRoad.isPointA) {
              // Reached point A, remove vehicle
              return null;
            }
            // No more path, keep at current position
            return { ...vehicle, progress: 1 };
          }
          
          const nextRoadId = vehicle.path[nextPathIndex];
          const nextRoad = roads.find(r => r.id === nextRoadId);
          if (!nextRoad) {
            return null;
          }
          
          const nextPos = parseGridNotation(nextRoad.gridColumn);
          const nextRow = parseGridNotation(nextRoad.gridRow);
          
          return {
            ...vehicle,
            currentRoadId: nextRoadId,
            currentCol: nextPos.start,
            currentRow: nextRow.start,
            progress: 0,
            pathIndex: nextPathIndex,
          };
        }
        
        return { ...vehicle, progress: newProgress };
      }).filter((vehicle): vehicle is Vehicle => vehicle !== null);
    });
  }, [roads, calculatePath]);

  // Spawn vehicles from point A to point B periodically
  useEffect(() => {
    const pointA = findPointA();
    const pointB = findPointB();
    
    if (!pointA || !pointB) return;
    
    const routeKey = `${pointA.id}-${pointB.id}`;
    
    const interval = setInterval(() => {
      const now = Date.now();
      const lastSpawn = lastSpawnTimeRef.current.get(routeKey) || 0;
      
      if (now - lastSpawn >= VEHICLE_SPAWN_INTERVAL) {
        // Add random delay for async spawning
        const randomDelay = Math.random() * 1000;
        setTimeout(() => {
          spawnVehicle(pointA, pointB);
        }, randomDelay);
        
        lastSpawnTimeRef.current.set(routeKey, now);
      }
    }, 1000); // Check every second
    
    return () => clearInterval(interval);
  }, [findPointA, findPointB, spawnVehicle]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      updateVehicles();
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [updateVehicles]);

  return { vehicles };
};

