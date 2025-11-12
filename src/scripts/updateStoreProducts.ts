import { supabase } from "@/integrations/supabase/client";

/**
 * Script to update store product image URLs only
 * All product data (name, description, price, content_items) should be managed in the database via migrations
 * This script only updates image URLs for existing products
 */
export async function updateStoreProducts() {
  console.log("Updating store product images...");

  // Update Starter Pack images
  await supabase
    .from("store_products")
    .update({
      store_image_url: "/images/store/starter-pack.png",
      detail_image_url: "/images/store/starter-pack-detail.png",
    })
    .eq("product_key", "starter_pack");

  // Update Christmas Pack images
  await supabase
    .from("store_products")
    .update({
      store_image_url: "/images/store/christmas-pack.png",
      detail_image_url: "/images/store/christmas-pack-detail.png",
    })
    .eq("product_key", "christmas_pack");

  // Update Winter Chickens images
  await supabase
    .from("store_products")
    .update({
      store_image_url: "/images/store/winter-chickens.png",
      detail_image_url: "/images/store/winter-chickens-detail.png",
    })
    .eq("product_key", "winter_chickens");

  // Update Support Builders images
  await supabase
    .from("store_products")
    .update({
      store_image_url: "/images/store/support-builders.png",
      detail_image_url: "/images/store/support-builders-detail.png",
    })
    .eq("product_key", "support_builders");

  // Update Basic Skins Pack images
  await supabase
    .from("store_products")
    .update({
      store_image_url: "/images/store/skins-pack.png",
      detail_image_url: "/images/store/skins-pack-detail.png",
    })
    .eq("product_key", "basic_skins_pack");

  console.log("Store product images updated successfully!");
}
