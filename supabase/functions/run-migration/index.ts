import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Running store products migration...');

    // Step 1: Update basic_skins_pack content_items
    const { data: existingSkinsPack } = await supabase
      .from('store_products')
      .select('content_items')
      .eq('product_key', 'basic_skins_pack')
      .single();

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
        await supabase
          .from('store_products')
          .update({
            content_items: ['corral_1B', 'corral_2B', 'corral_3B', 'warehouse_1B', 'market_1B']
          })
          .eq('product_key', 'basic_skins_pack');
        console.log('Updated basic_skins_pack');
      }
    }

    // Step 2: Insert or update all products
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

    for (const product of products) {
      const { data: existing } = await supabase
        .from('store_products')
        .select('id, store_image_url, detail_image_url')
        .eq('product_key', product.product_key)
        .single();

      if (existing) {
        await supabase
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
      } else {
        await supabase
          .from('store_products')
          .insert(product);
      }
    }

    console.log('Migration completed successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Migration completed successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in migration:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

