import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessPurchaseRequest {
  purchase_id: string;
  transaction_hash: string;
}

// Check if a string is a valid skin_key format (e.g., "coop_1B", "warehouse_2A")
// Format: {building_type}_{level}{variant}
const isValidSkinKey = (key: string): boolean => {
  const skinKeyPattern = /^(coop|warehouse|market|house)_\d+[A-J]$/i;
  return skinKeyPattern.test(key);
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

    const { purchase_id, transaction_hash } = await req.json() as ProcessPurchaseRequest;

    if (!purchase_id || !transaction_hash) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: purchase_id and transaction_hash' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing store purchase:', { purchase_id, transaction_hash });

    // 1. Get the purchase record
    const { data: purchase, error: purchaseError } = await supabase
      .from('store_purchases')
      .select('*, store_products(*)')
      .eq('id', purchase_id)
      .single();

    if (purchaseError || !purchase) {
      console.error('Error fetching purchase:', purchaseError);
      return new Response(
        JSON.stringify({ error: 'Purchase not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Get the product (it should be in the join, but let's be safe)
    const product = purchase.store_products;
    if (!product) {
      const { data: productData, error: productError } = await supabase
        .from('store_products')
        .select('*')
        .eq('id', purchase.product_id)
        .single();

      if (productError || !productData) {
        console.error('Error fetching product:', productError);
        return new Response(
          JSON.stringify({ error: 'Product not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const finalProduct = product || (await supabase.from('store_products').select('*').eq('id', purchase.product_id).single()).data;

    if (!finalProduct) {
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Parse content items and map skins
    const itemsToInsert: Array<{
      user_id: string;
      item_type: string;
      item_key: string;
      quantity: number;
    }> = [];
    
    let chickensToAdd = 0;

    if (finalProduct.content_items && Array.isArray(finalProduct.content_items)) {
      for (const itemDesc of finalProduct.content_items) {
        if (typeof itemDesc !== 'string') continue;
        
        // Check if item is chickens (format: "chickens:100")
        if (itemDesc.startsWith('chickens:')) {
          const amount = parseInt(itemDesc.split(':')[1]);
          if (!isNaN(amount) && amount > 0) {
            chickensToAdd = amount;
          }
          continue;
        }
        
        // Check if item is a valid skin_key (e.g., "coop_1B", "warehouse_2A")
        if (isValidSkinKey(itemDesc)) {
          // Verify the skin exists in building_skins table
          const { data: skinExists } = await supabase
            .from('building_skins')
            .select('skin_key')
            .eq('skin_key', itemDesc)
            .single();

          if (!skinExists) {
            console.warn(`Skin key not found in building_skins: ${itemDesc}, skipping`);
            continue;
          }

          itemsToInsert.push({
            user_id: purchase.user_id,
            item_type: "skin",
            item_key: itemDesc,
            quantity: 1,
          });
        } else {
          // Parse other item types
          let itemType = "pack_item";
          let itemKey = finalProduct.product_key;
          
          if (itemDesc.toLowerCase().includes("coop")) {
            itemType = "building";
            itemKey = "coop";
          } else if (itemDesc.toLowerCase().includes("granjero")) {
            itemType = "character";
            itemKey = "farmer";
          } else if (itemDesc.toLowerCase().includes("nivel")) {
            itemType = "upgrade";
            itemKey = "level_boost";
          }

          itemsToInsert.push({
            user_id: purchase.user_id,
            item_type: itemType,
            item_key: itemKey,
            quantity: 1,
          });
        }
      }
    }

    // 4. Insert items into user_items (using upsert to handle duplicates)
    if (itemsToInsert.length > 0) {
      const { error: itemsError } = await supabase
        .from('user_items')
        .upsert(itemsToInsert, {
          onConflict: 'user_id,item_type,item_key',
          ignoreDuplicates: false
        });

      if (itemsError) {
        console.error('Error inserting items:', itemsError);
        return new Response(
          JSON.stringify({ error: 'Failed to add items to inventory', details: itemsError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Successfully added ${itemsToInsert.length} items to user inventory`);
    }

    // 5. Add chickens to user's coops if specified
    if (chickensToAdd > 0) {
      console.log(`Adding ${chickensToAdd} chickens to user ${purchase.user_id}`);
      
      // Get all user's coops ordered by position_index
      const { data: userCoops, error: coopsError } = await supabase
        .from('user_buildings')
        .select('id, current_chickens, capacity')
        .eq('user_id', purchase.user_id)
        .eq('building_type', 'coop')
        .order('position_index');

      if (coopsError) {
        console.error('Error fetching user coops:', coopsError);
        // Don't fail the purchase if we can't add chickens, just log it
      } else if (userCoops && userCoops.length > 0) {
        let remainingChickens = chickensToAdd;
        
        // Distribute chickens across coops, filling them up to capacity
        for (const coop of userCoops) {
          if (remainingChickens <= 0) break;
          
          const availableSpace = coop.capacity - coop.current_chickens;
          if (availableSpace > 0) {
            const chickensToAddToCoop = Math.min(remainingChickens, availableSpace);
            const newChickenCount = coop.current_chickens + chickensToAddToCoop;
            
            const { error: updateError } = await supabase
              .from('user_buildings')
              .update({ current_chickens: newChickenCount })
              .eq('id', coop.id);

            if (updateError) {
              console.error(`Error updating coop ${coop.id}:`, updateError);
            } else {
              console.log(`Added ${chickensToAddToCoop} chickens to coop ${coop.id} (now ${newChickenCount}/${coop.capacity})`);
              remainingChickens -= chickensToAddToCoop;
            }
          }
        }
        
        if (remainingChickens > 0) {
          console.warn(`Could not add ${remainingChickens} chickens - all coops are full`);
        }
      } else {
        console.warn(`User ${purchase.user_id} has no coops to add chickens to`);
      }
    }

    // 6. Update purchase as completed
    const { error: updateError } = await supabase
      .from('store_purchases')
      .update({
        status: 'completed',
        transaction_hash: transaction_hash,
        completed_at: new Date().toISOString(),
      })
      .eq('id', purchase_id);

    if (updateError) {
      console.error('Error updating purchase:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update purchase status', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Purchase processed successfully:', purchase_id);

    return new Response(
      JSON.stringify({
        success: true,
        purchase_id,
        items_added: itemsToInsert.length,
        chickens_added: chickensToAdd,
        items: itemsToInsert
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-store-purchase function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

