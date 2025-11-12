-- Add RLS policies for building_skins to allow INSERT and UPDATE operations

-- Allow INSERT for building_skins
CREATE POLICY "Building skins can be inserted by anyone"
ON public.building_skins
FOR INSERT
WITH CHECK (true);

-- Allow UPDATE for building_skins  
CREATE POLICY "Building skins can be updated by anyone"
ON public.building_skins
FOR UPDATE
USING (true)
WITH CHECK (true);