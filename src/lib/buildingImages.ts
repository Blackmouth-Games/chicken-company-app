// Import building images
import warehouse1A from "@/assets/buildings/warehouse_1A.png";
import warehouse1B from "@/assets/buildings/warehouse_1B.png";
import market1A from "@/assets/buildings/market_1A.png";
import market1B from "@/assets/buildings/market_1B.png";
import house1A from "@/assets/buildings/house_1A.png";
import coop1A from "@/assets/buildings/coop_1A.png";
import coop1B from "@/assets/buildings/coop_1B.png";

// Building images by type, level, and skin
export const BUILDING_IMAGES = {
  corral: {
    1: { A: coop1A, B: coop1B },
    2: { A: coop1A, B: coop1B },
    3: { A: coop1A, B: coop1B },
    4: { A: coop1A, B: coop1B },
    5: { A: coop1A, B: coop1B },
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

// Mapping from database skin_key to local image skin (A/B)
// If a skin_key is not in this map, it will use the emoji from the database
const SKIN_KEY_TO_LOCAL_MAP: Record<string, BuildingSkin> = {
  // Corral skins
  'corral_default': 'A',
  'corral_premium': 'B',
  'corral_luxury': 'B',
  // Warehouse skins
  'warehouse_default': 'A',
  'warehouse_modern': 'B',
  // Market skins
  'market_default': 'A',
  'market_premium': 'B',
};

/**
 * Maps a database skin_key to a local image skin (A/B)
 * Returns null if the skin_key should use an emoji instead
 */
export const mapSkinKeyToLocal = (skinKey: string | null | undefined): BuildingSkin | null => {
  if (!skinKey) return null;
  return SKIN_KEY_TO_LOCAL_MAP[skinKey] || null;
};

/**
 * Gets building image from local assets or returns null if should use emoji
 * @param type Building type
 * @param level Building level
 * @param skinKey Database skin_key (e.g., 'corral_default') or local skin ('A'/'B')
 * @param skinInfo Optional skin info from database with image_url (emoji)
 * @returns Image URL string or null if should use emoji
 */
export const getBuildingImage = (
  type: BuildingType, 
  level: number, 
  skinKey?: string | null,
  skinInfo?: { image_url: string } | null
): string | null => {
  // If skinKey is 'A' or 'B', use it directly
  if (skinKey === 'A' || skinKey === 'B') {
    const images = BUILDING_IMAGES[type];
    if (!images) return warehouse1A;
    const validLevel = Math.max(1, Math.min(5, level)) as 1 | 2 | 3 | 4 | 5;
    return images[validLevel]?.[skinKey] || images[1]?.A || warehouse1A;
  }
  
  // Try to map skin_key to local image
  const localSkin = mapSkinKeyToLocal(skinKey);
  if (localSkin) {
    const images = BUILDING_IMAGES[type];
    if (!images) return warehouse1A;
    const validLevel = Math.max(1, Math.min(5, level)) as 1 | 2 | 3 | 4 | 5;
    return images[validLevel]?.[localSkin] || images[1]?.A || warehouse1A;
  }
  
  // If no local image mapping, return null to indicate should use emoji
  return null;
};

/**
 * Gets building display (image or emoji) based on skin
 * @param type Building type
 * @param level Building level
 * @param skinKey Database skin_key
 * @param skinInfo Optional skin info from database with image_url (emoji)
 * @returns Object with either image (string) or emoji (string)
 */
export const getBuildingDisplay = (
  type: BuildingType,
  level: number,
  skinKey?: string | null,
  skinInfo?: { image_url: string } | null
): { type: 'image'; src: string } | { type: 'emoji'; emoji: string } => {
  const image = getBuildingImage(type, level, skinKey, skinInfo);
  
  if (image) {
    return { type: 'image', src: image };
  }
  
  // Fallback to emoji from skinInfo or default
  const emoji = skinInfo?.image_url || '🏚️';
  return { type: 'emoji', emoji };
};
