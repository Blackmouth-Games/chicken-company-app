-- Create building_skins table to store available skins
CREATE TABLE public.building_skins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  building_type text NOT NULL,
  skin_key text NOT NULL UNIQUE,
  name text NOT NULL,
  image_url text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  rarity text DEFAULT 'common',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_items table to store user's inventory
CREATE TABLE public.user_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item_type text NOT NULL, -- 'skin', 'boost', etc
  item_key text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  acquired_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_type, item_key)
);

-- Add selected_skin column to user_buildings
ALTER TABLE public.user_buildings
ADD COLUMN selected_skin text DEFAULT NULL;

-- Enable RLS
ALTER TABLE public.building_skins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for building_skins (viewable by everyone)
CREATE POLICY "Building skins are viewable by everyone"
ON public.building_skins
FOR SELECT
USING (true);

-- RLS policies for user_items
CREATE POLICY "Users can view their own items"
ON public.user_items
FOR SELECT
USING (user_id IN (SELECT id FROM profiles WHERE telegram_id IS NOT NULL));

CREATE POLICY "Users can insert their own items"
ON public.user_items
FOR INSERT
WITH CHECK (user_id IN (SELECT id FROM profiles WHERE telegram_id IS NOT NULL));

CREATE POLICY "Users can update their own items"
ON public.user_items
FOR UPDATE
USING (user_id IN (SELECT id FROM profiles WHERE telegram_id IS NOT NULL));

-- Insert default skins for each building type
INSERT INTO public.building_skins (building_type, skin_key, name, image_url, is_default, rarity) VALUES
('corral', 'corral_default', 'Corral Clásico', '🏚️', true, 'common'),
('corral', 'corral_premium', 'Corral Premium', '🏡', false, 'rare'),
('corral', 'corral_luxury', 'Corral de Lujo', '🏰', false, 'epic'),
('warehouse', 'warehouse_default', 'Almacén Básico', '🏭', true, 'common'),
('warehouse', 'warehouse_modern', 'Almacén Moderno', '🏢', false, 'rare'),
('market', 'market_default', 'Market Básico', '🏪', true, 'common'),
('market', 'market_premium', 'Market Premium', '🏬', false, 'rare');

-- Trigger for updated_at
CREATE TRIGGER update_building_skins_updated_at
BEFORE UPDATE ON public.building_skins
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();