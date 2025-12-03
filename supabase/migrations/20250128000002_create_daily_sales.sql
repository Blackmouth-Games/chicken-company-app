-- Create table to store daily sales by type
CREATE TABLE IF NOT EXISTS daily_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  sale_type VARCHAR(50) NOT NULL, -- 'building' or 'store'
  sale_category VARCHAR(100), -- For buildings: 'coop_1', 'warehouse_2', etc. For store: product_key
  building_type VARCHAR(50), -- For building sales: 'coop', 'warehouse', 'market'
  building_level INTEGER, -- For building sales: level
  product_key VARCHAR(100), -- For store sales: product_key
  total_sales INTEGER NOT NULL DEFAULT 0, -- Number of sales
  total_revenue NUMERIC(18, 9) NOT NULL DEFAULT 0, -- Total revenue in TON
  completed_sales INTEGER NOT NULL DEFAULT 0, -- Number of completed sales
  completed_revenue NUMERIC(18, 9) NOT NULL DEFAULT 0, -- Revenue from completed sales
  pending_sales INTEGER NOT NULL DEFAULT 0, -- Number of pending sales
  failed_sales INTEGER NOT NULL DEFAULT 0, -- Number of failed sales
  cancelled_sales INTEGER NOT NULL DEFAULT 0, -- Number of cancelled sales
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date, sale_type, sale_category)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_daily_sales_date ON daily_sales(date);
CREATE INDEX IF NOT EXISTS idx_daily_sales_type ON daily_sales(sale_type);
CREATE INDEX IF NOT EXISTS idx_daily_sales_category ON daily_sales(sale_category);
CREATE INDEX IF NOT EXISTS idx_daily_sales_date_type ON daily_sales(date, sale_type);

-- Enable RLS
ALTER TABLE daily_sales ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage daily_sales
CREATE POLICY "Admins can view daily_sales"
ON daily_sales
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can insert daily_sales"
ON daily_sales
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can update daily_sales"
ON daily_sales
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

CREATE POLICY "Admins can delete daily_sales"
ON daily_sales
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Allow public to view daily_sales (for potential future analytics)
CREATE POLICY "Public can view daily_sales"
ON daily_sales
FOR SELECT
USING (true);

