/**
 * Check for duplicate belts in a layout configuration
 * Returns an array of duplicate belt IDs
 */
export const checkDuplicateBelts = (belts: Array<{ id: string; gridColumn: string; gridRow: string }>): string[] => {
  const duplicates: string[] = [];
  const positionMap = new Map<string, string[]>(); // Map position to belt IDs
  
  belts.forEach(belt => {
    const position = `${belt.gridColumn}-${belt.gridRow}`;
    if (!positionMap.has(position)) {
      positionMap.set(position, []);
    }
    positionMap.get(position)!.push(belt.id);
  });
  
  // Find positions with multiple belts
  positionMap.forEach((beltIds, position) => {
    if (beltIds.length > 1) {
      duplicates.push(...beltIds);
    }
  });
  
  return duplicates;
};

