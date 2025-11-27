import { useState, useEffect, useCallback, useRef } from "react";
import { parseGridNotation } from "@/lib/layoutCollisions";

type Direction = 'north' | 'south' | 'east' | 'west';

interface Egg {
  id: string;
  currentBeltId: string;
  currentCol: number;
  currentRow: number;
  progress: number; // 0 to 1, progress along current belt
  path: string[]; // Array of belt IDs representing the path
  pathIndex: number; // Current index in the path
  coopId: string; // ID of the coop that emitted this egg
  entryDirection?: Direction; // Direction from which egg entered current belt (for turn belts)
}

interface Belt {
  id: string;
  gridColumn: string;
  gridRow: string;
  direction: Direction;
  type?: 'straight' | 'curve-ne' | 'curve-nw' | 'curve-se' | 'curve-sw' | 'turn' | 'turn-rt' | 'turn-lt' | 'turn-ne' | 'turn-nw' | 'turn-se' | 'turn-sw' | 'funnel';
  isOutput?: boolean;
  isDestiny?: boolean;
  slotPosition?: number; // Position index of the slot this output belongs to
  coopId?: string; // Deprecated: use slotPosition instead
}

const EGG_SPEED = 0.02; // Progress increment per frame (adjust for speed)
const BASE_EGG_SPAWN_INTERVAL = 5000; // Base spawn interval (5 seconds) for level 1
const MAX_EGGS = 50; // Maximum number of eggs in the system
const EGG_MAX_AGE = 60000; // Maximum age for an egg (60 seconds) before removal

// Calculate spawn interval based on coop level (higher level = faster spawn)
const getEggSpawnInterval = (level: number): number => {
  // Level 1: 5s, Level 2: 4s, Level 3: 3s, Level 4: 2s, Level 5: 1.5s
  return Math.max(1500, BASE_EGG_SPAWN_INTERVAL - (level - 1) * 1000);
};

const DIRECTION_ORDER: Direction[] = ['north', 'east', 'south', 'west'];

const rotateDirection = (dir: Direction, steps: number): Direction => {
  const currentIndex = DIRECTION_ORDER.indexOf(dir);
  if (currentIndex === -1) {
    return dir;
  }
  const nextIndex = (currentIndex + steps + DIRECTION_ORDER.length) % DIRECTION_ORDER.length;
  return DIRECTION_ORDER[nextIndex];
};

const getCurveExitDirection = (type?: Belt['type'], entryDir?: Direction): Direction | null => {
  if (!type || !entryDir) return null;
  
  switch (type) {
    case 'curve-ne':
    case 'turn-ne':
      return rotateDirection(entryDir, 1); // Clockwise
    case 'curve-nw':
    case 'turn-nw':
      return rotateDirection(entryDir, -1); // Counterclockwise
    case 'curve-se':
    case 'turn-se':
      return rotateDirection(entryDir, -1); // Counterclockwise (BR)
    case 'curve-sw':
    case 'turn-sw':
      return rotateDirection(entryDir, 1); // Clockwise (BL)
    default:
      return null;
  }
};

export const useEggSystem = (belts: Belt[], buildings: any[]) => {
  const [eggs, setEggs] = useState<Egg[]>([]);
  const animationFrameRef = useRef<number>();
  const lastSpawnTimeRef = useRef<Map<string, number>>(new Map());
  const eggCreationTimeRef = useRef<Map<string, number>>(new Map());
  const isPageVisibleRef = useRef(true);
  const coopBeltMappingRef = useRef<Map<string, string>>(new Map()); // Maps coopId to beltId

  // Get coops from buildings - handle undefined/null
  const coops = (buildings || []).filter(b => b && b.building_type === 'coop');

  // Find output belt for a coop by slot position
  // CRITICAL: Each coop MUST have its own dedicated belt - NO SHARING between coops
  const findOutputBelt = useCallback((slotPosition: number, coopId: string): Belt | null => {
    // Priority 1: Try exact slotPosition match (best case - belt was created for this exact position)
    const exactMatch = belts.find(b => b.isOutput && b.slotPosition === slotPosition);
    if (exactMatch) {
      // Check if this belt is already assigned to a different coop
      const currentOwner = Array.from(coopBeltMappingRef.current.entries()).find(([_, beltId]) => beltId === exactMatch.id)?.[0];
      if (currentOwner && currentOwner !== coopId) {
        console.warn(`[useEggSystem] Belt ${exactMatch.id} (slotPosition ${slotPosition}) is already assigned to coop ${currentOwner}, but coop ${coopId} also needs it. This is a conflict.`);
        // Don't steal the belt - each coop needs its own
      } else {
        coopBeltMappingRef.current.set(coopId, exactMatch.id);
        console.log(`[useEggSystem] ✅ Coop ${coopId} (position ${slotPosition}) matched exact belt ${exactMatch.id}`);
        return exactMatch;
      }
    }
    
    // Priority 2: Check if this coop already has a belt assigned (persistent assignment)
    const assignedBeltId = coopBeltMappingRef.current.get(coopId);
    if (assignedBeltId) {
      const assignedBelt = belts.find(b => b.id === assignedBeltId && b.isOutput);
      if (assignedBelt) {
        // Verify this belt is not assigned to another coop
        const otherOwner = Array.from(coopBeltMappingRef.current.entries()).find(([id, beltId]) => beltId === assignedBeltId && id !== coopId)?.[0];
        if (!otherOwner) {
          console.log(`[useEggSystem] ✅ Coop ${coopId} (position ${slotPosition}) using previously assigned dedicated belt ${assignedBelt.id}`);
          return assignedBelt;
        } else {
          // Belt was reassigned to another coop, clear our mapping
          console.warn(`[useEggSystem] Belt ${assignedBeltId} was reassigned to coop ${otherOwner}, clearing mapping for coop ${coopId}`);
          coopBeltMappingRef.current.delete(coopId);
        }
      } else {
        // Belt was removed, clear the mapping
        coopBeltMappingRef.current.delete(coopId);
      }
    }
    
    // Priority 3: Find an unassigned output belt (only if no exact match exists)
    // IMPORTANT: Each coop must have its own dedicated belt - NO SHARING
    const allOutputBelts = belts.filter(b => 
      b.isOutput && 
      !b.isDestiny
    );
    
    if (allOutputBelts.length === 0) {
      console.error(`[useEggSystem] ❌ No output belts available for coop ${coopId} (position ${slotPosition})`);
      return null;
    }
    
    // Get belts already assigned to other coops
    const assignedBeltIds = new Set(Array.from(coopBeltMappingRef.current.values()));
    
    // Find an unassigned output belt
    // Prefer belts without slotPosition (they're more flexible)
    const unassignedBelt = allOutputBelts.find(b => 
      !assignedBeltIds.has(b.id) && 
      (b.slotPosition === undefined || b.slotPosition === null)
    ) || allOutputBelts.find(b => !assignedBeltIds.has(b.id));
    
    if (unassignedBelt) {
      coopBeltMappingRef.current.set(coopId, unassignedBelt.id);
      console.log(`[useEggSystem] ✅ Coop ${coopId} (position ${slotPosition}) assigned to dedicated belt ${unassignedBelt.id} (slotPosition: ${unassignedBelt.slotPosition ?? 'none'})`);
      return unassignedBelt;
    }
    
    // NO SHARING: If all belts are assigned, this coop cannot spawn eggs
    // Each coop must have its own dedicated output belt
    console.error(`[useEggSystem] ❌ Failed to find dedicated output belt for coop ${coopId} (position ${slotPosition}). All ${allOutputBelts.length} output belts are already assigned to other coops. This coop will NOT spawn eggs.`);
    console.error(`[useEggSystem] Assigned belts:`, Array.from(coopBeltMappingRef.current.entries()).map(([id, beltId]) => `Coop ${id.slice(0, 8)}... -> Belt ${beltId}`));
    return null;
  }, [belts]);

  // Find next belt in the path based on direction and belt type
  const findNextBelt = useCallback((currentBelt: Belt, belts: Belt[], entryDirection?: 'north' | 'south' | 'east' | 'west'): Belt | null => {
    const currentPos = parseGridNotation(currentBelt.gridColumn);
    const currentRow = parseGridNotation(currentBelt.gridRow);
    
    let nextCol: number;
    let nextRow: number;
    let exitDirection: 'north' | 'south' | 'east' | 'west';
    
    // Handle special belt types
    if (currentBelt.type === 'funnel') {
      // Funnel: always exit in the belt's direction, regardless of entry
      exitDirection = currentBelt.direction;
    } else if ((currentBelt.type === 'turn' || currentBelt.type?.startsWith('turn-')) && entryDirection) {
      // Turn belts: rotate 90 degrees based on type
      // turn-lt: counterclockwise (antihorario)
      // All others: clockwise (horario)
      const directions: ('north' | 'south' | 'east' | 'west')[] = ['north', 'east', 'south', 'west'];
      const currentIndex = directions.indexOf(entryDirection);
      
      if (currentBelt.type === 'turn-lt') {
        // Counterclockwise: go back one direction
        const prevIndex = (currentIndex - 1 + 4) % 4;
        exitDirection = directions[prevIndex];
      } else {
        // Clockwise: go forward one direction (RT, NE, NW, SE, SW, and legacy 'turn')
        const nextIndex = (currentIndex + 1) % 4;
        exitDirection = directions[nextIndex];
      }
      } else if (currentBelt.type?.startsWith('curve-') && entryDirection) {
      const curveExit = getCurveExitDirection(currentBelt.type, entryDirection);
      if (curveExit) {
        exitDirection = curveExit;
      } else {
        // Fallback: use belt direction if curve exit calculation fails
        exitDirection = currentBelt.direction;
      }
    } else {
      // Default: use belt's direction
      exitDirection = currentBelt.direction;
    }
    
    // Calculate next position based on exit direction
    switch (exitDirection) {
      case 'east':
        nextCol = currentPos.end;
        nextRow = currentRow.start;
        break;
      case 'west':
        nextCol = currentPos.start - 1;
        nextRow = currentRow.start;
        break;
      case 'south':
        nextCol = currentPos.start;
        nextRow = currentRow.end;
        break;
      case 'north':
        nextCol = currentPos.start;
        nextRow = currentRow.start - 1;
        break;
      default:
        return null;
    }
    
    // Find belt at next position
    // For funnel belts, also check if the next belt can accept from multiple directions
    const nextBelt = belts.find(b => {
      const bCol = parseGridNotation(b.gridColumn);
      const bRow = parseGridNotation(b.gridRow);
      const isAtPosition = bCol.start === nextCol && bRow.start === nextRow;
      
      if (!isAtPosition) return false;
      
      // If next belt is a funnel, it can accept from any of its 3 input directions
      if (b.type === 'funnel') {
        const directions: ('north' | 'south' | 'east' | 'west')[] = ['north', 'east', 'south', 'west'];
        const outputIndex = directions.indexOf(b.direction);
        // Funnel accepts from: opposite direction and the two adjacent directions
        const input1Index = (outputIndex + 2) % 4; // Opposite
        const input2Index = (outputIndex + 1) % 4; // Adjacent clockwise
        const input3Index = (outputIndex + 3) % 4; // Adjacent counterclockwise
        
        const exitDirIndex = directions.indexOf(exitDirection);
        // Entry direction for next belt is opposite of exit direction from current belt
        const entryDirIndex = (exitDirIndex + 2) % 4;
        const entryDir = directions[entryDirIndex];
        
        // Check if entry direction matches one of the funnel's input directions
        return entryDirIndex === input1Index || entryDirIndex === input2Index || entryDirIndex === input3Index;
      }
      
      // For other belts, check if they can accept from the entry direction
      // Entry direction is opposite of exit direction
      const directions: ('north' | 'south' | 'east' | 'west')[] = ['north', 'east', 'south', 'west'];
      const exitDirIndex = directions.indexOf(exitDirection);
      const entryDirIndex = (exitDirIndex + 2) % 4;
      const entryDir = directions[entryDirIndex];
      
      // For straight belts, entry must be opposite of direction
      if (b.type === 'straight') {
        const oppositeDir: Record<'north' | 'south' | 'east' | 'west', 'north' | 'south' | 'east' | 'west'> = {
          'north': 'south',
          'south': 'north',
          'east': 'west',
          'west': 'east',
        };
        return oppositeDir[b.direction] === entryDir;
      }
      
      // For curve belts, entry direction must match what the curve expects
      if (b.type?.startsWith('curve-')) {
        // Calculate what entry direction this curve belt expects based on its exit direction
        // Entry direction for next belt is opposite of exit direction from current belt
        const directions: ('north' | 'south' | 'east' | 'west')[] = ['north', 'east', 'south', 'west'];
        const exitDirIndex = directions.indexOf(exitDirection);
        const entryDirIndex = (exitDirIndex + 2) % 4; // Entry is opposite of exit
        const entryDir = directions[entryDirIndex];
        
        // Calculate what entry direction this curve belt expects based on its exit direction
        const beltExitIndex = directions.indexOf(b.direction);
        let expectedEntryDir: 'north' | 'south' | 'east' | 'west';
        
        if (b.type === 'curve-sw') {
          // BL: entry is 90° counterclockwise from exit (one step backward)
          // If belt exits north, entry should be from west
          const expectedEntryIndex = (beltExitIndex - 1 + 4) % 4;
          expectedEntryDir = directions[expectedEntryIndex];
        } else if (b.type === 'curve-se') {
          // BR: entry is 90° clockwise from exit (one step forward)
          // If belt exits north, entry should be from east
          const expectedEntryIndex = (beltExitIndex + 1) % 4;
          expectedEntryDir = directions[expectedEntryIndex];
        } else {
          // For other curve types, accept if position matches
          return true;
        }
        
        // Check if the entry direction matches what the curve expects
        return entryDir === expectedEntryDir;
      }
      
      // Default: accept if position matches
      return true;
    }) || null;
    
    return nextBelt;
  }, []);

  // Calculate path from output belt to destiny belt
  const calculatePath = useCallback((startBelt: Belt, belts: Belt[]): string[] => {
    const path: string[] = [startBelt.id];
    const visited = new Set<string>([startBelt.id]);
    let currentBelt = startBelt;
    let entryDirection: 'north' | 'south' | 'east' | 'west' = startBelt.direction;
    const maxPathLength = 100; // Prevent infinite loops
    
    for (let i = 0; i < maxPathLength; i++) {
      // Check if current belt is destiny
      if (currentBelt.isDestiny) {
        return path;
      }
      
      // Calculate exit direction for special belt types
      let exitDirection = entryDirection;
      if (currentBelt.type === 'funnel') {
        exitDirection = currentBelt.direction;
      } else if (currentBelt.type === 'turn' || currentBelt.type?.startsWith('turn-')) {
        // Turn belts: rotate 90 degrees based on type
        // turn-lt: counterclockwise (antihorario)
        // All others: clockwise (horario)
        const directions: ('north' | 'south' | 'east' | 'west')[] = ['north', 'east', 'south', 'west'];
        const currentIndex = directions.indexOf(entryDirection);
        
        if (currentBelt.type === 'turn-lt') {
          // Counterclockwise: go back one direction
          const prevIndex = (currentIndex - 1 + 4) % 4;
          exitDirection = directions[prevIndex];
        } else {
          // Clockwise: go forward one direction
          const nextIndex = (currentIndex + 1) % 4;
          exitDirection = directions[nextIndex];
        }
      } else if (currentBelt.type?.startsWith('curve-')) {
        const curveExit = getCurveExitDirection(currentBelt.type, entryDirection);
        exitDirection = curveExit ?? currentBelt.direction;
      } else {
        exitDirection = currentBelt.direction;
      }
      
      const nextBelt = findNextBelt(currentBelt, belts, entryDirection);
      if (!nextBelt || visited.has(nextBelt.id)) {
        // No path found or loop detected
        return path;
      }
      
      path.push(nextBelt.id);
      visited.add(nextBelt.id);
      // Next belt's entry direction is opposite of this belt's exit direction
      const getOppositeDirection = (dir: Direction): Direction => {
        switch (dir) {
          case 'north': return 'south';
          case 'south': return 'north';
          case 'east': return 'west';
          case 'west': return 'east';
        }
      };
      entryDirection = getOppositeDirection(exitDirection);
      currentBelt = nextBelt;
    }
    
    return path;
  }, [findNextBelt]);

  // Spawn egg from a coop
  const spawnEgg = useCallback((coopId: string, slotPosition: number) => {
    const outputBelt = findOutputBelt(slotPosition, coopId);
    if (!outputBelt) {
      console.warn(`[useEggSystem] No output belt found for coop ${coopId} at position ${slotPosition}. Cannot spawn egg.`);
      return;
    }
    
    const path = calculatePath(outputBelt, belts);
    if (path.length === 0) {
      console.warn(`[useEggSystem] No path found from belt ${outputBelt.id} for coop ${coopId} at position ${slotPosition}`);
      return;
    }
    
    const beltPos = parseGridNotation(outputBelt.gridColumn);
    const beltRow = parseGridNotation(outputBelt.gridRow);
    
    // Check if we've reached max eggs limit
    setEggs(prev => {
      if (prev.length >= MAX_EGGS) {
        // Don't spawn if we're at max capacity
        return prev;
      }
      
      const newEgg: Egg = {
        id: `egg-${Date.now()}-${Math.random()}`,
        currentBeltId: outputBelt.id,
        currentCol: beltPos.start,
        currentRow: beltRow.start,
        progress: 0,
        path,
        pathIndex: 0,
        coopId,
        entryDirection: outputBelt.direction, // Initial entry direction is the belt's direction
      };
      
      // Track creation time for age-based removal
      eggCreationTimeRef.current.set(newEgg.id, Date.now());
      
      return [...prev, newEgg];
    });
  }, [belts, findOutputBelt, calculatePath]);

  // Update egg positions
  const updateEggs = useCallback(() => {
    const now = Date.now();
    setEggs(prevEggs => {
      return prevEggs.map(egg => {
        // Check if egg is too old (stuck or lost)
        const creationTime = eggCreationTimeRef.current.get(egg.id);
        if (creationTime && (now - creationTime) > EGG_MAX_AGE) {
          eggCreationTimeRef.current.delete(egg.id);
          return null; // Remove old eggs
        }
        
        // Find current belt
        const currentBelt = belts.find(b => b.id === egg.currentBeltId);
        if (!currentBelt) {
          // Belt no longer exists, remove egg
          eggCreationTimeRef.current.delete(egg.id);
          return null;
        }
        
        // Update progress
        let newProgress = egg.progress + EGG_SPEED;
        
        // If progress >= 1, move to next belt in path
        if (newProgress >= 1) {
          const nextPathIndex = egg.pathIndex + 1;
          if (nextPathIndex >= egg.path.length) {
          // Reached end of path - check if we're at destiny belt
          if (currentBelt.isDestiny) {
            // Egg has completed its journey on the destiny belt, remove it
            eggCreationTimeRef.current.delete(egg.id);
            return null;
          }
          // No more path and not at destiny - this shouldn't happen, but remove to prevent accumulation
          console.warn(`[useEggSystem] Egg ${egg.id} reached end of path but not at destiny belt`);
          eggCreationTimeRef.current.delete(egg.id);
          return null;
          }
          
          const nextBeltId = egg.path[nextPathIndex];
          const nextBelt = belts.find(b => b.id === nextBeltId);
          if (!nextBelt) {
            // Next belt doesn't exist, remove egg
            console.warn(`[useEggSystem] Egg ${egg.id} next belt ${nextBeltId} not found. Current belt: ${currentBelt.id} (${currentBelt.type}), path:`, egg.path);
            eggCreationTimeRef.current.delete(egg.id);
            return null;
          }
          
          // Check if next belt is destiny - allow egg to enter and complete journey
          if (nextBelt.isDestiny) {
            // Move to destiny belt, let it complete the journey
            const nextPos = parseGridNotation(nextBelt.gridColumn);
            const nextRow = parseGridNotation(nextBelt.gridRow);
            
            // Calculate entry direction for destiny belt
            const currentPos = parseGridNotation(currentBelt.gridColumn);
            const currentRow = parseGridNotation(currentBelt.gridRow);
            
            let exitDirection = currentBelt.direction;
            if (currentBelt.type === 'funnel') {
              exitDirection = currentBelt.direction;
            } else if (currentBelt.type === 'turn' || currentBelt.type?.startsWith('turn-')) {
              const entryDir = egg.entryDirection || currentBelt.direction;
              // Turn belts: rotate 90 degrees based on type
              // turn-lt: counterclockwise (antihorario)
              // All others: clockwise (horario)
              const directions: ('north' | 'south' | 'east' | 'west')[] = ['north', 'east', 'south', 'west'];
              const entryIndex = directions.indexOf(entryDir);
              
              if (currentBelt.type === 'turn-lt') {
                // Counterclockwise: go back one direction
                const prevIndex = (entryIndex - 1 + 4) % 4;
                exitDirection = directions[prevIndex];
              } else {
                // Clockwise: go forward one direction
                const exitIndex = (entryIndex + 1) % 4;
                exitDirection = directions[exitIndex];
              }
            } else if (currentBelt.type?.startsWith('curve-')) {
              const entryDir = egg.entryDirection;
              if (!entryDir) {
                console.warn(`[useEggSystem] Egg ${egg.id} on curve belt ${currentBelt.id} (${currentBelt.type}) has no entryDirection when moving to destiny.`);
                exitDirection = currentBelt.direction;
              } else {
                const curveExit = getCurveExitDirection(currentBelt.type, entryDir);
                if (curveExit) {
                  exitDirection = curveExit;
                } else {
                  exitDirection = currentBelt.direction;
                }
              }
            }
            
            const getOppositeDirection = (dir: 'north' | 'south' | 'east' | 'west'): 'north' | 'south' | 'east' | 'west' => {
              switch (dir) {
                case 'north': return 'south';
                case 'south': return 'north';
                case 'east': return 'west';
                case 'west': return 'east';
              }
            };
            
            const nextEntryDirection = getOppositeDirection(exitDirection);
            
            return {
              ...egg,
              currentBeltId: nextBeltId,
              currentCol: nextPos.start,
              currentRow: nextRow.start,
              progress: 0,
              pathIndex: nextPathIndex,
              entryDirection: nextEntryDirection,
            };
          }
          
          const nextPos = parseGridNotation(nextBelt.gridColumn);
          const nextRow = parseGridNotation(nextBelt.gridRow);
          
          // Calculate entry direction for next belt
          const currentPos = parseGridNotation(currentBelt.gridColumn);
          const currentRow = parseGridNotation(currentBelt.gridRow);
          
          // Calculate exit direction from current belt
          let exitDirection = currentBelt.direction;
          if (currentBelt.type === 'funnel') {
            exitDirection = currentBelt.direction;
          } else if (currentBelt.type === 'turn' || currentBelt.type?.startsWith('turn-')) {
            // Turn belts: rotate 90 degrees based on type
            // turn-lt: counterclockwise (antihorario)
            // All others: clockwise (horario)
            const entryDir = egg.entryDirection;
            if (!entryDir) {
              console.warn(`[useEggSystem] Egg ${egg.id} on turn belt ${currentBelt.id} (${currentBelt.type}) has no entryDirection.`);
              exitDirection = currentBelt.direction;
            } else {
              const directions: ('north' | 'south' | 'east' | 'west')[] = ['north', 'east', 'south', 'west'];
              const entryIndex = directions.indexOf(entryDir);
              
              if (currentBelt.type === 'turn-lt') {
                // Counterclockwise: go back one direction
                const prevIndex = (entryIndex - 1 + 4) % 4;
                exitDirection = directions[prevIndex];
              } else {
                // Clockwise: go forward one direction
                const exitIndex = (entryIndex + 1) % 4;
                exitDirection = directions[exitIndex];
              }
            }
          } else if (currentBelt.type?.startsWith('curve-')) {
            const entryDir = egg.entryDirection;
            if (!entryDir) {
              // If entryDirection is not set, calculate it from the previous belt's exit direction
              // This should not happen in normal flow, but handle it as fallback
              console.warn(`[useEggSystem] Egg ${egg.id} on curve belt ${currentBelt.id} (${currentBelt.type}) has no entryDirection. Using belt direction as fallback.`);
              exitDirection = currentBelt.direction;
            } else {
              const curveExit = getCurveExitDirection(currentBelt.type, entryDir);
              if (curveExit) {
                exitDirection = curveExit;
              } else {
                // Fallback: use belt direction if curve exit calculation fails
                console.warn(`[useEggSystem] Failed to calculate exit direction for curve belt ${currentBelt.id} (${currentBelt.type}) with entry ${entryDir}`);
                exitDirection = currentBelt.direction;
              }
            }
          }
          
          // Entry direction for next belt is opposite of exit direction from current belt
          const getOppositeDirection = (dir: 'north' | 'south' | 'east' | 'west'): 'north' | 'south' | 'east' | 'west' => {
            switch (dir) {
              case 'north': return 'south';
              case 'south': return 'north';
              case 'east': return 'west';
              case 'west': return 'east';
            }
          };
          
          const nextEntryDirection = getOppositeDirection(exitDirection);
          
          // Debug: Log when entering a curve belt and verify IN/OUT points match
          if (nextBelt.type?.startsWith('curve-')) {
            const directions: ('north' | 'south' | 'east' | 'west')[] = ['north', 'east', 'south', 'west'];
            const beltExitIndex = directions.indexOf(nextBelt.direction);
            let expectedEntry: 'north' | 'south' | 'east' | 'west';
            
            if (nextBelt.type === 'curve-sw') {
              // BL: entry is 90° counterclockwise from exit
              const expectedEntryIndex = (beltExitIndex - 1 + 4) % 4;
              expectedEntry = directions[expectedEntryIndex];
            } else if (nextBelt.type === 'curve-se') {
              // BR: entry is 90° clockwise from exit
              const expectedEntryIndex = (beltExitIndex + 1) % 4;
              expectedEntry = directions[expectedEntryIndex];
            } else {
              expectedEntry = nextEntryDirection;
            }
            
            const matches = nextEntryDirection === expectedEntry;
            console.log(`[useEggSystem] Egg ${egg.id} entering curve belt ${nextBelt.id} (${nextBelt.type})`);
            console.log(`  - Entry direction: ${nextEntryDirection}, Expected: ${expectedEntry}, Matches: ${matches}`);
            console.log(`  - Belt exit direction: ${nextBelt.direction}`);
            
            if (!matches) {
              console.warn(`[useEggSystem] WARNING: Entry direction mismatch! Egg will enter from ${nextEntryDirection} but belt expects ${expectedEntry}`);
            }
          }
          
          return {
            ...egg,
            currentBeltId: nextBeltId,
            currentCol: nextPos.start,
            currentRow: nextRow.start,
            progress: 0,
            pathIndex: nextPathIndex,
            entryDirection: nextEntryDirection,
          };
        }
        
        // Check if egg reached destiny (only remove when progress is exactly 1 or more)
        // Don't remove immediately when entering destiny belt, let it complete the journey
        if (currentBelt.isDestiny && newProgress >= 0.99) {
          // Remove egg when it reaches the end of destiny belt
          eggCreationTimeRef.current.delete(egg.id);
          return null;
        }
        
        // Ensure entryDirection is maintained when egg is on a curve belt
        // If egg is on a curve belt and doesn't have entryDirection, calculate it
        if (currentBelt.type?.startsWith('curve-') && !egg.entryDirection) {
          // Calculate entry direction from the previous belt's exit direction
          // This should not happen in normal flow, but handle it as fallback
          console.warn(`[useEggSystem] Egg ${egg.id} on curve belt ${currentBelt.id} (${currentBelt.type}) lost entryDirection. Attempting to recover.`);
          
          // Try to calculate from belt direction
          if (currentBelt.type === 'curve-sw') {
            // BL: entry is 90° counterclockwise from exit
            const directions: ('north' | 'south' | 'east' | 'west')[] = ['north', 'east', 'south', 'west'];
            const exitIndex = directions.indexOf(currentBelt.direction);
            const entryIndex = (exitIndex - 1 + 4) % 4;
            const calculatedEntry = directions[entryIndex];
            return { ...egg, progress: newProgress, entryDirection: calculatedEntry };
          } else if (currentBelt.type === 'curve-se') {
            // BR: entry is 90° clockwise from exit
            const directions: ('north' | 'south' | 'east' | 'west')[] = ['north', 'east', 'south', 'west'];
            const exitIndex = directions.indexOf(currentBelt.direction);
            const entryIndex = (exitIndex + 1) % 4;
            const calculatedEntry = directions[entryIndex];
            return { ...egg, progress: newProgress, entryDirection: calculatedEntry };
          }
        }
        
        return { ...egg, progress: newProgress };
      }).filter((egg): egg is Egg => {
        if (egg === null) return false;
        // Also remove eggs that are no longer tracked (shouldn't happen, but safety check)
        if (!eggCreationTimeRef.current.has(egg.id)) {
          return false;
        }
        return true;
      });
    });
  }, [belts]);

  // Monitor page visibility to pause spawning when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      isPageVisibleRef.current = !document.hidden;
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Spawn eggs from coops periodically with async delays
  useEffect(() => {
    // Don't spawn if no coops
    if (coops.length === 0) return;
    
    // Clean up belt mappings for coops that no longer exist
    const existingCoopIds = new Set(coops.map(c => c.id));
    coopBeltMappingRef.current.forEach((_, coopId) => {
      if (!existingCoopIds.has(coopId)) {
        coopBeltMappingRef.current.delete(coopId);
      }
    });
    
    // Clean up belt mappings for belts that no longer exist
    const existingBeltIds = new Set(belts.map(b => b.id));
    coopBeltMappingRef.current.forEach((beltId, coopId) => {
      if (!existingBeltIds.has(beltId)) {
        coopBeltMappingRef.current.delete(coopId);
      }
    });
    
    // Initialize random initial delays for each coop to stagger spawns
    const coopInitialDelays = new Map<string, number>();
    coops.forEach((coop, index) => {
      // Each coop gets a random initial delay to make spawning async
      coopInitialDelays.set(coop.id, index * 200 + Math.random() * 500);
    });

    // Reset spawn times for coops that no longer exist
    lastSpawnTimeRef.current.forEach((_, coopId) => {
      if (!existingCoopIds.has(coopId)) {
        lastSpawnTimeRef.current.delete(coopId);
      }
    });

    // Set up individual timers for each corral to make spawning truly async
    const timers: Map<string, NodeJS.Timeout> = new Map();
    
    coops.forEach(coop => {
      const slotPosition = coop.position_index;
      if (slotPosition === undefined || slotPosition === null) {
        console.warn(`[useEggSystem] Coop ${coop.id} has no position_index, skipping spawn setup`);
        return;
      }
      
      const initialDelay = coopInitialDelays.get(coop.id) || 0;
      
      const scheduleNextSpawn = () => {
        const lastSpawn = lastSpawnTimeRef.current.get(coop.id);
        // Clear any existing timer for this coop
        const existingTimer = timers.get(coop.id);
        if (existingTimer) {
          clearTimeout(existingTimer);
        }
        
        // Don't spawn if page is not visible
        if (!isPageVisibleRef.current) {
          // Reschedule check when page becomes visible
          const checkTimer = setTimeout(() => {
            scheduleNextSpawn();
          }, 1000);
          timers.set(coop.id, checkTimer);
          return;
        }
        
        const now = Date.now();
        // Get spawn interval based on coop level
        const spawnInterval = getEggSpawnInterval(coop.level || 1);
        let delay: number;
        
        if (lastSpawn === undefined) {
          // First spawn - use initial delay
          delay = Math.max(0, initialDelay);
        } else {
          // Subsequent spawns - calculate time until next spawn based on coop level
          const timeSinceLastSpawn = now - lastSpawn;
          delay = Math.max(0, spawnInterval - timeSinceLastSpawn);
        }
        
        // Add a small random delay (0-500ms) for each individual spawn to make it more async
        const randomDelay = Math.random() * 500;
        const totalDelay = delay + randomDelay;
        
        const timer = setTimeout(() => {
          // Don't spawn if page is not visible
          if (!isPageVisibleRef.current) {
            scheduleNextSpawn();
            return;
          }
          
          spawnEgg(coop.id, slotPosition);
          lastSpawnTimeRef.current.set(coop.id, Date.now());
          
          // Schedule next spawn
          scheduleNextSpawn();
        }, totalDelay);
        
        timers.set(coop.id, timer);
      };
      
      // Start scheduling for this coop
      scheduleNextSpawn();
    });
    
    // Cleanup function
    return () => {
      timers.forEach(timer => clearTimeout(timer));
      timers.clear();
    };
  }, [coops, belts, spawnEgg]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      updateEggs();
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [updateEggs]);

  // Expose debug information
  const getDebugInfo = useCallback(() => {
    const now = Date.now();
    const spawnPoints: Array<{
      coopId: string;
      positionIndex: number;
      level: number;
      spawnInterval: number;
      timeUntilSpawn: number;
      lastSpawn?: number;
      assignedBeltId?: string;
      assignedBeltPosition?: string;
      hasBelt: boolean;
      beltSlotPosition?: number;
      status: 'ready' | 'waiting' | 'no-belt' | 'no-path' | 'no-space';
      hasValidPath?: boolean;
      hasSpace?: boolean;
      currentEggs?: number;
      maxEggs?: number;
    }> = [];

    coops.forEach(coop => {
      const slotPosition = coop.position_index;
      const lastSpawn = lastSpawnTimeRef.current.get(coop.id);
      const spawnInterval = getEggSpawnInterval(coop.level || 1);
      
      // Find assigned belt
      const assignedBeltId = coopBeltMappingRef.current.get(coop.id);
      const assignedBelt = assignedBeltId ? belts.find(b => b.id === assignedBeltId) : null;
      
      // Try to find output belt
      const outputBelt = findOutputBelt(slotPosition, coop.id);
      
      let timeUntilSpawn = 0;
      if (lastSpawn === undefined) {
        timeUntilSpawn = 0; // Will spawn soon
      } else {
        const timeSinceLastSpawn = now - lastSpawn;
        timeUntilSpawn = Math.max(0, spawnInterval - timeSinceLastSpawn);
      }

      const hasBelt = !!(outputBelt || assignedBelt);
      
      // Check if there's a valid path from the output belt
      const beltToCheck = outputBelt || assignedBelt;
      const hasValidPath = beltToCheck ? calculatePath(beltToCheck, belts).length > 0 : false;
      
      // Check if there's space for more eggs
      const hasSpace = eggs.length < MAX_EGGS;
      
      let status: 'ready' | 'waiting' | 'no-belt' | 'no-path' | 'no-space' = 'no-belt';
      if (!hasBelt) {
        status = 'no-belt';
      } else if (!hasValidPath) {
        status = 'no-path';
      } else if (!hasSpace) {
        status = 'no-space';
      } else if (timeUntilSpawn <= 0) {
        status = 'ready';
      } else {
        status = 'waiting';
      }

      spawnPoints.push({
        coopId: coop.id,
        positionIndex: slotPosition,
        level: coop.level || 1,
        spawnInterval,
        timeUntilSpawn,
        lastSpawn,
        assignedBeltId: assignedBelt?.id || outputBelt?.id,
        assignedBeltPosition: assignedBelt ? `${assignedBelt.gridColumn} / ${assignedBelt.gridRow}` : 
                              outputBelt ? `${outputBelt.gridColumn} / ${outputBelt.gridRow}` : undefined,
        hasBelt,
        beltSlotPosition: assignedBelt?.slotPosition ?? outputBelt?.slotPosition,
        status,
        hasValidPath,
        hasSpace,
        currentEggs: eggs.length,
        maxEggs: MAX_EGGS,
      });
    });

    // Sort by time until spawn (ready first, then by time)
    spawnPoints.sort((a, b) => {
      if (a.status === 'ready' && b.status !== 'ready') return -1;
      if (a.status !== 'ready' && b.status === 'ready') return 1;
      if (a.status === 'no-belt' && b.status !== 'no-belt') return 1;
      if (a.status !== 'no-belt' && b.status === 'no-belt') return -1;
      return a.timeUntilSpawn - b.timeUntilSpawn;
    });

    const debugInfo: any = {
      totalEggs: eggs.length,
      maxEggs: MAX_EGGS,
      baseSpawnInterval: BASE_EGG_SPAWN_INTERVAL,
      spawnPoints,
      totalCoops: coops.length,
      coopsWithBelts: spawnPoints.filter(sp => sp.hasBelt).length,
      coopsWithoutBelts: spawnPoints.filter(sp => !sp.hasBelt).length,
      readyToSpawn: spawnPoints.filter(sp => sp.status === 'ready').length,
      pageVisible: isPageVisibleRef.current,
      // Keep old format for backwards compatibility (deprecated - use totalCoops instead)
      totalCorrals: coops.length,
      corrals: coops.length,
      corralsWithBelts: spawnPoints.filter(sp => sp.hasBelt).length,
      corralsWithoutBelts: spawnPoints.filter(sp => !sp.hasBelt).length,
      nextSpawns: spawnPoints.map(sp => ({
        coopId: sp.coopId,
        level: sp.level,
        spawnInterval: sp.spawnInterval,
        timeUntilSpawn: sp.timeUntilSpawn,
        lastSpawn: sp.lastSpawn,
      })),
    };

    return debugInfo;
  }, [eggs, coops, belts, findOutputBelt, calculatePath]);

  return { eggs, getDebugInfo };
};

