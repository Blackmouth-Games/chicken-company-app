import { useState, useEffect, useCallback, useRef } from "react";
import { parseGridNotation } from "@/lib/layoutCollisions";

interface Egg {
  id: string;
  currentBeltId: string;
  currentCol: number;
  currentRow: number;
  progress: number; // 0 to 1, progress along current belt
  path: string[]; // Array of belt IDs representing the path
  pathIndex: number; // Current index in the path
  corralId: string; // ID of the corral that emitted this egg
}

interface Belt {
  id: string;
  gridColumn: string;
  gridRow: string;
  direction: 'north' | 'south' | 'east' | 'west';
  isOutput?: boolean;
  isDestiny?: boolean;
  slotPosition?: number; // Position index of the slot this output belongs to
  corralId?: string; // Deprecated: use slotPosition instead
}

const EGG_SPEED = 0.02; // Progress increment per frame (adjust for speed)
const EGG_SPAWN_INTERVAL = 3000; // Spawn egg every 3 seconds per corral
const MAX_EGGS = 50; // Maximum number of eggs in the system
const EGG_MAX_AGE = 60000; // Maximum age for an egg (60 seconds) before removal

export const useEggSystem = (belts: Belt[], buildings: any[]) => {
  const [eggs, setEggs] = useState<Egg[]>([]);
  const animationFrameRef = useRef<number>();
  const lastSpawnTimeRef = useRef<Map<string, number>>(new Map());
  const eggCreationTimeRef = useRef<Map<string, number>>(new Map());
  const isPageVisibleRef = useRef(true);

  // Get corrals from buildings - handle undefined/null
  const corrals = (buildings || []).filter(b => b && b.building_type === 'corral');

  // Find output belt for a corral by slot position
  const findOutputBelt = useCallback((slotPosition: number): Belt | null => {
    return belts.find(b => b.isOutput && b.slotPosition === slotPosition) || null;
  }, [belts]);

  // Find next belt in the path based on direction
  const findNextBelt = useCallback((currentBelt: Belt, belts: Belt[]): Belt | null => {
    const currentPos = parseGridNotation(currentBelt.gridColumn);
    const currentRow = parseGridNotation(currentBelt.gridRow);
    
    let nextCol: number;
    let nextRow: number;
    
    // Calculate next position based on direction
    switch (currentBelt.direction) {
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
    return belts.find(b => {
      const bCol = parseGridNotation(b.gridColumn);
      const bRow = parseGridNotation(b.gridRow);
      return bCol.start === nextCol && bRow.start === nextRow;
    }) || null;
  }, []);

  // Calculate path from output belt to destiny belt
  const calculatePath = useCallback((startBelt: Belt, belts: Belt[]): string[] => {
    const path: string[] = [startBelt.id];
    const visited = new Set<string>([startBelt.id]);
    let currentBelt = startBelt;
    const maxPathLength = 100; // Prevent infinite loops
    
    for (let i = 0; i < maxPathLength; i++) {
      // Check if current belt is destiny
      if (currentBelt.isDestiny) {
        return path;
      }
      
      const nextBelt = findNextBelt(currentBelt, belts);
      if (!nextBelt || visited.has(nextBelt.id)) {
        // No path found or loop detected
        return path;
      }
      
      path.push(nextBelt.id);
      visited.add(nextBelt.id);
      currentBelt = nextBelt;
    }
    
    return path;
  }, [findNextBelt]);

  // Spawn egg from a corral
  const spawnEgg = useCallback((corralId: string, slotPosition: number) => {
    const outputBelt = findOutputBelt(slotPosition);
    if (!outputBelt) return;
    
    const path = calculatePath(outputBelt, belts);
    if (path.length === 0) return;
    
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
        corralId,
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
            // Remove egg when it reaches destiny
            eggCreationTimeRef.current.delete(egg.id);
            return null;
          }
          // No more path and not at destiny, remove egg to prevent accumulation
          eggCreationTimeRef.current.delete(egg.id);
          return null;
          }
          
          const nextBeltId = egg.path[nextPathIndex];
          const nextBelt = belts.find(b => b.id === nextBeltId);
          if (!nextBelt) {
            // Next belt doesn't exist, remove egg
            eggCreationTimeRef.current.delete(egg.id);
            return null;
          }
          
          // Check if next belt is destiny - if so, we'll remove it when progress reaches 1
          if (nextBelt.isDestiny) {
            // Move to destiny belt
            const nextPos = parseGridNotation(nextBelt.gridColumn);
            const nextRow = parseGridNotation(nextBelt.gridRow);
            
            return {
              ...egg,
              currentBeltId: nextBeltId,
              currentCol: nextPos.start,
              currentRow: nextRow.start,
              progress: 0,
              pathIndex: nextPathIndex,
            };
          }
          
          const nextPos = parseGridNotation(nextBelt.gridColumn);
          const nextRow = parseGridNotation(nextBelt.gridRow);
          
          return {
            ...egg,
            currentBeltId: nextBeltId,
            currentCol: nextPos.start,
            currentRow: nextRow.start,
            progress: 0,
            pathIndex: nextPathIndex,
          };
        }
        
        // Check if egg reached destiny (after progress update)
        if (currentBelt.isDestiny && newProgress >= 1) {
          // Remove egg when it reaches destiny
          eggCreationTimeRef.current.delete(egg.id);
          return null;
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

  // Spawn eggs from corrals periodically with async delays
  useEffect(() => {
    // Don't spawn if no corrals
    if (corrals.length === 0) return;
    
    // Initialize random initial delays for each corral to stagger spawns
    const corralInitialDelays = new Map<string, number>();
    corrals.forEach((corral, index) => {
      // Each corral gets a random initial delay to make spawning async
      corralInitialDelays.set(corral.id, index * 200 + Math.random() * 500);
    });

    // Reset spawn times for corrals that no longer exist
    const existingCorralIds = new Set(corrals.map(c => c.id));
    lastSpawnTimeRef.current.forEach((_, corralId) => {
      if (!existingCorralIds.has(corralId)) {
        lastSpawnTimeRef.current.delete(corralId);
      }
    });

    const interval = setInterval(() => {
      // Don't spawn eggs if page is not visible
      if (!isPageVisibleRef.current) return;
      
      const now = Date.now();
      corrals.forEach(corral => {
        // Use position_index as slotPosition
        const slotPosition = corral.position_index;
        if (slotPosition === undefined || slotPosition === null) return;
        
        const lastSpawn = lastSpawnTimeRef.current.get(corral.id);
        const initialDelay = corralInitialDelays.get(corral.id) || 0;
        
        // For first spawn, wait for initial delay. For subsequent spawns, use normal interval
        if (lastSpawn === undefined) {
          // First spawn - wait for initial delay
          if (now >= initialDelay) {
            // Add a small random delay (0-200ms) for each individual spawn to make it more async
            const randomDelay = Math.random() * 200;
            setTimeout(() => {
              spawnEgg(corral.id, slotPosition);
            }, randomDelay);
            
            lastSpawnTimeRef.current.set(corral.id, now);
          }
        } else {
          // Subsequent spawns - use normal interval
          const timeSinceLastSpawn = now - lastSpawn;
          if (timeSinceLastSpawn >= EGG_SPAWN_INTERVAL) {
            // Add a small random delay (0-200ms) for each individual spawn to make it more async
            const randomDelay = Math.random() * 200;
            setTimeout(() => {
              spawnEgg(corral.id, slotPosition);
            }, randomDelay);
            
            lastSpawnTimeRef.current.set(corral.id, now);
          }
        }
      });
    }, 500); // Check every 500ms (less frequent to reduce overhead)
    
    return () => clearInterval(interval);
  }, [corrals, spawnEgg]);

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

  return { eggs };
};

