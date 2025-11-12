-- Update all building skins so that every level's variant "A" is marked as default
-- This ensures that each building level has its default skin (variant A)

-- Update corral skins
UPDATE public.building_skins
SET is_default = true
WHERE building_type = 'corral' 
  AND skin_key LIKE 'corral_%A'
  AND skin_key ~ '^corral_\d+A$';

-- Update warehouse skins
UPDATE public.building_skins
SET is_default = true
WHERE building_type = 'warehouse' 
  AND skin_key LIKE 'warehouse_%A'
  AND skin_key ~ '^warehouse_\d+A$';

-- Update market skins
UPDATE public.building_skins
SET is_default = true
WHERE building_type = 'market' 
  AND skin_key LIKE 'market_%A'
  AND skin_key ~ '^market_\d+A$';

-- Update house skins (only level 1 has variant A)
UPDATE public.building_skins
SET is_default = true
WHERE building_type = 'house' 
  AND skin_key = 'house_1A';

-- Set all non-A variants to false
UPDATE public.building_skins
SET is_default = false
WHERE (building_type = 'corral' AND skin_key ~ '^corral_\d+[BC]$')
   OR (building_type = 'warehouse' AND skin_key ~ '^warehouse_\d+[BC]$')
   OR (building_type = 'market' AND skin_key ~ '^market_\d+[BC]$')
   OR (building_type = 'house' AND skin_key ~ '^house_\d+[BC]$');

