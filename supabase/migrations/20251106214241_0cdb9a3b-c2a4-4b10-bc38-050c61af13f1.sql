-- Add new metric types for building purchases
ALTER TYPE metric_type ADD VALUE IF NOT EXISTS 'building_purchased';
ALTER TYPE metric_type ADD VALUE IF NOT EXISTS 'ton_payment_initiated';
ALTER TYPE metric_type ADD VALUE IF NOT EXISTS 'ton_payment_completed';
ALTER TYPE metric_type ADD VALUE IF NOT EXISTS 'building_upgraded';