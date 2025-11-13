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
const BASE_EGG_SPAWN_INTERVAL = 5000; // Base spawn interval (5 seconds) for level 1
const MAX_EGGS = 50; // Maximum number of eggs in the system
const EGG_MAX_AGE = 60000; // Maximum age for an egg (60 seconds) before removal

// Calculate spawn interval based on corral level (higher level = faster spawn)
const getEggSpawnInterval = (level: number): number => {
  // Level 1: 5s, Level 2: 4s, Level 3: 3s, Level 4: 2s, Level 5: 1.5s
  return Math.max(1500, BASE_EGG_SPAWN_INTERVAL - (level - 1) * 1000);
};

export const useEggSystem = (belts: Belt[], buildings: any[]) => {
  const [eggs, setEggs] = useState<Egg[]>([]);
  const animationFrameRef = useRef<number>();
  const lastSpawnTimeRef = useRef<Map<string, number>>(new Map());
  const eggCreationTimeRef = useRef<Map<string, number>>(new Map());
  const isPageVisibleRef = useRef(true);
  const corralBeltMappingRef = useRef<Map<string, string>>(new Map()); // Maps corralId to beltId

  // Get corrals from buildings - handle undefined/null
  const corrals = (buildings || []).filter(b => b && b.building_type === 'corral');

  // Find output belt for a corral by slot position
  // First tries exact match, then finds an available output belt for this corral
  const findOutputBelt = useCallback((slotPosition: number, corralId: string): Belt | null => {
    // First, try exact slotPosition match
    const exactMatch = belts.find(b => b.isOutput && b.slotPosition === slotPosition);
    if (exactMatch) {
      corralBeltMappingRef.current.set(corralId, exactMatch.id);
      return exactMatch;
    }
    
    // Check if this corral already has a belt assigned
    const assignedBeltId = corralBeltMappingRef.current.get(corralId);
    if (assignedBeltId) {
      const assignedBelt = belts.find(b => b.id === assignedBeltId && b.isOutput);
      if (assignedBelt) return assignedBelt;
    }
    
    // Find all available output belts (not assigned to other corrals or without slotPosition)
    const allOutputBelts = belts.filter(b => 
      b.isOutput && 
      !b.isDestiny &&
      !b.isTransport
    );
    
    // Get belts already assigned to other corrals
    const assignedBeltIds = new Set(Array.from(corralBeltMappingRef.current.values()));
    
    // Find an unassigned output belt, prioritizing those without slotPosition
    const unassignedBelt = allOutputBelts.find(b => 
      !assignedBeltIds.has(b.id) && 
      (b.slotPosition === undefined || b.slotPosition === null)
    ) || allOutputBelts.find(b => !assignedBeltIds.has(b.id));
    
    if (unassignedBelt) {
      corralBeltMappingRef.current.set(corralId, unassignedBelt.id);
      return unassignedBelt;
    }
    
    // Last resort: if all belts are assigned, allow sharing (round-robin style)
    // Use the belt that matches the slotPosition modulo number of available belts
    if (allOutputBelts.length > 0) {
      const index = slotPosition % allOutputBelts.length;
      const sharedBelt = allOutputBelts[index];
      corralBeltMappingRef.current.set(corralId, sharedBelt.id);
      return sharedBelt;
    }
    
    return null;
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
    const outputBelt = findOutputBelt(slotPosition, corralId);
    if (!outputBelt) {
      console.warn(`[useEggSystem] No output belt found for corral ${corralId} at position ${slotPosition}`);
      return;
    }
    
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
            eggCreationTimeRef.current.delete(egg.id);
            return null;
          }
          
          // Check if next belt is destiny - allow egg to enter and complete journey
          if (nextBelt.isDestiny) {
            // Move to destiny belt, let it complete the journey
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
        
        // Check if egg reached destiny (only remove when progress is exactly 1 or more)
        // Don't remove immediately when entering destiny belt, let it complete the journey
        if (currentBelt.isDestiny && newProgress >= 0.99) {
          // Remove egg when it reaches the end of destiny belt
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
    
    // Clean up belt mappings for corrals that no longer exist
    const existingCorralIds = new Set(corrals.map(c => c.id));
    corralBeltMappingRef.current.forEach((_, corralId) => {
      if (!existingCorralIds.has(corralId)) {
        corralBeltMappingRef.current.delete(corralId);
      }
    });
    
    // Clean up belt mappings for belts that no longer exist
    const existingBeltIds = new Set(belts.map(b => b.id));
    corralBeltMappingRef.current.forEach((beltId, corralId) => {
      if (!existingBeltIds.has(beltId)) {
        corralBeltMappingRef.current.delete(corralId);
      }
    });
    
    // Initialize random initial delays for each corral to stagger spawns
    const corralInitialDelays = new Map<string, number>();
    corrals.forEach((corral, index) => {
      // Each corral gets a random initial delay to make spawning async
      corralInitialDelays.set(corral.id, index * 200 + Math.random() * 500);
    });

    // Reset spawn times for corrals that no longer exist
    lastSpawnTimeRef.current.forEach((_, corralId) => {
      if (!existingCorralIds.has(corralId)) {
        lastSpawnTimeRef.current.delete(corralId);
      }
    });

    // Set up individual timers for each corral to make spawning truly async
    const timers: Map<string, NodeJS.Timeout> = new Map();
    
    corrals.forEach(corral => {
      const slotPosition = corral.position_index;
      if (slotPosition === undefined || slotPosition === null) return;
      
      const initialDelay = corralInitialDelays.get(corral.id) || 0;
      
      const scheduleNextSpawn = () => {
        const lastSpawn = lastSpawnTimeRef.current.get(corral.id);
        // Clear any existing timer for this corral
        const existingTimer = timers.get(corral.id);
        if (existingTimer) {
          clearTimeout(existingTimer);
        }
        
        // Don't spawn if page is not visible
        if (!isPageVisibleRef.current) {
          // Reschedule check when page becomes visible
          const checkTimer = setTimeout(() => {
            scheduleNextSpawn();
          }, 1000);
          timers.set(corral.id, checkTimer);
          return;
        }
        
        const now = Date.now();
        // Get spawn interval based on corral level
        const spawnInterval = getEggSpawnInterval(corral.level || 1);
        let delay: number;
        
        if (lastSpawn === undefined) {
          // First spawn - use initial delay
          delay = Math.max(0, initialDelay);
        } else {
          // Subsequent spawns - calculate time until next spawn based on corral level
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
          
          spawnEgg(corral.id, slotPosition);
          lastSpawnTimeRef.current.set(corral.id, Date.now());
          
          // Schedule next spawn
          scheduleNextSpawn();
        }, totalDelay);
        
        timers.set(corral.id, timer);
      };
      
      // Start scheduling for this corral
      scheduleNextSpawn();
    });
    
    // Cleanup function
    return () => {
      timers.forEach(timer => clearTimeout(timer));
      timers.clear();
    };
  }, [corrals, belts, spawnEgg]);

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
    const debugInfo: any = {
      totalEggs: eggs.length,
      maxEggs: MAX_EGGS,
      baseSpawnInterval: BASE_EGG_SPAWN_INTERVAL,
      nextSpawns: [] as Array<{ corralId: string; level: number; spawnInterval: number; timeUntilSpawn: number; lastSpawn?: number }>,
      corrals: corrals.length,
      pageVisible: isPageVisibleRef.current,
    };

    corrals.forEach(corral => {
      const lastSpawn = lastSpawnTimeRef.current.get(corral.id);
      const spawnInterval = getEggSpawnInterval(corral.level || 1);
      if (lastSpawn === undefined) {
        debugInfo.nextSpawns.push({
          corralId: corral.id,
          level: corral.level || 1,
          spawnInterval,
          timeUntilSpawn: 0, // Will spawn soon
          lastSpawn: undefined,
        });
      } else {
        const timeSinceLastSpawn = now - lastSpawn;
        const timeUntilSpawn = Math.max(0, spawnInterval - timeSinceLastSpawn);
        debugInfo.nextSpawns.push({
          corralId: corral.id,
          level: corral.level || 1,
          spawnInterval,
          timeUntilSpawn,
          lastSpawn,
        });
      }
    });

    return debugInfo;
  }, [eggs, corrals]);

  return { eggs, getDebugInfo };
};

