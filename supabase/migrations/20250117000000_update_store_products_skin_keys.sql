-- Update store products to use actual skin_key format instead of placeholder keys
-- This migration updates the basic_skins_pack product to use real skin_keys

-- Update basic_skins_pack content_items to use actual skin_keys
UPDATE public.store_products
SET content_items = ARRAY[
  'corral_1B',      -- Corral Level 1 Variant B
  'corral_2B',      -- Corral Level 2 Variant B
  'corral_3B',      -- Corral Level 3 Variant B
  'warehouse_1B',   -- Warehouse Level 1 Variant B
  'market_1B'       -- Market Level 1 Variant B
]
WHERE product_key = 'basic_skins_pack'
  AND (
    -- Only update if it still has old format
    content_items @> ARRAY['skin_corral_red']::text[]
    OR content_items @> ARRAY['skin_corral_blue']::text[]
    OR content_items @> ARRAY['skin_corral_green']::text[]
    OR content_items @> ARRAY['skin_warehouse_premium']::text[]
    OR content_items @> ARRAY['skin_market_deluxe']::text[]
  );

-- Add comment for documentation
COMMENT ON COLUMN public.store_products.content_items IS 
'Array of content items. For skins, use the actual skin_key format (e.g., "corral_1B", "warehouse_2A") that matches the building_skins.skin_key column. Other items can be descriptive strings like "Nuevo corral" or "Subida de nivel".';

