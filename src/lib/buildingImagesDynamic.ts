/**
 * Dynamic building images system
 * Automatically scans and maps building images from assets/buildings/
 * This makes adding new skins much easier - just add the image file!
 */

// Auto-import all building images (including nested folders like buildings/coop/)
const buildingImageModules = import.meta.glob('/src/assets/buildings/**/*.{png,jpg,jpeg,webp,svg}', { 
  eager: true, 
  as: 'url' 
}) as Record<string, string>;

// Mapping from file names to building type, level, and variant
interface ParsedImage {
  buildingType: string;
  level: number;
  variant: string;
  url: string;
  fileName: string;
  relativePath: string;
}

/**
 * Parse a building image filename to extract type, level, and variant
 * Examples:
 * - "coop_1A.png" -> { buildingType: "coop", level: 1, variant: "A" }
 * - "warehouse_5A.png" -> { buildingType: "warehouse", level: 5, variant: "A" }
 * - "house_1C.png" -> { buildingType: "house", level: 1, variant: "C" }
 */
function parseImageFileName(filePath: string): ParsedImage | null {
  const relativePath = filePath.replace('/src/assets/buildings/', '');
  // Remove path but keep extension info
  const baseName = relativePath
    .replace(/^.*\//, '') // Remove path
    .replace(/\s+/g, ''); // Remove spaces (e.g., "market_5A .png" -> "market_5A.png")
  
  // Extract extension
  const extensionMatch = baseName.match(/\.([^.]+)$/);
  const extension = extensionMatch ? extensionMatch[1] : 'png';
  
  // Remove extension for parsing
  const nameWithoutExt = baseName.replace(/\.[^.]+$/, '');
  
  // Match pattern: {type}_{level}{variant}
  // Examples: coop_1A, warehouse_5A, house_1C, corral_2J (supports A-J for 10 variants)
  // Also supports numeric variants: corral_21, warehouse_35 (for variants 1-10)
  const match = nameWithoutExt.match(/^([a-z]+)_(\d+)([A-J]|\d{1,2})$/i);
  
  if (!match) return null;
  
  const [, type, levelStr, variant] = match;
  
  // Normalize building type names
  const buildingTypeMap: Record<string, string> = {
    'coop': 'corral',
    'corral': 'corral',
    'warehouse': 'warehouse',
    'market': 'market',
    'house': 'house',
  };
  
  const buildingType = buildingTypeMap[type.toLowerCase()];
  if (!buildingType) return null;
  
  const level = parseInt(levelStr, 10);
  if (isNaN(level) || level < 1 || level > 99) return null;
  
  // Normalize variant: if it's a number (1-10), convert to letter (A-J)
  let normalizedVariant = variant.toUpperCase();
  const variantNum = parseInt(variant, 10);
  if (!isNaN(variantNum) && variantNum >= 1 && variantNum <= 10) {
    // Convert 1-10 to A-J
    normalizedVariant = String.fromCharCode(64 + variantNum); // 1->A, 2->B, ..., 10->J
  }

  // The key in buildingImageModules is the full file path like '/src/assets/buildings/coop/coop_1A.png'
  const imageUrl = buildingImageModules[filePath];
  
  if (!imageUrl) {
    console.warn(`[parseImageFileName] Could not find image URL for: ${filePath}, available keys:`, Object.keys(buildingImageModules).slice(0, 5));
  }
  
  return {
    buildingType,
    level,
    variant: normalizedVariant,
    url: imageUrl || '',
    fileName: nameWithoutExt, // Return without extension
    relativePath,
  };
}

/**
 * Build dynamic BUILDING_IMAGES structure from scanned images
 */
function buildDynamicImages(): Record<string, Record<number, Record<string, string>>> {
  const images: Record<string, Record<number, Record<string, string>>> = {};
  
  for (const [filePath, url] of Object.entries(buildingImageModules)) {
      const parsed = parseImageFileName(filePath);
      if (!parsed) {
        console.warn(`[buildDynamicImages] Could not parse file path: ${filePath}`);
        continue;
      }
      
      const { buildingType, level, variant, url: imageUrl } = parsed;
      
      if (!imageUrl) {
        console.warn(`[buildDynamicImages] No URL found for ${buildingType} level ${level} variant ${variant} (file: ${filePath})`);
        continue;
      }
      
      if (!images[buildingType]) {
        images[buildingType] = {};
      }
      if (!images[buildingType][level]) {
        images[buildingType][level] = {};
      }
      
      images[buildingType][level][variant] = imageUrl;
  }
  
  // Debug: log what was built
  console.log('[buildDynamicImages] Built images structure:', {
    types: Object.keys(images),
    warehouse: images['warehouse'] ? {
      levels: Object.keys(images['warehouse']),
      level1: images['warehouse'][1] ? Object.keys(images['warehouse'][1]) : 'no level 1',
      level1A: images['warehouse'][1]?.['A'] || 'no 1A',
    } : 'not found',
    corral: images['corral'] ? Object.keys(images['corral']) : 'not found',
  });
  
  return images;
}

/**
 * Build dynamic SKIN_KEY_TO_LOCAL_MAP from scanned images
 */
function buildDynamicSkinKeyMap(): Record<string, 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J'> {
  const map: Record<string, 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J'> = {};
  
  for (const filePath of Object.keys(buildingImageModules)) {
    const parsed = parseImageFileName(filePath);
    if (!parsed) continue;
    
    const { buildingType, level, variant } = parsed;
    const skinKey = `${buildingType}_${level}${variant}`;
    
    // Map all valid variants (A-J for 10 skins per level)
    if (['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].includes(variant)) {
      map[skinKey] = variant as 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J';
    }
  }
  
  return map;
}

// Build dynamic structures
export const BUILDING_IMAGES_DYNAMIC = buildDynamicImages();
export const SKIN_KEY_TO_LOCAL_MAP_DYNAMIC = buildDynamicSkinKeyMap();

/**
 * Get all parsed images for a specific building type
 */
export function getParsedImagesForType(buildingType: string): ParsedImage[] {
  const parsed: ParsedImage[] = [];
  
  for (const filePath of Object.keys(buildingImageModules)) {
    const parsedImage = parseImageFileName(filePath);
    if (parsedImage && parsedImage.buildingType === buildingType) {
      parsed.push(parsedImage);
    }
  }
  
  return parsed.sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return a.variant.localeCompare(b.variant);
  });
}

/**
 * Get structure (max level and variants) for a building type
 */
export function getBuildingStructure(buildingType: string): { maxLevel: number; variants: string[] } {
  const images = getParsedImagesForType(buildingType);
  
  if (images.length === 0) {
    return { maxLevel: 5, variants: ['A', 'B'] }; // Default
  }
  
  const maxLevel = Math.max(...images.map(img => img.level));
  const variants = [...new Set(images.map(img => img.variant))].sort();
  
  return { maxLevel, variants };
}

/**
 * Get all available building types from scanned images
 */
export function getAvailableBuildingTypes(): string[] {
  const types = new Set<string>();
  
  for (const filePath of Object.keys(buildingImageModules)) {
    const parsed = parseImageFileName(filePath);
    if (parsed) {
      types.add(parsed.buildingType);
    }
  }
  
  return Array.from(types).sort();
}

