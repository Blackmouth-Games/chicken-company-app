// Building images by type and level
export const BUILDING_IMAGES = {
  corral: {
    1: "🐔", // Will be replaced with actual images
    2: "🐔",
    3: "🐔",
    4: "🐔",
    5: "🐔",
  },
  warehouse: {
    1: "🏭",
    2: "🏢",
    3: "🏢",
    4: "🏢",
    5: "🏢",
  },
  market: {
    1: "🏪",
    2: "🏬",
    3: "🏬",
    4: "🏬",
    5: "🏬",
  },
  house: {
    1: "🏠",
    2: "🏡",
    3: "🏡",
    4: "🏡",
    5: "🏡",
  },
} as const;

export type BuildingType = keyof typeof BUILDING_IMAGES;

export const getBuildingImage = (type: BuildingType, level: number): string => {
  const images = BUILDING_IMAGES[type];
  if (!images) return "🏢";
  
  // Ensure level is within bounds
  const validLevel = Math.max(1, Math.min(5, level)) as 1 | 2 | 3 | 4 | 5;
  return images[validLevel] || images[1];
};
