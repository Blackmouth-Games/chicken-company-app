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
  // Corral skins (coop) - Levels 1-5, Variants A and B
  { building_type: 'corral', skin_key: 'coop_1A', name: 'Corral Nivel 1A', image_url: '/src/assets/buildings/coop_1A.png', is_default: true, rarity: 'common' },
  { building_type: 'corral', skin_key: 'coop_1B', name: 'Corral Nivel 1B (Invierno)', image_url: '/src/assets/buildings/coop_1B.png', is_default: false, rarity: 'common' },
  { building_type: 'corral', skin_key: 'coop_2A', name: 'Corral Nivel 2A', image_url: '/src/assets/buildings/coop_2A.png', is_default: false, rarity: 'uncommon' },
  { building_type: 'corral', skin_key: 'coop_2B', name: 'Corral Nivel 2B', image_url: '/src/assets/buildings/coop_2B.png', is_default: false, rarity: 'uncommon' },
  { building_type: 'corral', skin_key: 'coop_3A', name: 'Corral Nivel 3A', image_url: '/src/assets/buildings/coop_3A.png', is_default: false, rarity: 'rare' },
  { building_type: 'corral', skin_key: 'coop_3B', name: 'Corral Nivel 3B', image_url: '/src/assets/buildings/coop_3B.png', is_default: false, rarity: 'rare' },
  { building_type: 'corral', skin_key: 'coop_4A', name: 'Corral Nivel 4A', image_url: '/src/assets/buildings/coop_4A.png', is_default: false, rarity: 'epic' },
  { building_type: 'corral', skin_key: 'coop_4B', name: 'Corral Nivel 4B', image_url: '/src/assets/buildings/coop_4B.png', is_default: false, rarity: 'epic' },
  { building_type: 'corral', skin_key: 'coop_5A', name: 'Corral Nivel 5A', image_url: '/src/assets/buildings/coop_5A.png', is_default: false, rarity: 'legendary' },
  { building_type: 'corral', skin_key: 'coop_5B', name: 'Corral Nivel 5B', image_url: '/src/assets/buildings/coop_5B.png', is_default: false, rarity: 'legendary' },
  
  // Warehouse skins - Levels 1-5
  { building_type: 'warehouse', skin_key: 'warehouse_1A', name: 'Almacén Nivel 1A', image_url: '/src/assets/buildings/warehouse_1A.png', is_default: true, rarity: 'common' },
  { building_type: 'warehouse', skin_key: 'warehouse_1B', name: 'Almacén Nivel 1B', image_url: '/src/assets/buildings/warehouse_1B.png', is_default: false, rarity: 'common' },
  { building_type: 'warehouse', skin_key: 'warehouse_2A', name: 'Almacén Nivel 2A', image_url: '/src/assets/buildings/warehouse_2A.png', is_default: false, rarity: 'uncommon' },
  { building_type: 'warehouse', skin_key: 'warehouse_3A', name: 'Almacén Nivel 3A', image_url: '/src/assets/buildings/warehouse_3A.png', is_default: false, rarity: 'rare' },
  { building_type: 'warehouse', skin_key: 'warehouse_4A', name: 'Almacén Nivel 4A', image_url: '/src/assets/buildings/warehouse_4A.png', is_default: false, rarity: 'epic' },
  { building_type: 'warehouse', skin_key: 'warehouse_5A', name: 'Almacén Nivel 5A', image_url: '/src/assets/buildings/warehouse_5A.png', is_default: false, rarity: 'legendary' },
  
  // Market skins - Levels 1-5, Variants A and B
  { building_type: 'market', skin_key: 'market_1A', name: 'Mercado Nivel 1A', image_url: '/src/assets/buildings/market_1A.png', is_default: true, rarity: 'common' },
  { building_type: 'market', skin_key: 'market_1B', name: 'Mercado Nivel 1B', image_url: '/src/assets/buildings/market_1B.png', is_default: false, rarity: 'common' },
  { building_type: 'market', skin_key: 'market_2A', name: 'Mercado Nivel 2A', image_url: '/src/assets/buildings/market_2A.png', is_default: false, rarity: 'uncommon' },
  { building_type: 'market', skin_key: 'market_2B', name: 'Mercado Nivel 2B', image_url: '/src/assets/buildings/market_2B.png', is_default: false, rarity: 'uncommon' },
  { building_type: 'market', skin_key: 'market_3A', name: 'Mercado Nivel 3A', image_url: '/src/assets/buildings/market_3A.png', is_default: false, rarity: 'rare' },
  { building_type: 'market', skin_key: 'market_3B', name: 'Mercado Nivel 3B', image_url: '/src/assets/buildings/market_3B.png', is_default: false, rarity: 'rare' },
  { building_type: 'market', skin_key: 'market_4A', name: 'Mercado Nivel 4A', image_url: '/src/assets/buildings/market_4A.png', is_default: false, rarity: 'epic' },
  { building_type: 'market', skin_key: 'market_4B', name: 'Mercado Nivel 4B', image_url: '/src/assets/buildings/market_4B.png', is_default: false, rarity: 'epic' },
  { building_type: 'market', skin_key: 'market_5A', name: 'Mercado Nivel 5A', image_url: '/src/assets/buildings/market_5A .png', is_default: false, rarity: 'legendary' },
  { building_type: 'market', skin_key: 'market_5B', name: 'Mercado Nivel 5B', image_url: '/src/assets/buildings/market_5B.png', is_default: false, rarity: 'legendary' },
  
  // House skins - Level 1, Variants A, B, and C
  { building_type: 'house', skin_key: 'house_1A', name: 'Casa Nivel 1A', image_url: '/src/assets/buildings/house_1A.png', is_default: true, rarity: 'common' },
  { building_type: 'house', skin_key: 'house_1B', name: 'Casa Nivel 1B', image_url: '/src/assets/buildings/house_1B.png', is_default: false, rarity: 'common' },
  { building_type: 'house', skin_key: 'house_1C', name: 'Casa Nivel 1C', image_url: '/src/assets/buildings/house_1C.png', is_default: false, rarity: 'common' },
];

export const addAllBuildingSkins = async () => {
  console.log('Iniciando inserción de skins...');
  
  // First, delete all existing skins to start fresh
  const { error: deleteError } = await supabase
    .from('building_skins')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
  
  if (deleteError) {
    console.error('Error eliminando skins antiguas:', deleteError);
    return {
      success: false,
      successCount: 0,
      errorCount: 1,
      errors: [`Error eliminando skins antiguas: ${deleteError.message}`],
    };
  }
  
  console.log('Skins antiguas eliminadas. Insertando nuevas skins...');
  
  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  for (const skin of allSkins) {
    try {
      const { error } = await supabase
        .from('building_skins')
        .insert(skin);

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
    .select('skin_key, building_type, name, image_url, rarity, is_default')
    .order('building_type')
    .order('skin_key');

  if (error) {
    console.error('Error obteniendo skins:', error);
    return null;
  }

  return data;
};

