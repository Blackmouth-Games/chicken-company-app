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

export const useEggSystem = (belts: Belt[], buildings: any[]) => {
  const [eggs, setEggs] = useState<Egg[]>([]);
  const animationFrameRef = useRef<number>();
  const lastSpawnTimeRef = useRef<Map<string, number>>(new Map());

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
    
    setEggs(prev => [...prev, newEgg]);
  }, [belts, findOutputBelt, calculatePath]);

  // Update egg positions
  const updateEggs = useCallback(() => {
    setEggs(prevEggs => {
      return prevEggs.map(egg => {
        // Find current belt
        const currentBelt = belts.find(b => b.id === egg.currentBeltId);
        if (!currentBelt) {
          // Belt no longer exists, remove egg
          return null;
        }
        
        // Check if egg reached destiny
        if (currentBelt.isDestiny && egg.progress >= 1) {
          // Remove egg when it reaches destiny
          return null;
        }
        
        // Update progress
        let newProgress = egg.progress + EGG_SPEED;
        
        // If progress >= 1, move to next belt in path
        if (newProgress >= 1) {
          const nextPathIndex = egg.pathIndex + 1;
          if (nextPathIndex >= egg.path.length) {
            // Reached end of path, remove egg if not at destiny
            if (currentBelt.isDestiny) {
              return null;
            }
            // No more path, keep at current position
            return { ...egg, progress: 1 };
          }
          
          const nextBeltId = egg.path[nextPathIndex];
          const nextBelt = belts.find(b => b.id === nextBeltId);
          if (!nextBelt) {
            return null;
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
        
        return { ...egg, progress: newProgress };
      }).filter((egg): egg is Egg => egg !== null);
    });
  }, [belts]);

  // Spawn eggs from corrals periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      corrals.forEach(corral => {
        // Use position_index as slotPosition
        const slotPosition = corral.position_index;
        if (slotPosition === undefined || slotPosition === null) return;
        
        const lastSpawn = lastSpawnTimeRef.current.get(corral.id) || 0;
        if (now - lastSpawn >= EGG_SPAWN_INTERVAL) {
          spawnEgg(corral.id, slotPosition);
          lastSpawnTimeRef.current.set(corral.id, now);
        }
      });
    }, 1000); // Check every second
    
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

