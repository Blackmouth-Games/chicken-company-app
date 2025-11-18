/**
 * Script to automatically detect and add building skins to the database
 * Scans assets/buildings/ folder and creates skin entries automatically
 * Just add new image files following the pattern: {type}_{level}{variant}.png
 */

import { supabase } from "@/integrations/supabase/client";
import { getParsedImagesForType, getAvailableBuildingTypes } from "@/lib/buildingImagesDynamic";

interface SkinData {
  building_type: string;
  skin_key: string;
  name: string;
  image_url: string;
  is_default: boolean;
  rarity: string;
}

/**
 * Determine rarity based on level
 */
function getRarityForLevel(level: number): string {
  if (level === 1) return 'common';
  if (level === 2) return 'uncommon';
  if (level === 3) return 'rare';
  if (level === 4) return 'epic';
  return 'legendary';
}

/**
 * Generate skin name from building type, level, and variant
 */
function generateSkinName(buildingType: string, level: number, variant: string): string {
  const buildingNames: Record<string, string> = {
    corral: 'Corral',
    warehouse: 'Almacén',
    market: 'Mercado',
    house: 'Casa',
  };
  
  const buildingName = buildingNames[buildingType] || buildingType;
  return `${buildingName} Nivel ${level}${variant}`;
}

/**
 * Automatically detect all building images and generate skin data
 */
function detectSkinsFromImages(): SkinData[] {
  const skins: SkinData[] = [];
  const buildingTypes = getAvailableBuildingTypes();
  
  for (const buildingType of buildingTypes) {
    const images = getParsedImagesForType(buildingType);
    
    for (const image of images) {
      const { level, variant, fileName, relativePath } = image;
      
      // Generate skin_key: normalize coop -> corral
      const skinKey = buildingType === 'corral' && fileName.startsWith('coop_')
        ? `coop_${level}${variant}`
        : `${buildingType}_${level}${variant}`;
      
      // Every level's variant "A" should be the default skin for that level
      const isDefault = variant === 'A';
      
      skins.push({
        building_type: buildingType,
        skin_key: skinKey,
        name: generateSkinName(buildingType, level, variant),
        image_url: `/src/assets/buildings/${relativePath}`, // Will be replaced by emoji in DB
        is_default: isDefault,
        rarity: getRarityForLevel(level),
      });
    }
  }
  
  return skins;
}

/**
 * Get emoji for building type (for image_url fallback)
 */
function getEmojiForBuildingType(buildingType: string): string {
  const emojis: Record<string, string> = {
    corral: '🏚️',
    warehouse: '🏭',
    market: '🏪',
    house: '🏠',
  };
  return emojis[buildingType] || '🏚️';
}

/**
 * Add all building skins to database (auto-detected from images)
 */
export const addAllBuildingSkins = async () => {
  console.log('🔍 Escaneando imágenes en assets/buildings/...');
  
  // Auto-detect skins from images
  const detectedSkins = detectSkinsFromImages();
  console.log(`📦 Encontradas ${detectedSkins.length} skins en imágenes`);
  
  // Get existing skins from database
  const { data: existingSkins } = await supabase
    .from('building_skins')
    .select('skin_key');
  
  const existingKeys = new Set(existingSkins?.map(s => s.skin_key) || []);
  
  // Filter out skins that already exist
  const newSkins = detectedSkins.filter(skin => !existingKeys.has(skin.skin_key));
  const updateSkins = detectedSkins.filter(skin => existingKeys.has(skin.skin_key));
  
  console.log(`✨ ${newSkins.length} skins nuevas detectadas`);
  console.log(`🔄 ${updateSkins.length} skins existentes (se actualizarán)`);
  
  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  // Process all skins (new and existing)
  for (const skin of detectedSkins) {
    try {
      // Use emoji as image_url (images are loaded from local assets)
      const skinWithEmoji = {
        ...skin,
        image_url: getEmojiForBuildingType(skin.building_type),
      };
      
      // Use upsert to avoid conflicts if skin already exists
      const { error } = await supabase
        .from('building_skins')
        .upsert(skinWithEmoji, { onConflict: 'skin_key' });

      if (error) {
        console.error(`❌ Error insertando ${skin.skin_key}:`, error.message);
        errorCount++;
        errors.push(`${skin.skin_key}: ${error.message}`);
      } else {
        const isNew = newSkins.includes(skin);
        console.log(`${isNew ? '✨' : '🔄'} ${skin.skin_key} ${isNew ? 'insertado' : 'actualizado'} correctamente`);
        successCount++;
      }
    } catch (error: any) {
      console.error(`❌ Error inesperado con ${skin.skin_key}:`, error);
      errorCount++;
      errors.push(`${skin.skin_key}: ${error.message || 'Error desconocido'}`);
    }
  }

  console.log('\n=== 📊 Resumen ===');
  console.log(`✅ Exitosas: ${successCount}`);
  console.log(`❌ Errores: ${errorCount}`);
  
  if (errors.length > 0) {
    console.log('\n❌ Errores detallados:');
    errors.forEach(err => console.log(`  - ${err}`));
  }

  return {
    success: errorCount === 0,
    successCount,
    errorCount,
    errors,
    newSkins: newSkins.length,
    updatedSkins: updateSkins.length,
  };
};

// Function to check existing skins
export const checkExistingSkins = async () => {
  const { data, error } = await supabase
    .from('building_skins')
    .select('skin_key, building_type, name, image_url, rarity, is_default')
    .order('building_type')
    .order('skin_key');

  if (error) {
    console.error('Error obteniendo skins:', error);
    return null;
  }

  return data;
};

