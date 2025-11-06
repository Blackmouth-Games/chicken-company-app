-- Create building types enum
CREATE TYPE building_type AS ENUM ('corral', 'market', 'warehouse');

-- Create table for user buildings (corrales)
CREATE TABLE public.user_buildings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  building_type building_type NOT NULL DEFAULT 'corral',
  level INTEGER NOT NULL DEFAULT 1,
  position_index INTEGER NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 50,
  current_chickens INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, position_index)
);

-- Enable RLS
ALTER TABLE public.user_buildings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own buildings"
  ON public.user_buildings
  FOR SELECT
  USING (user_id IN (SELECT id FROM public.profiles WHERE telegram_id IS NOT NULL));

CREATE POLICY "Users can insert their own buildings"
  ON public.user_buildings
  FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE telegram_id IS NOT NULL));

CREATE POLICY "Users can update their own buildings"
  ON public.user_buildings
  FOR UPDATE
  USING (user_id IN (SELECT id FROM public.profiles WHERE telegram_id IS NOT NULL));

CREATE POLICY "Users can delete their own buildings"
  ON public.user_buildings
  FOR DELETE
  USING (user_id IN (SELECT id FROM public.profiles WHERE telegram_id IS NOT NULL));

-- Create trigger for updated_at
CREATE TRIGGER update_user_buildings_updated_at
  BEFORE UPDATE ON public.user_buildings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create index for faster queries
CREATE INDEX idx_user_buildings_user_id ON public.user_buildings(user_id);
CREATE INDEX idx_user_buildings_type ON public.user_buildings(building_type);