-- Fix RLS policies for building_skins and add unique index on skin_key
ALTER TABLE public.building_skins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can insert building skins" ON public.building_skins;
DROP POLICY IF EXISTS "Admins can update building skins" ON public.building_skins;
DROP POLICY IF EXISTS "Admins can delete building skins" ON public.building_skins;

CREATE POLICY "Admins can insert building skins"
ON public.building_skins
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update building skins"
ON public.building_skins
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete building skins"
ON public.building_skins
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Ensure skin_key is unique for upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
      AND indexname = 'building_skins_skin_key_unique_idx'
  ) THEN
    CREATE UNIQUE INDEX building_skins_skin_key_unique_idx ON public.building_skins (skin_key);
  END IF;
END$$;

-- Keep updated_at in sync on updates
DROP TRIGGER IF EXISTS set_building_skins_updated_at ON public.building_skins;
CREATE TRIGGER set_building_skins_updated_at
BEFORE UPDATE ON public.building_skins
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();