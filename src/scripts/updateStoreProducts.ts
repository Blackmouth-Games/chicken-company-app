import { supabase } from "@/integrations/supabase/client";

/**
 * Script to update store products with new image URLs and add the skins pack
 * Run this once to fix the product images
 */
export async function updateStoreProducts() {
  console.log("Updating store products...");

  // Update Starter Pack
  await supabase
    .from("store_products")
    .update({
      store_image_url: "/images/store/starter-pack.png",
      detail_image_url: "/images/store/starter-pack-detail.png",
    })
    .eq("product_key", "starter_pack");

  // Update Christmas Pack
  await supabase
    .from("store_products")
    .update({
      store_image_url: "/images/store/christmas-pack.png",
      detail_image_url: "/images/store/christmas-pack-detail.png",
    })
    .eq("product_key", "christmas_pack");

  // Update Winter Chickens
  await supabase
    .from("store_products")
    .update({
      store_image_url: "/images/store/winter-chickens.png",
      detail_image_url: "/images/store/winter-chickens-detail.png",
    })
    .eq("product_key", "winter_chickens");

  // Update Support Builders
  await supabase
    .from("store_products")
    .update({
      store_image_url: "/images/store/support-builders.png",
      detail_image_url: "/images/store/support-builders-detail.png",
    })
    .eq("product_key", "support_builders");

  // Check if basic skins pack already exists
  const { data: existing } = await supabase
    .from("store_products")
    .select("id")
    .eq("product_key", "basic_skins_pack")
    .single();

  // Insert the new skins pack product if it doesn't exist
  if (!existing) {
    await supabase.from("store_products").insert({
      product_key: "basic_skins_pack",
      name: "Pack de Skins Básico",
      description: "Colección de 5 skins únicos para tus edificios",
      price_ton: 0.5,
      content_items: [
        "skin_corral_red",
        "skin_corral_blue",
        "skin_corral_green",
        "skin_warehouse_premium",
        "skin_market_deluxe",
      ],
      store_image_url: "/images/store/skins-pack.png",
      detail_image_url: "/images/store/skins-pack-detail.png",
      is_active: true,
      sort_order: 5,
    });
  }

  console.log("Store products updated successfully!");
}
