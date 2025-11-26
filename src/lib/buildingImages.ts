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
  'coop_default': 'A',
  'coop_premium': 'B',
  'coop_luxury': 'B',
  'corral_default': 'A', // Legacy support
  'corral_premium': 'B', // Legacy support
  'corral_luxury': 'B', // Legacy support
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
 * @param skinKey Database skin_key (e.g., 'coop_default') or local skin ('A'/'B')
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
      console.warn(`[getBuildingImage] Available types in BUILDING_IMAGES:`, Object.keys(BUILDING_IMAGES));
      return null;
    }
    const structure = getBuildingStructure(type);
    const validLevel = Math.max(1, Math.min(structure.maxLevel, level));
    const defaultImage = images[validLevel]?.A || images[1]?.A || null;
    if (!defaultImage) {
      console.warn(`[getBuildingImage] No default image found for ${type} level ${validLevel}`);
      console.warn(`[getBuildingImage] Available levels:`, Object.keys(images));
      console.warn(`[getBuildingImage] Level ${validLevel} variants:`, images[validLevel] ? Object.keys(images[validLevel]) : 'none');
      console.warn(`[getBuildingImage] Level 1 variants:`, images[1] ? Object.keys(images[1]) : 'none');
      console.warn(`[getBuildingImage] Level 1 A image:`, images[1]?.['A'] || 'not found');
    } else {
      console.log(`[getBuildingImage] Using default 'A' variant for ${type} level ${validLevel}:`, defaultImage);
    }
    return defaultImage;
  }
  
  // Try to map skin_key to local image
  const localSkin = mapSkinKeyToLocal(skinKey);
  if (localSkin) {
    const images = BUILDING_IMAGES[type];
    if (!images) return null;
    
    // Extract level from skin_key if format is {type}_{level}{variant}
    // e.g., 'coop_2A' -> level 2, 'warehouse_5A' -> level 5
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
 * Gets building display (ALWAYS returns an image, never an emoji)
 * If no skin is selected, uses the default _1A image for the level
 * @param type Building type
 * @param level Building level
 * @param skinKey Database skin_key
 * @param skinInfo Optional skin info from database with image_url
 * @returns Object with image (string) - NEVER returns emoji
 */
export const getBuildingDisplay = (
  type: BuildingType,
  level: number,
  skinKey?: string | null,
  skinInfo?: { image_url: string } | null
): { type: 'image'; src: string } => {
  // First, try to get the image using getBuildingImage
  let image = getBuildingImage(type, level, skinKey, skinInfo);
  
  // If we got an image, return it
  if (image) {
    return { type: 'image', src: image };
  }
  
  // If no image was found, ALWAYS use the default _1A image for the level
  // This ensures we NEVER show an emoji
  const images = BUILDING_IMAGES[type];
  if (images) {
    const structure = getBuildingStructure(type);
    const validLevel = Math.max(1, Math.min(structure.maxLevel, level));
    
    // Try to get the _1A image for the current level
    const defaultImage = images[validLevel]?.A || images[1]?.A || null;
    
    if (defaultImage) {
      console.log(`[getBuildingDisplay] Using default _1A image for ${type} level ${validLevel}:`, defaultImage);
      return { type: 'image', src: defaultImage };
    }
  }
  
  // If skinInfo has an image_url that looks like a valid URL, try to use it
  if (skinInfo?.image_url) {
    // Check if it's a valid URL (http/https) or absolute path (but not /src/)
    const isUrl = (skinInfo.image_url.startsWith('http://') || 
                   skinInfo.image_url.startsWith('https://') ||
                   (skinInfo.image_url.startsWith('/') && !skinInfo.image_url.startsWith('/src/')));
    
    // Check if it ends with image extensions
    const isImageFile = /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(skinInfo.image_url);
    
    if (isUrl && isImageFile) {
      return { type: 'image', src: skinInfo.image_url };
    }
  }
  
  // Final fallback: try to get ANY image from level 1
  if (images && images[1]) {
    // Try A, then B, then C, then any other variant
    const fallbackImage = images[1]['A'] || images[1]['B'] || images[1]['C'] || 
                          Object.values(images[1])[0] || null;
    
    if (fallbackImage) {
      console.warn(`[getBuildingDisplay] Using emergency fallback image for ${type}:`, fallbackImage);
      return { type: 'image', src: fallbackImage };
    }
  }
  
  // Last resort: try to get ANY image from ANY level for this building type
  if (images) {
    for (let levelNum = 1; levelNum <= 5; levelNum++) {
      if (images[levelNum]) {
        const anyImage = images[levelNum]['A'] || images[levelNum]['B'] || images[levelNum]['C'] ||
                        Object.values(images[levelNum])[0] || null;
        if (anyImage) {
          console.warn(`[getBuildingDisplay] Using last resort fallback image for ${type} from level ${levelNum}:`, anyImage);
          return { type: 'image', src: anyImage };
        }
      }
    }
  }
  
  // This should NEVER happen if images are properly set up
  // But if it does, we'll return a placeholder instead of throwing
  console.error(`[getBuildingDisplay] CRITICAL: No image found for ${type} level ${level}. Using placeholder.`);
  // Return a placeholder data URL instead of throwing
  return { 
    type: 'image', 
    src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2RkZCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gaW1hZ2U8L3RleHQ+PC9zdmc+' 
  };
};
