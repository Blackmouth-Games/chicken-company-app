-- Create store_purchases table to track product purchases
CREATE TABLE IF NOT EXISTS public.store_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID NOT NULL,
  product_key TEXT NOT NULL,
  price_ton NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  wallet_address TEXT,
  transaction_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB
);

-- Enable RLS
ALTER TABLE public.store_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own purchases"
  ON public.store_purchases
  FOR SELECT
  USING (user_id IN (
    SELECT id FROM profiles WHERE telegram_id IS NOT NULL
  ));

CREATE POLICY "Users can insert their own purchases"
  ON public.store_purchases
  FOR INSERT
  WITH CHECK (user_id IN (
    SELECT id FROM profiles WHERE telegram_id IS NOT NULL
  ));

CREATE POLICY "Users can update their own purchases"
  ON public.store_purchases
  FOR UPDATE
  USING (user_id IN (
    SELECT id FROM profiles WHERE telegram_id IS NOT NULL
  ));

-- Create index for better performance
CREATE INDEX idx_store_purchases_user_id ON public.store_purchases(user_id);
CREATE INDEX idx_store_purchases_status ON public.store_purchases(status);
CREATE INDEX idx_store_purchases_product_key ON public.store_purchases(product_key);

COMMENT ON TABLE public.store_purchases IS 'Tracks store product purchases with TON payments';
