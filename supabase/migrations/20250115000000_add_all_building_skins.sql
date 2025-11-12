-- Add all building skins for all levels and variants
-- This migration adds all available skins based on the local image assets

-- Corral (Coop) skins - Levels 1-5, Variants A and B
INSERT INTO public.building_skins (building_type, skin_key, name, image_url, is_default, rarity) VALUES
-- Level 1
('corral', 'corral_1A', 'Corral Nivel 1 - Variante A', '🏚️', false, 'common'),
('corral', 'corral_1B', 'Corral Nivel 1 - Variante B', '🏚️', false, 'common'),
-- Level 2
('corral', 'corral_2A', 'Corral Nivel 2 - Variante A', '🏚️', false, 'uncommon'),
('corral', 'corral_2B', 'Corral Nivel 2 - Variante B', '🏚️', false, 'uncommon'),
-- Level 3
('corral', 'corral_3A', 'Corral Nivel 3 - Variante A', '🏚️', false, 'rare'),
('corral', 'corral_3B', 'Corral Nivel 3 - Variante B', '🏚️', false, 'rare'),
-- Level 4
('corral', 'corral_4A', 'Corral Nivel 4 - Variante A', '🏚️', false, 'epic'),
('corral', 'corral_4B', 'Corral Nivel 4 - Variante B', '🏚️', false, 'epic'),
-- Level 5
('corral', 'corral_5A', 'Corral Nivel 5 - Variante A', '🏚️', false, 'legendary'),
('corral', 'corral_5B', 'Corral Nivel 5 - Variante B', '🏚️', false, 'legendary')
ON CONFLICT (skin_key) DO NOTHING;

-- Warehouse skins - Levels 1-5, Variants A and B (Level 1 has both, others only A)
INSERT INTO public.building_skins (building_type, skin_key, name, image_url, is_default, rarity) VALUES
-- Level 1
('warehouse', 'warehouse_1A', 'Almacén Nivel 1 - Variante A', '🏭', true, 'common'),
('warehouse', 'warehouse_1B', 'Almacén Nivel 1 - Variante B', '🏭', false, 'common'),
-- Level 2
('warehouse', 'warehouse_2A', 'Almacén Nivel 2 - Variante A', '🏭', false, 'uncommon'),
-- Level 3
('warehouse', 'warehouse_3A', 'Almacén Nivel 3 - Variante A', '🏭', false, 'rare'),
-- Level 4
('warehouse', 'warehouse_4A', 'Almacén Nivel 4 - Variante A', '🏭', false, 'epic'),
-- Level 5
('warehouse', 'warehouse_5A', 'Almacén Nivel 5 - Variante A', '🏭', false, 'legendary')
ON CONFLICT (skin_key) DO NOTHING;

-- Market skins - Levels 1-5, Variants A and B
INSERT INTO public.building_skins (building_type, skin_key, name, image_url, is_default, rarity) VALUES
-- Level 1
('market', 'market_1A', 'Mercado Nivel 1 - Variante A', '🏪', true, 'common'),
('market', 'market_1B', 'Mercado Nivel 1 - Variante B', '🏪', false, 'common'),
-- Level 2
('market', 'market_2A', 'Mercado Nivel 2 - Variante A', '🏪', false, 'uncommon'),
('market', 'market_2B', 'Mercado Nivel 2 - Variante B', '🏪', false, 'uncommon'),
-- Level 3
('market', 'market_3A', 'Mercado Nivel 3 - Variante A', '🏪', false, 'rare'),
('market', 'market_3B', 'Mercado Nivel 3 - Variante B', '🏪', false, 'rare'),
-- Level 4
('market', 'market_4A', 'Mercado Nivel 4 - Variante A', '🏪', false, 'epic'),
('market', 'market_4B', 'Mercado Nivel 4 - Variante B', '🏪', false, 'epic'),
-- Level 5
('market', 'market_5A', 'Mercado Nivel 5 - Variante A', '🏪', false, 'legendary'),
('market', 'market_5B', 'Mercado Nivel 5 - Variante B', '🏪', false, 'legendary')
ON CONFLICT (skin_key) DO NOTHING;

-- House skins - Level 1 has variants A, B, and C
INSERT INTO public.building_skins (building_type, skin_key, name, image_url, is_default, rarity) VALUES
-- Level 1
('house', 'house_1A', 'Casa Nivel 1 - Variante A', '🏠', true, 'common'),
('house', 'house_1B', 'Casa Nivel 1 - Variante B', '🏠', false, 'common'),
('house', 'house_1C', 'Casa Nivel 1 - Variante C', '🏠', false, 'common')
ON CONFLICT (skin_key) DO NOTHING;

-- Update the mapping in buildingImages.ts to support these new skin_keys
-- The mapping will be: {building_type}_{level}{variant} -> local image

