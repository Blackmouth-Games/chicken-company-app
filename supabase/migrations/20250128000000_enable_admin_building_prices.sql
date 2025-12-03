-- Enable admin access to building_prices table
-- This migration creates RLS policies that allow users with admin role to manage building_prices

-- First, ensure RLS is enabled
ALTER TABLE building_prices ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Admins can view building_prices" ON building_prices;
DROP POLICY IF EXISTS "Admins can insert building_prices" ON building_prices;
DROP POLICY IF EXISTS "Admins can update building_prices" ON building_prices;
DROP POLICY IF EXISTS "Admins can delete building_prices" ON building_prices;
DROP POLICY IF EXISTS "Public can view building_prices" ON building_prices;

-- Allow admins to view building_prices
CREATE POLICY "Admins can view building_prices"
ON building_prices
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Allow admins to insert building_prices
CREATE POLICY "Admins can insert building_prices"
ON building_prices
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Allow admins to update building_prices
CREATE POLICY "Admins can update building_prices"
ON building_prices
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

-- Allow admins to delete building_prices
CREATE POLICY "Admins can delete building_prices"
ON building_prices
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Allow public to view building_prices (for game functionality)
CREATE POLICY "Public can view building_prices"
ON building_prices
FOR SELECT
USING (true);

