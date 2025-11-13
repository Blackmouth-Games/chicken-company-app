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
  reverseDirection?: boolean; // true if moving in reverse direction (from 1 to 0)
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

const BASE_VEHICLE_SPEED = 0.05; // Base progress increment per frame (increased for visibility)
const BASE_VEHICLE_SPAWN_INTERVAL = 30000; // Base spawn interval: 30 seconds per route (much higher)
const VEHICLE_WAIT_TIME = 2000; // Wait 2 seconds at destination before returning
const MAX_VEHICLES = 1; // Only one vehicle at a time

// Calculate vehicle speed based on market level
// Higher level = faster speed
const getVehicleSpeed = (marketLevel: number): number => {
  // Level 1 = base speed, level 5 = 2x speed
  const speedMultiplier = 1 + (marketLevel - 1) * 0.25; // 1.0, 1.25, 1.5, 1.75, 2.0
  return BASE_VEHICLE_SPEED * speedMultiplier;
};

// Calculate spawn interval based on market level
// Higher level = shorter interval (more frequent spawns), but still much higher than before
const getVehicleSpawnInterval = (marketLevel: number): number => {
  // Level 1 = 30000ms (30s), level 2 = 25000ms (25s), level 3 = 20000ms (20s), level 4 = 15000ms (15s), level 5 = 10000ms (10s)
  const interval = BASE_VEHICLE_SPAWN_INTERVAL - (marketLevel - 1) * 5000;
  return Math.max(10000, interval); // Minimum 10 seconds
};

export const useVehicleSystem = (roads: Road[], marketLevel: number = 1) => {
  // Calculate dynamic values based on market level
  const vehicleSpeed = getVehicleSpeed(marketLevel);
  const vehicleSpawnInterval = getVehicleSpawnInterval(marketLevel);
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
    
    // Find all adjacent roads by checking for overlap or adjacency
    // Two roads are adjacent if they share a border (for 2x2 roads)
    const adjacentRoads = roads
      .filter(r => r.id !== currentRoad.id) // Exclude current road
      .map(r => {
        const rCol = parseGridNotation(r.gridColumn);
        const rRow = parseGridNotation(r.gridRow);
        
        // Check if roads are adjacent (share a border)
        // North: current road's top row touches other road's bottom row
        const isNorth = currentRow.start === rRow.end;
        // South: current road's bottom row touches other road's top row
        const isSouth = currentRow.end === rRow.start;
        // East: current road's right column touches other road's left column
        const isEast = currentPos.end === rCol.start;
        // West: current road's left column touches other road's right column
        const isWest = currentPos.start === rCol.end;
        
        // Also check for overlap (roads that share cells)
        const overlapsCol = !(currentPos.end <= rCol.start || rCol.end <= currentPos.start);
        const overlapsRow = !(currentRow.end <= rRow.start || rRow.end <= currentRow.start);
        const overlaps = overlapsCol && overlapsRow;
        
        // Roads are adjacent if they share a border or overlap
        if (isNorth || isSouth || isEast || isWest || overlaps) {
          // Determine direction
          let direction = '';
          if (isNorth) direction = 'north';
          else if (isSouth) direction = 'south';
          else if (isEast) direction = 'east';
          else if (isWest) direction = 'west';
          else if (overlaps) {
            // If overlapping, determine primary direction based on center positions
            const currentCenterCol = (currentPos.start + currentPos.end) / 2;
            const currentCenterRow = (currentRow.start + currentRow.end) / 2;
            const rCenterCol = (rCol.start + rCol.end) / 2;
            const rCenterRow = (rRow.start + rRow.end) / 2;
            
            const colDiff = rCenterCol - currentCenterCol;
            const rowDiff = rCenterRow - currentCenterRow;
            
            if (Math.abs(colDiff) > Math.abs(rowDiff)) {
              direction = colDiff > 0 ? 'east' : 'west';
            } else {
              direction = rowDiff > 0 ? 'south' : 'north';
            }
          }
          
          return { road: r, direction };
        }
        return null;
      })
      .filter((item): item is { road: Road; direction: string } => item !== null);
    
    // Filter roads based on destination and prioritize by type
    // If going to B, prioritize point B, then transport, then any road
    if (goingToB) {
      // First, try to find point B
      const pointB = adjacentRoads.find(a => a.road.isPointB);
      if (pointB) return pointB.road;
      
      // Then try transport roads
      const transport = adjacentRoads.find(a => a.road.isTransport);
      if (transport) return transport.road;
      
      // Then any other road (including point A if it's not the starting point)
      if (adjacentRoads.length > 0) return adjacentRoads[0].road;
    } else {
      // If going to A, prioritize point A, then transport, then any road
      const pointA = adjacentRoads.find(a => a.road.isPointA);
      if (pointA) return pointA.road;
      
      const transport = adjacentRoads.find(a => a.road.isTransport);
      if (transport) return transport.road;
      
      if (adjacentRoads.length > 0) return adjacentRoads[0].road;
    }
    
    return null;
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
            
            // Calculate initial progress and reverse direction for return journey
            // When returning, we start from point B and need to calculate which side to exit from
            const roadPos = parseGridNotation(pointB.gridColumn);
            const roadRow = parseGridNotation(pointB.gridRow);
            
            // For return journey, we need to determine initial direction
            // Check if there's a next road in the return path
            let initialProgress = 0;
            let reverseDirection = false;
            
            if (returnPath.length > 1) {
              const nextRoadId = returnPath[1];
              const nextRoad = roads.find(r => r.id === nextRoadId);
              if (nextRoad) {
                const nextPos = parseGridNotation(nextRoad.gridColumn);
                const nextRow = parseGridNotation(nextRoad.gridRow);
                
                // Calculate center positions
                const currentCenterCol = (roadPos.start + roadPos.end) / 2;
                const currentCenterRow = (roadRow.start + roadRow.end) / 2;
                const nextCenterCol = (nextPos.start + nextPos.end) / 2;
                const nextCenterRow = (nextRow.start + nextRow.end) / 2;
                
                // Determine exit side based on relative positions (where we're going TO)
                const colDiff = nextCenterCol - currentCenterCol;
                const rowDiff = nextCenterRow - currentCenterRow;
                
                // Based on the road direction and where we're going, set initial progress
                // For return journey, we want to exit from the side closest to the next road
                if (Math.abs(colDiff) > Math.abs(rowDiff)) {
                  // Horizontal movement (east/west)
                  if (pointB.direction === 'east') {
                    // Road points east: exit from right side (progress 1) if next is to the right, or left (0) if next is to the left
                    initialProgress = colDiff > 0 ? 1 : 0; // Exit from right if going right, left if going left
                    reverseDirection = colDiff <= 0; // Reverse if going left (from right to left)
                  } else if (pointB.direction === 'west') {
                    // Road points west: exit from left side (progress 1) if next is to the left, or right (0) if next is to the right
                    initialProgress = colDiff > 0 ? 0 : 1; // Exit from left if going right, right if going left
                    reverseDirection = colDiff > 0; // Reverse if going right (from left to right)
                  }
                } else {
                  // Vertical movement (north/south)
                  if (pointB.direction === 'south') {
                    // Road points south: exit from bottom (progress 1) if next is below, or top (0) if next is above
                    initialProgress = rowDiff > 0 ? 1 : 0; // Exit from bottom if going down, top if going up
                    reverseDirection = rowDiff <= 0; // Reverse if going up (from bottom to top)
                  } else if (pointB.direction === 'north') {
                    // Road points north: exit from top (progress 1) if next is above, or bottom (0) if next is below
                    initialProgress = rowDiff > 0 ? 0 : 1; // Exit from top if going down, bottom if going up
                    reverseDirection = rowDiff > 0; // Reverse if going down (from top to bottom)
                  }
                }
              }
            }
            
            return {
              ...vehicle,
              currentRoadId: pointB.id,
              currentCol: roadPos.start,
              currentRow: roadRow.start,
              progress: initialProgress,
              path: returnPath,
              pathIndex: 0,
              isLoaded: true, // Now loaded (lleno)
              goingToB: false, // Going from B to A
              reverseDirection,
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
        const progressAtEnd = vehicle.reverseDirection ? vehicle.progress <= 0 : vehicle.progress >= 1;
        if (vehicle.goingToB && currentRoad.isPointB && progressAtEnd) {
          // Reached point B, start waiting
          vehicleWaitTimeRef.current.set(waitKey, Date.now());
          return vehicle;
        }
        
        if (!vehicle.goingToB && currentRoad.isPointA && progressAtEnd) {
          // Reached point A, remove vehicle (completed cycle)
          return null;
        }
        
        // Update progress (speed varies by market level)
        // If reverseDirection is true, decrease progress instead of increase
        let newProgress = vehicle.reverseDirection 
          ? vehicle.progress - vehicleSpeed 
          : vehicle.progress + vehicleSpeed;
        
        // Check if we've reached the end (either 0 or 1 depending on direction)
        const reachedEnd = vehicle.reverseDirection ? newProgress <= 0 : newProgress >= 1;
        
        if (reachedEnd) {
          // Clamp progress to valid range
          newProgress = vehicle.reverseDirection ? 0 : 1;
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
            const finalProgress = vehicle.reverseDirection ? 0 : 1;
            return { ...vehicle, progress: finalProgress };
          }
          
          const nextRoadId = vehicle.path[nextPathIndex];
          const nextRoad = roads.find(r => r.id === nextRoadId);
          if (!nextRoad) {
            return null;
          }
          
          const nextPos = parseGridNotation(nextRoad.gridColumn);
          const nextRow = parseGridNotation(nextRoad.gridRow);
          const currentPos = parseGridNotation(currentRoad.gridColumn);
          const currentRow = parseGridNotation(currentRoad.gridRow);
          
          // Calculate initial progress based on entry side
          // Determine which side of the new road the vehicle enters from
          let initialProgress = 0;
          
          // Calculate center positions
          const currentCenterCol = (currentPos.start + currentPos.end) / 2;
          const currentCenterRow = (currentRow.start + currentRow.end) / 2;
          const nextCenterCol = (nextPos.start + nextPos.end) / 2;
          const nextCenterRow = (nextRow.start + nextRow.end) / 2;
          
          // Determine entry side based on relative positions
          const colDiff = nextCenterCol - currentCenterCol;
          const rowDiff = nextCenterRow - currentCenterRow;
          
          // Based on the road direction and where we're coming from, set initial progress
          let reverseDirection = false;
          if (Math.abs(colDiff) > Math.abs(rowDiff)) {
            // Horizontal movement (east/west)
            if (nextRoad.direction === 'east') {
              // Road points east: enter from left (0) or right (1)
              initialProgress = colDiff > 0 ? 0 : 1; // Coming from left = 0, from right = 1
              reverseDirection = colDiff <= 0; // If coming from right, reverse
            } else if (nextRoad.direction === 'west') {
              // Road points west: enter from right (0) or left (1)
              initialProgress = colDiff > 0 ? 1 : 0; // Coming from left = 1, from right = 0
              reverseDirection = colDiff > 0; // If coming from left, reverse
            }
          } else {
            // Vertical movement (north/south)
            if (nextRoad.direction === 'south') {
              // Road points south: enter from top (0) or bottom (1)
              initialProgress = rowDiff > 0 ? 0 : 1; // Coming from above = 0, from below = 1
              reverseDirection = rowDiff <= 0; // If coming from below, reverse
            } else if (nextRoad.direction === 'north') {
              // Road points north: enter from bottom (0) or top (1)
              initialProgress = rowDiff > 0 ? 1 : 0; // Coming from above = 1, from below = 0
              reverseDirection = rowDiff > 0; // If coming from above, reverse
            }
          }
          
          return {
            ...vehicle,
            currentRoadId: nextRoadId,
            currentCol: nextPos.start,
            currentRow: nextRow.start,
            progress: initialProgress,
            pathIndex: nextPathIndex,
            reverseDirection,
          };
        }
        
        return { ...vehicle, progress: newProgress };
      }).filter((vehicle): vehicle is Vehicle => vehicle !== null);
    });
  }, [roads, calculatePath, vehicleSpeed]);

  // Spawn vehicles from point A to point B periodically
  // Only spawn if there are no vehicles currently in the system
  useEffect(() => {
    const pointA = findPointA();
    const pointB = findPointB();
    
    console.log('[useVehicleSystem] Spawn effect:', {
      hasPointA: !!pointA,
      hasPointB: !!pointB,
      pointAId: pointA?.id,
      pointBId: pointB?.id,
      roadsCount: roads.length,
      vehicleSpawnInterval,
    });
    
    if (!pointA || !pointB) {
      console.warn('[useVehicleSystem] Cannot spawn vehicles: missing Point A or Point B', {
        pointA: !!pointA,
        pointB: !!pointB,
        roads: roads.map(r => ({ id: r.id, isPointA: r.isPointA, isPointB: r.isPointB })),
      });
      return;
    }
    
    const routeKey = `${pointA.id}-${pointB.id}`;
    
    // Initial spawn check
    const checkAndSpawn = () => {
      setVehicles(currentVehicles => {
        if (currentVehicles.length >= MAX_VEHICLES) {
          // Already at max vehicles, don't spawn
          return currentVehicles;
        }
        
        const now = Date.now();
        const lastSpawn = lastSpawnTimeRef.current.get(routeKey) || 0;
        const timeSinceLastSpawn = now - lastSpawn;
        
        console.log('[useVehicleSystem] Spawn check:', {
          currentVehicles: currentVehicles.length,
          maxVehicles: MAX_VEHICLES,
          timeSinceLastSpawn,
          vehicleSpawnInterval,
          canSpawn: timeSinceLastSpawn >= vehicleSpawnInterval,
        });
        
        if (timeSinceLastSpawn >= vehicleSpawnInterval) {
          // Spawn new vehicle
          const path = calculatePath(pointA, pointB, roads, true);
          console.log('[useVehicleSystem] Calculated path:', {
            pathLength: path.length,
            pathEndsAtB: path.length > 0 && path[path.length - 1] === pointB.id,
            path,
          });
          
          if (path.length > 0 && path[path.length - 1] === pointB.id) {
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
            
            console.log('[useVehicleSystem] Spawning vehicle:', newVehicle.id);
            lastSpawnTimeRef.current.set(routeKey, now);
            return [...currentVehicles, newVehicle];
          } else {
            console.warn('[useVehicleSystem] Cannot spawn vehicle: invalid path', {
              pathLength: path.length,
              pathEndsAtB: path.length > 0 ? path[path.length - 1] === pointB.id : false,
            });
          }
        }
        
        return currentVehicles;
      });
    };
    
    // Check immediately
    checkAndSpawn();
    
    // Then check periodically
    const interval = setInterval(checkAndSpawn, 1000); // Check every second
    
    return () => clearInterval(interval);
  }, [findPointA, findPointB, roads, calculatePath, vehicleSpawnInterval]);

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

  // Expose debug information
  const getDebugInfo = useCallback(() => {
    const now = Date.now();
    const pointA = findPointA();
    const pointB = findPointB();
    const routeKey = pointA && pointB ? `${pointA.id}-${pointB.id}` : null;
    const lastSpawn = routeKey ? lastSpawnTimeRef.current.get(routeKey) || 0 : 0;
    const timeSinceLastSpawn = now - lastSpawn;
    const timeUntilSpawn = Math.max(0, vehicleSpawnInterval - timeSinceLastSpawn);
    
    // Calculate path if points exist
    let pathInfo: any = null;
    if (pointA && pointB) {
      const path = calculatePath(pointA, pointB, roads, true);
      const transportRoads = path.map(id => roads.find(r => r.id === id)).filter(Boolean);
      pathInfo = {
        pathLength: path.length,
        isValid: path.length > 0 && path[path.length - 1] === pointB.id,
        transportRoadsCount: transportRoads.filter(r => r?.isTransport).length,
        pathRoads: path.map(id => {
          const road = roads.find(r => r.id === id);
          return road ? {
            id: road.id,
            position: `${road.gridColumn} / ${road.gridRow}`,
            type: road.isPointA ? 'Point A' : road.isPointB ? 'Point B' : road.isTransport ? 'Transport' : 'Normal',
            direction: road.direction,
          } : null;
        }).filter(Boolean),
      };
    }

    const spawnPoint = pointA ? {
      roadId: pointA.id,
      position: `${pointA.gridColumn} / ${pointA.gridRow}`,
      direction: pointA.direction,
      type: 'Point A',
      status: vehicles.length >= MAX_VEHICLES ? 'blocked' : 
              !pointB ? 'no-destination' :
              timeUntilSpawn <= 0 ? 'ready' : 'waiting',
      timeUntilSpawn,
      lastSpawn: lastSpawn || undefined,
    } : null;

    return {
      currentVehicles: vehicles.length,
      maxVehicles: MAX_VEHICLES,
      spawnInterval: vehicleSpawnInterval,
      timeUntilSpawn,
      lastSpawn: lastSpawn || null,
      hasPointA: !!pointA,
      hasPointB: !!pointB,
      canSpawn: vehicles.length < MAX_VEHICLES && !!pointA && !!pointB,
      vehicleSpeed,
      pointAId: pointA?.id,
      pointBId: pointB?.id,
      pointAPosition: pointA ? `${pointA.gridColumn} / ${pointA.gridRow}` : null,
      pointBPosition: pointB ? `${pointB.gridColumn} / ${pointB.gridRow}` : null,
      roadsCount: roads.length,
      transportRoadsCount: roads.filter(r => r.isTransport).length,
      pathInfo,
      spawnPoint,
    };
  }, [vehicles, vehicleSpawnInterval, vehicleSpeed, findPointA, findPointB, roads, calculatePath]);

  return { vehicles, getDebugInfo };
};

