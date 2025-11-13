/**
 * Script para actualizar todos los precios de los productos de la tienda a 0.001 TON
 * 
 * OPCIÓN 1: Ejecutar desde la línea de comandos:
 *   npm run update-store-prices
 * 
 * OPCIÓN 2: Ejecutar desde la consola del navegador (F12):
 *   import { updateStorePrices } from './src/scripts/updateStorePrices.ts';
 *   await updateStorePrices();
 */

import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase - usar las mismas credenciales que en client.ts
const SUPABASE_URL = "https://allexcdmfjigijunipxz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsbGV4Y2RtZmppZ2lqdW5pcHh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzMzExMTYsImV4cCI6MjA3NzkwNzExNn0.C3hjUziPL1MtlZ7U25NVbRP4055mUKkyonaKF8bXIMI";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function updateStorePrices() {
  console.log("🚀 Actualizando precios de productos de la tienda a 0.001 TON...\n");

  try {
    // Obtener todos los productos activos
    const { data: products, error: fetchError } = await supabase
      .from("store_products")
      .select("id, product_key, name, price_ton")
      .eq("is_active", true);

    if (fetchError) {
      throw fetchError;
    }

    if (!products || products.length === 0) {
      console.log("⚠️ No se encontraron productos activos.");
      return;
    }

    console.log(`📦 Encontrados ${products.length} productos activos:\n`);
    products.forEach((product) => {
      console.log(`  - ${product.product_key}: ${product.name} (precio actual: ${product.price_ton} TON)`);
    });

    console.log("\n🔄 Actualizando precios a 0.001 TON...\n");

    // Actualizar todos los precios a 0.001
    const { data: updated, error: updateError } = await supabase
      .from("store_products")
      .update({ 
        price_ton: 0.001,
        updated_at: new Date().toISOString()
      })
      .eq("is_active", true)
      .select("id, product_key, name, price_ton");

    if (updateError) {
      throw updateError;
    }

    console.log(`✅ ${updated?.length || 0} productos actualizados exitosamente:\n`);
    updated?.forEach((product) => {
      console.log(`  ✅ ${product.product_key}: ${product.name} → ${product.price_ton} TON`);
    });

    console.log("\n✨ ¡Actualización completada!");
    return updated;
  } catch (error: any) {
    console.error("❌ Error actualizando precios:", error);
    console.error("Detalles:", error.message);
    throw error;
  }
}

// Ejecutar si se llama directamente desde Node.js
if (typeof require !== 'undefined' && require.main === module) {
  updateStorePrices()
    .then(() => {
      console.log("\n✅ Script completado exitosamente");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Error ejecutando script:", error);
      process.exit(1);
    });
}
