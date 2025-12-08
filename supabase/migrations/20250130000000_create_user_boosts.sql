-- Migration: Create user_boosts table for temporary bonuses
-- Boosts from minigames that reduce company fee (20% → 7%)

-- Step 1: Create user_boosts table
CREATE TABLE IF NOT EXISTS public.user_boosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  boost_type text NOT NULL,           -- 'fee_reduction', 'production_boost', etc.
  boost_value numeric NOT NULL,       -- For fee_reduction: 0.01 to 0.13 (1% to 13%)
  source text NOT NULL,               -- 'minigame', 'referral', 'promotion', etc.
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,    -- When the boost expires
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb,                     -- Extra data (minigame score, etc.)
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT user_boosts_boost_type_check CHECK (boost_type IN ('fee_reduction', 'production_boost')),
  CONSTRAINT user_boosts_fee_reduction_check CHECK (
    boost_type != 'fee_reduction' OR (boost_value >= 0 AND boost_value <= 0.13)
  )
);

-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_user_boosts_user_id ON public.user_boosts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_boosts_active ON public.user_boosts(user_id, is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_user_boosts_type ON public.user_boosts(boost_type);
CREATE INDEX IF NOT EXISTS idx_user_boosts_expires ON public.user_boosts(expires_at);

-- Step 3: Enable RLS
ALTER TABLE public.user_boosts ENABLE ROW LEVEL SECURITY;

-- Step 4: RLS Policies
-- Users can view their own boosts
CREATE POLICY "Users can view their own boosts"
ON public.user_boosts
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can insert their own boosts (from minigame)
CREATE POLICY "Users can insert their own boosts"
ON public.user_boosts
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Admins can manage all boosts
CREATE POLICY "Admins can manage all boosts"
ON public.user_boosts
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Step 5: Function to get active fee reduction for a user
CREATE OR REPLACE FUNCTION get_user_fee_reduction(p_user_id uuid)
RETURNS numeric AS $$
DECLARE
  v_total_reduction numeric := 0;
  v_max_reduction numeric := 0.13;  -- Max 13% reduction (20% → 7%)
BEGIN
  -- Sum all active fee_reduction boosts
  SELECT COALESCE(SUM(boost_value), 0)
  INTO v_total_reduction
  FROM public.user_boosts
  WHERE user_id = p_user_id
    AND boost_type = 'fee_reduction'
    AND is_active = true
    AND expires_at > now();
  
  -- Cap at max reduction
  RETURN LEAST(v_total_reduction, v_max_reduction);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Step 6: Function to add a boost from minigame
CREATE OR REPLACE FUNCTION add_minigame_boost(
  p_user_id uuid,
  p_boost_value numeric,      -- 0.01 to 0.13
  p_duration_minutes integer  -- Duration in minutes
)
RETURNS uuid AS $$
DECLARE
  v_boost_id uuid;
BEGIN
  -- Validate boost value
  IF p_boost_value < 0 OR p_boost_value > 0.13 THEN
    RAISE EXCEPTION 'Boost value must be between 0 and 0.13';
  END IF;
  
  -- Insert boost
  INSERT INTO public.user_boosts (
    user_id,
    boost_type,
    boost_value,
    source,
    expires_at,
    metadata
  ) VALUES (
    p_user_id,
    'fee_reduction',
    p_boost_value,
    'minigame',
    now() + (p_duration_minutes || ' minutes')::interval,
    jsonb_build_object('duration_minutes', p_duration_minutes)
  )
  RETURNING id INTO v_boost_id;
  
  RETURN v_boost_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Function to cleanup expired boosts (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_boosts()
RETURNS integer AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.user_boosts
  SET is_active = false
  WHERE is_active = true
    AND expires_at <= now();
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_fee_reduction(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION add_minigame_boost(uuid, numeric, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_boosts() TO authenticated;

-- Comments
COMMENT ON TABLE public.user_boosts IS 'Temporary boosts from minigames and other sources';
COMMENT ON COLUMN public.user_boosts.boost_type IS 'Type of boost: fee_reduction (reduces company fee), production_boost (increases egg production)';
COMMENT ON COLUMN public.user_boosts.boost_value IS 'For fee_reduction: decimal reduction (0.05 = 5% reduction). Max total: 0.13 (13%)';
COMMENT ON FUNCTION get_user_fee_reduction(uuid) IS 'Returns total active fee reduction for a user (capped at 0.13)';
COMMENT ON FUNCTION add_minigame_boost(uuid, numeric, integer) IS 'Adds a temporary boost from minigame with specified duration';



