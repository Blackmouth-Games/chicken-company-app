-- Update all store product prices to 0.001 TON
UPDATE store_products
SET price_ton = 0.001,
    updated_at = NOW()
WHERE is_active = true;

