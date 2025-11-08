/**
 * Layout collision detection utilities
 */

export interface GridArea {
  colStart: number;
  colEnd: number;
  rowStart: number;
  rowEnd: number;
}

/**
 * Parse grid notation like "1 / 7" or "1 / span 6"
 */
export const parseGridNotation = (notation: string): { start: number; end: number } => {
  const parts = notation.split('/').map(p => p.trim());
  const start = parseInt(parts[0]);
  
  if (parts[1].includes('span')) {
    const span = parseInt(parts[1].replace('span', '').trim());
    return { start, end: start + span };
  } else {
    return { start, end: parseInt(parts[1]) };
  }
};

/**
 * Create grid notation from start and end
 */
export const createGridNotation = (start: number, end: number): string => {
  return `${start} / ${end}`;
};

/**
 * Parse grid area from gridColumn and gridRow notation
 */
export const parseGridArea = (gridColumn: string, gridRow: string): GridArea => {
  const col = parseGridNotation(gridColumn);
  const row = parseGridNotation(gridRow);
  
  return {
    colStart: col.start,
    colEnd: col.end,
    rowStart: row.start,
    rowEnd: row.end,
  };
};

/**
 * Check if two grid areas overlap/collide
 */
export const checkCollision = (area1: GridArea, area2: GridArea): boolean => {
  // No collision if one area is completely to the left/right/above/below the other
  if (
    area1.colEnd <= area2.colStart ||
    area2.colEnd <= area1.colStart ||
    area1.rowEnd <= area2.rowStart ||
    area2.rowEnd <= area1.rowStart
  ) {
    return false;
  }
  
  return true;
};

/**
 * Check if a grid area is within bounds
 */
export const isWithinBounds = (
  area: GridArea,
  maxColumns: number,
  maxRows: number
): boolean => {
  return (
    area.colStart >= 1 &&
    area.colEnd <= maxColumns + 1 &&
    area.rowStart >= 1 &&
    area.rowEnd <= maxRows + 1 &&
    area.colStart < area.colEnd &&
    area.rowStart < area.rowEnd
  );
};

/**
 * Get all building areas from layout config
 */
export const getAllBuildingAreas = (
  layoutConfig: any,
  excludeBuilding?: string
): { name: string; area: GridArea }[] => {
  const areas: { name: string; area: GridArea }[] = [];
  
  // Add warehouse
  if (excludeBuilding !== 'warehouse' && layoutConfig.warehouse) {
    areas.push({
      name: 'warehouse',
      area: parseGridArea(layoutConfig.warehouse.gridColumn, layoutConfig.warehouse.gridRow),
    });
  }
  
  // Add market
  if (excludeBuilding !== 'market' && layoutConfig.market) {
    areas.push({
      name: 'market',
      area: parseGridArea(layoutConfig.market.gridColumn, layoutConfig.market.gridRow),
    });
  }
  
  // Add belts
  if (layoutConfig.belts) {
    layoutConfig.belts.forEach((belt: any) => {
      if (excludeBuilding !== belt.id) {
        areas.push({
          name: belt.id,
          area: parseGridArea(belt.gridColumn, belt.gridRow),
        });
      }
    });
  }
  
  return areas;
};

/**
 * Check if a new position would cause a collision
 */
export const wouldCollide = (
  newArea: GridArea,
  layoutConfig: any,
  excludeBuilding?: string
): { collides: boolean; collidingWith?: string } => {
  const existingAreas = getAllBuildingAreas(layoutConfig, excludeBuilding);
  
  for (const { name, area } of existingAreas) {
    if (checkCollision(newArea, area)) {
      return { collides: true, collidingWith: name };
    }
  }
  
  return { collides: false };
};
