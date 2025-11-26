-- Migration: Rename 'corral' to 'coop' in building_type enum and all related data
-- IMPORTANT: This must be run in two parts due to PostgreSQL enum limitations
-- Part 1: Add 'coop' to enum and commit
-- Part 2: Update data and recreate enum

-- ============================================
-- PART 1: Add 'coop' to the enum (must commit first)
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'coop' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'building_type')
    ) THEN
        ALTER TYPE building_type ADD VALUE 'coop';
    END IF;
END $$;

-- Commit to make 'coop' available for use
COMMIT;

-- ============================================
-- PART 2: Update all data and recreate enum
-- ============================================
BEGIN;

-- Step 1: Update all existing data to use 'coop'
UPDATE user_buildings
SET building_type = 'coop'
WHERE building_type = 'corral';

UPDATE building_skins
SET building_type = 'coop'
WHERE building_type = 'corral';

UPDATE building_prices
SET building_type = 'coop'
WHERE building_type = 'corral';

-- Step 2: Update skin_keys from 'corral_X' to 'coop_X' in building_skins
UPDATE building_skins
SET skin_key = REPLACE(skin_key, 'corral_', 'coop_')
WHERE skin_key LIKE 'corral_%';

-- Step 3: Update item_key in user_items from 'corral' to 'coop'
UPDATE user_items
SET item_key = 'coop'
WHERE item_type = 'building' AND item_key = 'corral';

UPDATE user_items
SET item_key = REPLACE(item_key, 'corral_', 'coop_')
WHERE item_type = 'skin' AND item_key LIKE 'corral_%';

-- Step 4: Remove 'corral' from enum by recreating it
DO $$
DECLARE
    corral_count INTEGER;
BEGIN
    -- Count records with 'corral' in each table separately
    SELECT 
        (SELECT COUNT(*) FROM user_buildings WHERE building_type::text = 'corral') +
        (SELECT COUNT(*) FROM building_skins WHERE building_type::text = 'corral') +
        (SELECT COUNT(*) FROM building_prices WHERE building_type::text = 'corral')
    INTO corral_count;
    
    IF corral_count = 0 THEN
        -- Step 1: Remove defaults before changing type
        ALTER TABLE user_buildings ALTER COLUMN building_type DROP DEFAULT;
        ALTER TABLE building_skins ALTER COLUMN building_type DROP DEFAULT;
        ALTER TABLE building_prices ALTER COLUMN building_type DROP DEFAULT;
        
        -- Step 2: Rename the old enum
        ALTER TYPE building_type RENAME TO building_type_old;
        
        -- Step 3: Create new enum without 'corral' but with all other values
        CREATE TYPE building_type AS ENUM ('coop', 'market', 'warehouse', 'house');
        
        -- Step 4: Update all columns to use the new enum
        ALTER TABLE user_buildings 
            ALTER COLUMN building_type TYPE building_type 
            USING building_type::text::building_type;
        
        ALTER TABLE building_skins 
            ALTER COLUMN building_type TYPE building_type 
            USING building_type::text::building_type;
        
        ALTER TABLE building_prices 
            ALTER COLUMN building_type TYPE building_type 
            USING building_type::text::building_type;
        
        -- Step 5: Restore defaults if they existed (adjust as needed)
        -- ALTER TABLE user_buildings ALTER COLUMN building_type SET DEFAULT 'coop';
        -- ALTER TABLE building_skins ALTER COLUMN building_type SET DEFAULT 'coop';
        -- ALTER TABLE building_prices ALTER COLUMN building_type SET DEFAULT 'coop';
        
        -- Step 6: Drop the old enum
        DROP TYPE building_type_old;
        
        RAISE NOTICE 'Successfully removed corral from enum';
    ELSE
        RAISE EXCEPTION 'Cannot remove corral from enum: % records still use it', corral_count;
    END IF;
END $$;

COMMIT;
