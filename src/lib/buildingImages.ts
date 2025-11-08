// Import building images
import warehouse1A from "@/assets/buildings/warehouse_1A.png";
import warehouse1B from "@/assets/buildings/warehouse_1B.png";
import market1A from "@/assets/buildings/market_1A.png";
import market1B from "@/assets/buildings/market_1B.png";
import house1A from "@/assets/buildings/house_1A.png";

// Building images by type, level, and skin
export const BUILDING_IMAGES = {
  corral: {
    1: { A: house1A, B: house1A },
    2: { A: house1A, B: house1A },
    3: { A: house1A, B: house1A },
    4: { A: house1A, B: house1A },
    5: { A: house1A, B: house1A },
  },
  warehouse: {
    1: { A: warehouse1A, B: warehouse1B },
    2: { A: warehouse1A, B: warehouse1B },
    3: { A: warehouse1A, B: warehouse1B },
    4: { A: warehouse1A, B: warehouse1B },
    5: { A: warehouse1A, B: warehouse1B },
  },
  market: {
    1: { A: market1A, B: market1B },
    2: { A: market1A, B: market1B },
    3: { A: market1A, B: market1B },
    4: { A: market1A, B: market1B },
    5: { A: market1A, B: market1B },
  },
  house: {
    1: { A: house1A, B: house1A },
    2: { A: house1A, B: house1A },
    3: { A: house1A, B: house1A },
    4: { A: house1A, B: house1A },
    5: { A: house1A, B: house1A },
  },
} as const;

export type BuildingType = keyof typeof BUILDING_IMAGES;
export type BuildingSkin = 'A' | 'B';

export const getBuildingImage = (
  type: BuildingType, 
  level: number, 
  skin: BuildingSkin = 'A'
): string => {
  const images = BUILDING_IMAGES[type];
  if (!images) return warehouse1A;
  
  // Ensure level is within bounds
  const validLevel = Math.max(1, Math.min(5, level)) as 1 | 2 | 3 | 4 | 5;
  return images[validLevel]?.[skin] || images[1]?.A || warehouse1A;
};
