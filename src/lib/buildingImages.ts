/**
 * Building images system - now uses dynamic scanning
 * Images are automatically detected from assets/buildings/
 * Just add new image files following the pattern: {type}_{level}{variant}.png
 */

import { 
  BUILDING_IMAGES_DYNAMIC, 
  SKIN_KEY_TO_LOCAL_MAP_DYNAMIC,
  getBuildingStructure 
} from "./buildingImagesDynamic";

// Use dynamic images as primary source
// Fallback structure for buildings without images (maintains compatibility)
const FALLBACK_IMAGES: Record<string, Record<number, Record<string, string>>> = {};

// Merge dynamic images with fallback logic
function mergeImages(): Record<string, Record<number, Record<string, string>>> {
  const merged = { ...BUILDING_IMAGES_DYNAMIC };
  
  // For each building type, ensure we have fallbacks for missing levels
  for (const [buildingType, levels] of Object.entries(BUILDING_IMAGES_DYNAMIC)) {
    const structure = getBuildingStructure(buildingType);
    const maxLevel = structure.maxLevel;
    
    // Ensure all levels up to maxLevel exist
    for (let level = 1; level <= maxLevel; level++) {
      if (!merged[buildingType][level]) {
        merged[buildingType][level] = {};
      }
      
      // For warehouse, levels 2+ fallback to level 1B if no B variant
      if (buildingType === 'warehouse' && level > 1) {
        if (!merged[buildingType][level]['B'] && merged[buildingType][1]?.['B']) {
          merged[buildingType][level]['B'] = merged[buildingType][1]['B'];
        }
      }
      
      // For house, levels 2+ fallback to level 1 images
      if (buildingType === 'house' && level > 1) {
        if (!merged[buildingType][level]['A'] && merged[buildingType][1]?.['A']) {
          merged[buildingType][level]['A'] = merged[buildingType][1]['A'];
        }
        if (!merged[buildingType][level]['B'] && merged[buildingType][1]?.['B']) {
          merged[buildingType][level]['B'] = merged[buildingType][1]['B'];
        }
      }
    }
  }
  
  return merged;
}

export const BUILDING_IMAGES = mergeImages();

export type BuildingType = keyof typeof BUILDING_IMAGES;
export type BuildingSkin = 'A' | 'B' | 'C';

// Legacy skin keys for backwards compatibility
const LEGACY_SKIN_MAP: Record<string, BuildingSkin> = {
  'corral_default': 'A',
  'corral_premium': 'B',
  'corral_luxury': 'B',
  'warehouse_default': 'A',
  'warehouse_modern': 'B',
  'market_default': 'A',
  'market_premium': 'B',
};

/**
 * Maps a database skin_key to a local image skin (A/B/C)
 * Returns null if the skin_key should use an emoji instead
 * Now uses dynamic mapping from scanned images
 */
export const mapSkinKeyToLocal = (skinKey: string | null | undefined): BuildingSkin | null => {
  if (!skinKey) return null;
  
  // Check legacy mappings first
  if (LEGACY_SKIN_MAP[skinKey]) {
    return LEGACY_SKIN_MAP[skinKey];
  }
  
  // Use dynamic mapping from scanned images
  return SKIN_KEY_TO_LOCAL_MAP_DYNAMIC[skinKey] || null;
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
    if (!images) return null;
    
    // Get structure to know max level
    const structure = getBuildingStructure(type);
    const validLevel = Math.max(1, Math.min(structure.maxLevel, level));
    const levelImages = images[validLevel];
    
    if (!levelImages) return null;
    
    // For C variant, fallback to B if not available, then to A
    if (skinKey === 'C') {
      const cImage = levelImages['C'];
      if (cImage) return cImage;
      return levelImages['B'] || levelImages['A'] || images[1]?.A || null;
    }
    return levelImages[skinKey] || images[1]?.A || null;
  }
  
  // If no skinKey is provided, use default 'A' variant for the level
  if (!skinKey) {
    const images = BUILDING_IMAGES[type];
    if (!images) {
      console.warn(`[getBuildingImage] No images found for building type: ${type}`);
      return null;
    }
    const structure = getBuildingStructure(type);
    const validLevel = Math.max(1, Math.min(structure.maxLevel, level));
    const defaultImage = images[validLevel]?.A || images[1]?.A || null;
    if (!defaultImage) {
      console.warn(`[getBuildingImage] No default image found for ${type} level ${validLevel}, available levels:`, Object.keys(images));
    }
    return defaultImage;
  }
  
  // Try to map skin_key to local image
  const localSkin = mapSkinKeyToLocal(skinKey);
  if (localSkin) {
    const images = BUILDING_IMAGES[type];
    if (!images) return null;
    
    // Extract level from skin_key if format is {type}_{level}{variant}
    // e.g., 'corral_2A' -> level 2, 'warehouse_5A' -> level 5
    let imageLevel = level;
    if (skinKey) {
      const levelMatch = skinKey.match(/_(\d+)[ABC]/);
      if (levelMatch) {
        const extractedLevel = parseInt(levelMatch[1], 10);
        const structure = getBuildingStructure(type);
        if (extractedLevel >= 1 && extractedLevel <= structure.maxLevel) {
          imageLevel = extractedLevel;
        }
      }
    }
    
    const structure = getBuildingStructure(type);
    const validLevel = Math.max(1, Math.min(structure.maxLevel, imageLevel));
    return images[validLevel]?.[localSkin] || images[1]?.A || null;
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
  
  // If skinInfo has an image_url, check if it's a valid URL or emoji
  if (skinInfo?.image_url) {
    // Ignore paths that start with /src/ as they don't work in the browser
    // These are development paths that should be handled by getBuildingImage
    if (skinInfo.image_url.startsWith('/src/')) {
      // Fallback to default emoji since the path won't work
      return { type: 'emoji', emoji: '🏚️' };
    }
    
    // Check if it looks like a valid URL (http/https) or absolute path
    const isUrl = skinInfo.image_url.startsWith('http://') || 
                  skinInfo.image_url.startsWith('https://') ||
                  skinInfo.image_url.startsWith('/');
    
    // Check if it ends with image extensions
    const isImageFile = /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(skinInfo.image_url);
    
    if (isUrl && isImageFile && !skinInfo.image_url.startsWith('/src/')) {
      // Try to use it as an image URL
      return { type: 'image', src: skinInfo.image_url };
    }
    
    // Otherwise treat it as an emoji (single character or emoji)
    // Emojis are typically 1-2 characters or contain emoji unicode ranges
    const isEmoji = skinInfo.image_url.length <= 2 || 
                    /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(skinInfo.image_url);
    
    if (isEmoji) {
      return { type: 'emoji', emoji: skinInfo.image_url };
    }
    
    // If it doesn't look like an emoji or valid URL, use default
    return { type: 'emoji', emoji: '🏚️' };
  }
  
  // Fallback to default emoji
  return { type: 'emoji', emoji: '🏚️' };
};
