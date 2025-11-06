-- Create building prices table
CREATE TABLE public.building_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  building_type TEXT NOT NULL,
  level INTEGER NOT NULL,
  price_ton DECIMAL(10, 4) NOT NULL,
  capacity INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(building_type, level)
);

-- Enable RLS
ALTER TABLE public.building_prices ENABLE ROW LEVEL SECURITY;

-- Everyone can view prices
CREATE POLICY "Building prices are viewable by everyone"
  ON public.building_prices
  FOR SELECT
  USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_building_prices_updated_at
  BEFORE UPDATE ON public.building_prices
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert initial prices for corrales (levels 1-10)
INSERT INTO public.building_prices (building_type, level, price_ton, capacity) VALUES
  ('corral', 1, 0.1, 50),
  ('corral', 2, 0.2, 100),
  ('corral', 3, 0.4, 200),
  ('corral', 4, 0.8, 400),
  ('corral', 5, 1.5, 750),
  ('corral', 6, 3.0, 1500),
  ('corral', 7, 6.0, 3000),
  ('corral', 8, 12.0, 6000),
  ('corral', 9, 24.0, 12000),
  ('corral', 10, 50.0, 25000);

-- Insert initial prices for market (future use)
INSERT INTO public.building_prices (building_type, level, price_ton, capacity) VALUES
  ('market', 1, 1.0, 0),
  ('market', 2, 2.0, 0),
  ('market', 3, 4.0, 0);

-- Insert initial prices for warehouse (future use)
INSERT INTO public.building_prices (building_type, level, price_ton, capacity) VALUES
  ('warehouse', 1, 0.5, 100),
  ('warehouse', 2, 1.0, 250),
  ('warehouse', 3, 2.0, 500);

-- Create index for faster queries
CREATE INDEX idx_building_prices_type_level ON public.building_prices(building_type, level);

-- Create purchases table to track all TON transactions
CREATE TABLE public.building_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  building_id UUID REFERENCES public.user_buildings(id) ON DELETE SET NULL,
  building_type TEXT NOT NULL,
  level INTEGER NOT NULL,
  price_ton DECIMAL(10, 4) NOT NULL,
  transaction_hash TEXT,
  wallet_address TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.building_purchases ENABLE ROW LEVEL SECURITY;

-- Users can view their own purchases
CREATE POLICY "Users can view their own purchases"
  ON public.building_purchases
  FOR SELECT
  USING (user_id IN (SELECT id FROM public.profiles WHERE telegram_id IS NOT NULL));

-- Users can insert their own purchases
CREATE POLICY "Users can insert their own purchases"
  ON public.building_purchases
  FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE telegram_id IS NOT NULL));

-- Users can update their own purchases
CREATE POLICY "Users can update their own purchases"
  ON public.building_purchases
  FOR UPDATE
  USING (user_id IN (SELECT id FROM public.profiles WHERE telegram_id IS NOT NULL));

-- Create index for faster queries
CREATE INDEX idx_building_purchases_user_id ON public.building_purchases(user_id);
CREATE INDEX idx_building_purchases_status ON public.building_purchases(status);