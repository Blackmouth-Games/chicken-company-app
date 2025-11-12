/**
 * Script para ejecutar la migración directamente usando el cliente de Supabase
 * Este script ejecuta las operaciones sin necesidad de Edge Function
 */

import { supabase } from "@/integrations/supabase/client";

async function executeMigration() {
  console.log("🚀 Ejecutando migración de productos de la tienda...\n");

  try {
    // Step 1: Update basic_skins_pack content_items
    console.log("📝 Paso 1: Actualizando basic_skins_pack...");
    
    const { data: existingSkinsPack, error: fetchError } = await supabase
      .from('store_products')
      .select('content_items')
      .eq('product_key', 'basic_skins_pack')
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    if (existingSkinsPack) {
      const contentItems = existingSkinsPack.content_items as string[] | null;
      const hasOldFormat = contentItems && (
        contentItems.includes('skin_corral_red') ||
        contentItems.includes('skin_corral_blue') ||
        contentItems.includes('skin_corral_green') ||
        contentItems.includes('skin_warehouse_premium') ||
        contentItems.includes('skin_market_deluxe')
      );

      if (hasOldFormat) {
        const { error: updateError } = await supabase
          .from('store_products')
          .update({
            content_items: ['corral_1B', 'corral_2B', 'corral_3B', 'warehouse_1B', 'market_1B']
          })
          .eq('product_key', 'basic_skins_pack');

        if (updateError) throw updateError;
        console.log("✅ basic_skins_pack actualizado\n");
      } else {
        console.log("ℹ️  basic_skins_pack ya tiene el formato correcto\n");
      }
    }

    // Step 2: Insert or update all store products
    const products = [
      {
        product_key: 'starter_pack',
        name: 'Starter Pack',
        description: 'Paquete inicial para comenzar tu granja',
        price_ton: 15,
        content_items: ['Subida de nivel de Maria la Pollera a nivel 2', 'Nuevo corral', 'Nuevo Granjero Juan'],
        store_image_url: '/images/store/starter-pack.png',
        detail_image_url: '/images/store/starter-pack-detail.png',
        is_active: true,
        sort_order: 1
      },
      {
        product_key: 'christmas_pack',
        name: 'Christmas Pack',
        description: 'Edición especial de Navidad',
        price_ton: 2.5,
        content_items: ['Decoraciones navideñas', 'Market especial', 'Bonus de temporada'],
        store_image_url: '/images/store/christmas-pack.png',
        detail_image_url: '/images/store/christmas-pack-detail.png',
        is_active: true,
        sort_order: 2
      },
      {
        product_key: 'winter_chickens',
        name: 'Winter Chickens',
        description: 'Pack de 200 gallinas de invierno',
        price_ton: 202,
        content_items: ['200 gallinas de invierno', 'Resistentes al frío'],
        store_image_url: '/images/store/winter-chickens.png',
        detail_image_url: '/images/store/winter-chickens-detail.png',
        is_active: true,
        sort_order: 3
      },
      {
        product_key: 'support_builders',
        name: 'Support Builders',
        description: 'Apoyo a los constructores',
        price_ton: 10,
        content_items: ['Trabajador adicional', 'Velocidad de construcción aumentada'],
        store_image_url: '/images/store/support-builders.png',
        detail_image_url: '/images/store/support-builders-detail.png',
        is_active: true,
        sort_order: 4
      },
      {
        product_key: 'basic_skins_pack',
        name: 'Pack de Skins Básico',
        description: 'Colección de 5 skins únicos para tus edificios',
        price_ton: 0.5,
        content_items: ['corral_1B', 'corral_2B', 'corral_3B', 'warehouse_1B', 'market_1B'],
        store_image_url: '/images/store/skins-pack.png',
        detail_image_url: '/images/store/skins-pack-detail.png',
        is_active: true,
        sort_order: 5
      }
    ];

    console.log("📝 Paso 2: Insertando/actualizando productos...\n");

    for (const product of products) {
      console.log(`⏳ Procesando: ${product.product_key}...`);
      
      // Verificar si existe
      const { data: existing, error: checkError } = await supabase
        .from('store_products')
        .select('id, store_image_url, detail_image_url')
        .eq('product_key', product.product_key)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existing) {
        // Update (preservar URLs de imágenes si ya existen)
        const { error: updateError } = await supabase
          .from('store_products')
          .update({
            name: product.name,
            description: product.description,
            price_ton: product.price_ton,
            content_items: product.content_items,
            store_image_url: product.store_image_url || existing.store_image_url,
            detail_image_url: product.detail_image_url || existing.detail_image_url,
            is_active: product.is_active,
            sort_order: product.sort_order
          })
          .eq('product_key', product.product_key);

        if (updateError) throw updateError;
        console.log(`✅ ${product.product_key} actualizado`);
      } else {
        // Insert
        const { error: insertError } = await supabase
          .from('store_products')
          .insert(product);

        if (insertError) throw insertError;
        console.log(`✅ ${product.product_key} insertado`);
      }
    }

    console.log("\n✅ ¡Migración completada exitosamente!");
    console.log("\n📋 Verifica los productos en:");
    console.log("   https://supabase.com/dashboard/project/allexcdmfjigijunipxz/editor/table/store_products");
    
    return { success: true };

  } catch (error: any) {
    console.error("\n❌ Error ejecutando migración:", error.message);
    console.error("Detalles:", error);
    throw error;
  }
}

// Ejecutar inmediatamente
executeMigration()
  .then((result) => {
    console.log("\n✅ Resultado:", result);
    if (typeof window === 'undefined') {
      process.exit(0);
    }
  })
  .catch((error) => {
    console.error("\n❌ Error:", error);
    if (typeof window === 'undefined') {
      process.exit(1);
    }
  });

export { executeMigration };

