-- Update all building prices to 0.001 TON
UPDATE public.building_prices
SET price_ton = 0.001,
    updated_at = now();

-- Update all store product prices to 0.001 TON
UPDATE public.store_products
SET price_ton = 0.001,
    updated_at = now();

COMMENT ON TABLE public.building_prices IS 'Updated all prices to 0.001 TON for testing';
COMMENT ON TABLE public.store_products IS 'Updated all prices to 0.001 TON for testing';
