// Import building images - House
import house1A from "@/assets/buildings/house_1A.png";
import house1B from "@/assets/buildings/house_1B.png";
import house1C from "@/assets/buildings/house_1C.png";

// Import building images - Coop (Corral)
import coop1A from "@/assets/buildings/coop_1A.png";
import coop1B from "@/assets/buildings/coop_1B.png";
import coop2A from "@/assets/buildings/coop_2A.png";
import coop2B from "@/assets/buildings/coop_2B.png";
import coop3A from "@/assets/buildings/coop_3A.png";
import coop3B from "@/assets/buildings/coop_3B.png";
import coop4A from "@/assets/buildings/coop_4A.png";
import coop4B from "@/assets/buildings/coop_4B.png";
import coop5A from "@/assets/buildings/coop_5A.png";
import coop5B from "@/assets/buildings/coop_5B.png";

// Import building images - Warehouse
import warehouse1A from "@/assets/buildings/warehouse_1A.png";
import warehouse1B from "@/assets/buildings/warehouse_1B.png";
import warehouse2A from "@/assets/buildings/warehouse_2A.png";
import warehouse3A from "@/assets/buildings/warehouse_3A.png";
import warehouse4A from "@/assets/buildings/warehouse_4A.png";
import warehouse5A from "@/assets/buildings/warehouse_5A.png";

// Import building images - Market
import market1A from "@/assets/buildings/market_1A.png";
import market1B from "@/assets/buildings/market_1B.png";
import market2A from "@/assets/buildings/market_2A.png";
import market2B from "@/assets/buildings/market_2B.png";
import market3A from "@/assets/buildings/market_3A.png";
import market3B from "@/assets/buildings/market_3B.png";
import market4A from "@/assets/buildings/market_4A.png";
import market4B from "@/assets/buildings/market_4B.png";
import market5A from "@/assets/buildings/market_5A .png"; // Note: file has space in name
import market5B from "@/assets/buildings/market_5B.png";

// Building images by type, level, and skin
export const BUILDING_IMAGES = {
  corral: {
    1: { A: coop1A, B: coop1B },
    2: { A: coop2A, B: coop2B },
    3: { A: coop3A, B: coop3B },
    4: { A: coop4A, B: coop4B },
    5: { A: coop5A, B: coop5B },
  },
  warehouse: {
    1: { A: warehouse1A, B: warehouse1B },
    2: { A: warehouse2A, B: warehouse1B }, // Level 2+ only has A variant, fallback to 1B
    3: { A: warehouse3A, B: warehouse1B },
    4: { A: warehouse4A, B: warehouse1B },
    5: { A: warehouse5A, B: warehouse1B },
  },
  market: {
    1: { A: market1A, B: market1B },
    2: { A: market2A, B: market2B },
    3: { A: market3A, B: market3B },
    4: { A: market4A, B: market4B },
    5: { A: market5A, B: market5B },
  },
  house: {
    1: { A: house1A, B: house1B, C: house1C }, // House has C variant for level 1
    2: { A: house1A, B: house1B }, // Levels 2-5 use level 1 images
    3: { A: house1A, B: house1B },
    4: { A: house1A, B: house1B },
    5: { A: house1A, B: house1B },
  },
} as const;

export type BuildingType = keyof typeof BUILDING_IMAGES;
export type BuildingSkin = 'A' | 'B' | 'C';

// Mapping from database skin_key to local image skin (A/B/C)
// Format: {building_type}_{level}{variant} -> variant
// If a skin_key is not in this map, it will use the emoji from the database
const SKIN_KEY_TO_LOCAL_MAP: Record<string, BuildingSkin> = {
  // Corral skins - Levels 1-5, Variants A and B
  'corral_1A': 'A', 'corral_1B': 'B',
  'corral_2A': 'A', 'corral_2B': 'B',
  'corral_3A': 'A', 'corral_3B': 'B',
  'corral_4A': 'A', 'corral_4B': 'B',
  'corral_5A': 'A', 'corral_5B': 'B',
  // Legacy corral skins (for backwards compatibility)
  'corral_default': 'A',
  'corral_premium': 'B',
  'corral_luxury': 'B',
  
  // Warehouse skins - Levels 1-5
  'warehouse_1A': 'A', 'warehouse_1B': 'B',
  'warehouse_2A': 'A',
  'warehouse_3A': 'A',
  'warehouse_4A': 'A',
  'warehouse_5A': 'A',
  // Legacy warehouse skins
  'warehouse_default': 'A',
  'warehouse_modern': 'B',
  
  // Market skins - Levels 1-5, Variants A and B
  'market_1A': 'A', 'market_1B': 'B',
  'market_2A': 'A', 'market_2B': 'B',
  'market_3A': 'A', 'market_3B': 'B',
  'market_4A': 'A', 'market_4B': 'B',
  'market_5A': 'A', 'market_5B': 'B',
  // Legacy market skins
  'market_default': 'A',
  'market_premium': 'B',
  
  // House skins - Level 1, Variants A, B, and C
  'house_1A': 'A', 'house_1B': 'B', 'house_1C': 'C',
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
  // If skinKey is 'A', 'B', or 'C', use it directly
  if (skinKey === 'A' || skinKey === 'B' || skinKey === 'C') {
    const images = BUILDING_IMAGES[type];
    if (!images) return warehouse1A;
    const validLevel = Math.max(1, Math.min(5, level)) as 1 | 2 | 3 | 4 | 5;
    const levelImages = images[validLevel];
    
    // For C variant, fallback to B if not available, then to A
    if (skinKey === 'C') {
      const cImage = levelImages && 'C' in levelImages ? levelImages.C : null;
      if (cImage) return cImage;
      return levelImages?.B || levelImages?.A || images[1]?.A || warehouse1A;
    }
    return levelImages?.[skinKey] || images[1]?.A || warehouse1A;
  }
  
  // Try to map skin_key to local image
  const localSkin = mapSkinKeyToLocal(skinKey);
  if (localSkin) {
    const images = BUILDING_IMAGES[type];
    if (!images) return warehouse1A;
    
    // Extract level from skin_key if format is {type}_{level}{variant}
    // e.g., 'corral_2A' -> level 2, 'warehouse_5A' -> level 5
    let imageLevel = level;
    if (skinKey) {
      const levelMatch = skinKey.match(/_(\d+)[ABC]/);
      if (levelMatch) {
        const extractedLevel = parseInt(levelMatch[1], 10);
        if (extractedLevel >= 1 && extractedLevel <= 5) {
          imageLevel = extractedLevel;
        }
      }
    }
    
    const validLevel = Math.max(1, Math.min(5, imageLevel)) as 1 | 2 | 3 | 4 | 5;
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
