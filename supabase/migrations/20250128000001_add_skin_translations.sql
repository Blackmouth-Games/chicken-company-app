-- Add multi-language support for skin names
-- Create a table to store translations for skin names

CREATE TABLE IF NOT EXISTS skin_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skin_id UUID NOT NULL REFERENCES building_skins(id) ON DELETE CASCADE,
  language_code VARCHAR(10) NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(skin_id, language_code)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_skin_translations_skin_id ON skin_translations(skin_id);
CREATE INDEX IF NOT EXISTS idx_skin_translations_language ON skin_translations(language_code);

-- Enable RLS
ALTER TABLE skin_translations ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage translations
CREATE POLICY "Admins can view skin_translations"
ON skin_translations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can insert skin_translations"
ON skin_translations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can update skin_translations"
ON skin_translations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can delete skin_translations"
ON skin_translations
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Allow public to view translations (for game functionality)
CREATE POLICY "Public can view skin_translations"
ON skin_translations
FOR SELECT
USING (true);

-- Add RLS policies for building_skins if they don't exist
ALTER TABLE building_skins ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view building_skins" ON building_skins;
DROP POLICY IF EXISTS "Admins can insert building_skins" ON building_skins;
DROP POLICY IF EXISTS "Admins can update building_skins" ON building_skins;
DROP POLICY IF EXISTS "Admins can delete building_skins" ON building_skins;
DROP POLICY IF EXISTS "Public can view building_skins" ON building_skins;

-- Allow admins to manage building_skins
CREATE POLICY "Admins can view building_skins"
ON building_skins
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can insert building_skins"
ON building_skins
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can update building_skins"
ON building_skins
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can delete building_skins"
ON building_skins
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Allow public to view building_skins (for game functionality)
CREATE POLICY "Public can view building_skins"
ON building_skins
FOR SELECT
USING (true);

