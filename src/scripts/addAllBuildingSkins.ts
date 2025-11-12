/**
 * Script to add all building skins to the database
 * Run this script to populate the building_skins table with all available skins
 */

import { supabase } from "@/integrations/supabase/client";

interface SkinData {
  building_type: string;
  skin_key: string;
  name: string;
  image_url: string;
  is_default: boolean;
  rarity: string;
}

const allSkins: SkinData[] = [
  // Corral skins - Levels 1-5, Variants A and B
  { building_type: 'corral', skin_key: 'corral_1A', name: 'Corral Nivel 1 - Variante A', image_url: '🏚️', is_default: false, rarity: 'common' },
  { building_type: 'corral', skin_key: 'corral_1B', name: 'Corral Nivel 1 - Variante B', image_url: '🏚️', is_default: false, rarity: 'common' },
  { building_type: 'corral', skin_key: 'corral_2A', name: 'Corral Nivel 2 - Variante A', image_url: '🏚️', is_default: false, rarity: 'uncommon' },
  { building_type: 'corral', skin_key: 'corral_2B', name: 'Corral Nivel 2 - Variante B', image_url: '🏚️', is_default: false, rarity: 'uncommon' },
  { building_type: 'corral', skin_key: 'corral_3A', name: 'Corral Nivel 3 - Variante A', image_url: '🏚️', is_default: false, rarity: 'rare' },
  { building_type: 'corral', skin_key: 'corral_3B', name: 'Corral Nivel 3 - Variante B', image_url: '🏚️', is_default: false, rarity: 'rare' },
  { building_type: 'corral', skin_key: 'corral_4A', name: 'Corral Nivel 4 - Variante A', image_url: '🏚️', is_default: false, rarity: 'epic' },
  { building_type: 'corral', skin_key: 'corral_4B', name: 'Corral Nivel 4 - Variante B', image_url: '🏚️', is_default: false, rarity: 'epic' },
  { building_type: 'corral', skin_key: 'corral_5A', name: 'Corral Nivel 5 - Variante A', image_url: '🏚️', is_default: false, rarity: 'legendary' },
  { building_type: 'corral', skin_key: 'corral_5B', name: 'Corral Nivel 5 - Variante B', image_url: '🏚️', is_default: false, rarity: 'legendary' },
  
  // Warehouse skins - Levels 1-5
  { building_type: 'warehouse', skin_key: 'warehouse_1A', name: 'Almacén Nivel 1 - Variante A', image_url: '🏭', is_default: true, rarity: 'common' },
  { building_type: 'warehouse', skin_key: 'warehouse_1B', name: 'Almacén Nivel 1 - Variante B', image_url: '🏭', is_default: false, rarity: 'common' },
  { building_type: 'warehouse', skin_key: 'warehouse_2A', name: 'Almacén Nivel 2 - Variante A', image_url: '🏭', is_default: false, rarity: 'uncommon' },
  { building_type: 'warehouse', skin_key: 'warehouse_3A', name: 'Almacén Nivel 3 - Variante A', image_url: '🏭', is_default: false, rarity: 'rare' },
  { building_type: 'warehouse', skin_key: 'warehouse_4A', name: 'Almacén Nivel 4 - Variante A', image_url: '🏭', is_default: false, rarity: 'epic' },
  { building_type: 'warehouse', skin_key: 'warehouse_5A', name: 'Almacén Nivel 5 - Variante A', image_url: '🏭', is_default: false, rarity: 'legendary' },
  
  // Market skins - Levels 1-5, Variants A and B
  { building_type: 'market', skin_key: 'market_1A', name: 'Mercado Nivel 1 - Variante A', image_url: '🏪', is_default: true, rarity: 'common' },
  { building_type: 'market', skin_key: 'market_1B', name: 'Mercado Nivel 1 - Variante B', image_url: '🏪', is_default: false, rarity: 'common' },
  { building_type: 'market', skin_key: 'market_2A', name: 'Mercado Nivel 2 - Variante A', image_url: '🏪', is_default: false, rarity: 'uncommon' },
  { building_type: 'market', skin_key: 'market_2B', name: 'Mercado Nivel 2 - Variante B', image_url: '🏪', is_default: false, rarity: 'uncommon' },
  { building_type: 'market', skin_key: 'market_3A', name: 'Mercado Nivel 3 - Variante A', image_url: '🏪', is_default: false, rarity: 'rare' },
  { building_type: 'market', skin_key: 'market_3B', name: 'Mercado Nivel 3 - Variante B', image_url: '🏪', is_default: false, rarity: 'rare' },
  { building_type: 'market', skin_key: 'market_4A', name: 'Mercado Nivel 4 - Variante A', image_url: '🏪', is_default: false, rarity: 'epic' },
  { building_type: 'market', skin_key: 'market_4B', name: 'Mercado Nivel 4 - Variante B', image_url: '🏪', is_default: false, rarity: 'epic' },
  { building_type: 'market', skin_key: 'market_5A', name: 'Mercado Nivel 5 - Variante A', image_url: '🏪', is_default: false, rarity: 'legendary' },
  { building_type: 'market', skin_key: 'market_5B', name: 'Mercado Nivel 5 - Variante B', image_url: '🏪', is_default: false, rarity: 'legendary' },
  
  // House skins - Level 1, Variants A, B, and C
  { building_type: 'house', skin_key: 'house_1A', name: 'Casa Nivel 1 - Variante A', image_url: '🏠', is_default: true, rarity: 'common' },
  { building_type: 'house', skin_key: 'house_1B', name: 'Casa Nivel 1 - Variante B', image_url: '🏠', is_default: false, rarity: 'common' },
  { building_type: 'house', skin_key: 'house_1C', name: 'Casa Nivel 1 - Variante C', image_url: '🏠', is_default: false, rarity: 'common' },
];

export const addAllBuildingSkins = async () => {
  console.log('Iniciando inserción de skins...');
  
  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  for (const skin of allSkins) {
    try {
      // Use upsert to avoid conflicts if skin already exists
      const { error } = await supabase
        .from('building_skins')
        .upsert(skin, { onConflict: 'skin_key' });

      if (error) {
        console.error(`Error insertando ${skin.skin_key}:`, error.message);
        errorCount++;
        errors.push(`${skin.skin_key}: ${error.message}`);
      } else {
        console.log(`✓ ${skin.skin_key} insertado correctamente`);
        successCount++;
      }
    } catch (error: any) {
      console.error(`Error inesperado con ${skin.skin_key}:`, error);
      errorCount++;
      errors.push(`${skin.skin_key}: ${error.message || 'Error desconocido'}`);
    }
  }

  console.log('\n=== Resumen ===');
  console.log(`✓ Exitosas: ${successCount}`);
  console.log(`✗ Errores: ${errorCount}`);
  
  if (errors.length > 0) {
    console.log('\nErrores detallados:');
    errors.forEach(err => console.log(`  - ${err}`));
  }

  return {
    success: errorCount === 0,
    successCount,
    errorCount,
    errors,
  };
};

// Function to check existing skins
export const checkExistingSkins = async () => {
  const { data, error } = await supabase
    .from('building_skins')
    .select('skin_key, building_type, name')
    .order('building_type')
    .order('skin_key');

  if (error) {
    console.error('Error obteniendo skins:', error);
    return null;
  }

  return data;
};

