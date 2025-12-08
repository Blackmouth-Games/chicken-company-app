-- Migration: Create staking epochs tables and add egg event types
-- This migration creates the staking epochs system for reward distribution

-- Step 1: Add new event types to metric_type enum
DO $$ 
BEGIN
    -- Add eggs_produced_batch if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'eggs_produced_batch' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'metric_type')
    ) THEN
        ALTER TYPE metric_type ADD VALUE 'eggs_produced_batch';
    END IF;

    -- Add eggs_market_batch if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'eggs_market_batch' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'metric_type')
    ) THEN
        ALTER TYPE metric_type ADD VALUE 'eggs_market_batch';
    END IF;
END $$;

-- Step 2: Create staking_epochs table
CREATE TABLE IF NOT EXISTS public.staking_epochs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  epoch_number integer NOT NULL,
  epoch_start timestamptz NOT NULL,
  epoch_end timestamptz NOT NULL,
  total_rewards_ton numeric NOT NULL DEFAULT 0,      -- TON recibidos del Distributor para este epoch
  merkle_root text,                                  -- se rellenará después de generar el Merkle
  status text NOT NULL DEFAULT 'pending',            -- 'pending' | 'root_published' | 'closed'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT staking_epochs_epoch_number_key UNIQUE (epoch_number),
  CONSTRAINT staking_epochs_status_check CHECK (status IN ('pending', 'root_published', 'closed'))
);

-- Step 3: Create staking_epoch_allocations table
CREATE TABLE IF NOT EXISTS public.staking_epoch_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  epoch_id uuid NOT NULL REFERENCES public.staking_epochs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  wallet_address text NOT NULL,
  eggs_produced bigint NOT NULL DEFAULT 0,
  eggs_market bigint NOT NULL DEFAULT 0,
  efficiency numeric NOT NULL DEFAULT 0,        -- 0..1 (eggs_market / eggs_produced)
  weight numeric NOT NULL DEFAULT 0,            -- eficiencia * stake_user (por ahora stake_user=1)
  reward_share numeric NOT NULL DEFAULT 0,       -- weight / Σweight
  reward_ton numeric NOT NULL DEFAULT 0,        -- cantidad TON asignada a este usuario
  merkle_leaf_hash text NOT NULL,               -- hash hoja del Merkle (wallet + reward)
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT staking_epoch_allocations_epoch_user_key UNIQUE (epoch_id, user_id),
  CONSTRAINT staking_epoch_allocations_efficiency_check CHECK (efficiency >= 0 AND efficiency <= 1),
  CONSTRAINT staking_epoch_allocations_weight_check CHECK (weight >= 0),
  CONSTRAINT staking_epoch_allocations_reward_share_check CHECK (reward_share >= 0 AND reward_share <= 1)
);

-- Step 4: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_staking_epochs_status ON public.staking_epochs(status);
CREATE INDEX IF NOT EXISTS idx_staking_epochs_epoch_number ON public.staking_epochs(epoch_number);
CREATE INDEX IF NOT EXISTS idx_staking_epochs_epoch_start ON public.staking_epochs(epoch_start);
CREATE INDEX IF NOT EXISTS idx_staking_epoch_allocations_epoch_id ON public.staking_epoch_allocations(epoch_id);
CREATE INDEX IF NOT EXISTS idx_staking_epoch_allocations_user_id ON public.staking_epoch_allocations(user_id);
CREATE INDEX IF NOT EXISTS idx_staking_epoch_allocations_wallet ON public.staking_epoch_allocations(wallet_address);

-- Step 5: Enable RLS on new tables
ALTER TABLE public.staking_epochs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staking_epoch_allocations ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies for staking_epochs
-- Admins can manage epochs
CREATE POLICY "Admins can manage staking epochs"
ON public.staking_epochs
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

-- Public can view epochs
CREATE POLICY "Public can view staking epochs"
ON public.staking_epochs
FOR SELECT
TO public
USING (true);

-- Step 7: Create RLS policies for staking_epoch_allocations
-- Admins can manage allocations
CREATE POLICY "Admins can manage staking epoch allocations"
ON public.staking_epoch_allocations
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

-- Users can view their own allocations
CREATE POLICY "Users can view their own allocations"
ON public.staking_epoch_allocations
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Public can view allocations (for transparency)
CREATE POLICY "Public can view staking epoch allocations"
ON public.staking_epoch_allocations
FOR SELECT
TO public
USING (true);

-- Step 8: Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_staking_epochs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_staking_epochs_updated_at
  BEFORE UPDATE ON public.staking_epochs
  FOR EACH ROW
  EXECUTE FUNCTION update_staking_epochs_updated_at();

-- Step 9: Create function to calculate epoch allocations from metric_events
-- Uses user_wallets table to get TON wallet addresses (not profiles.wallet_address)
CREATE OR REPLACE FUNCTION calculate_epoch_allocations(
  p_epoch_id uuid,
  p_total_rewards_ton numeric
)
RETURNS TABLE (
  user_id uuid,
  wallet_address text,
  eggs_produced bigint,
  eggs_market bigint,
  efficiency numeric,
  weight numeric,
  reward_share numeric,
  reward_ton numeric
) AS $$
DECLARE
  total_weight numeric := 0;
BEGIN
  -- Calculate eggs produced and eggs market per user for the epoch period
  -- Uses fn_epoch_eggs to get aggregated data with correct wallet addresses from user_wallets
  WITH epoch_period AS (
    SELECT epoch_start, epoch_end
    FROM public.staking_epochs
    WHERE id = p_epoch_id
  ),
  -- Get TON wallet addresses (primary first, then most recently used)
  ton_wallets AS (
    SELECT DISTINCT ON (uw.user_id)
      uw.user_id,
      uw.wallet_address
    FROM public.user_wallets uw
    WHERE uw.blockchain = 'TON'
    ORDER BY uw.user_id, uw.is_primary DESC, uw.last_used_at DESC
  ),
  user_eggs AS (
    SELECT 
      me.user_id,
      COALESCE(tw.wallet_address, '') as wallet_address,
      COALESCE(SUM(CASE WHEN me.event_type = 'eggs_produced_batch' THEN me.event_value ELSE 0 END), 0)::bigint as eggs_produced,
      COALESCE(SUM(CASE WHEN me.event_type = 'eggs_market_batch' THEN me.event_value ELSE 0 END), 0)::bigint as eggs_market
    FROM public.metric_events me
    CROSS JOIN epoch_period ep
    LEFT JOIN ton_wallets tw ON tw.user_id = me.user_id
    WHERE me.created_at >= ep.epoch_start 
      AND me.created_at < ep.epoch_end
      AND me.event_type IN ('eggs_produced_batch', 'eggs_market_batch')
      AND me.user_id IS NOT NULL
    GROUP BY me.user_id, tw.wallet_address
    HAVING COALESCE(SUM(CASE WHEN me.event_type = 'eggs_produced_batch' THEN me.event_value ELSE 0 END), 0) > 0
  ),
  user_efficiency AS (
    SELECT 
      ue.user_id,
      ue.wallet_address,
      ue.eggs_produced,
      ue.eggs_market,
      CASE 
        WHEN ue.eggs_produced > 0 THEN LEAST(1.0, ue.eggs_market::numeric / ue.eggs_produced::numeric)
        ELSE 0.0
      END as efficiency,
      -- Weight = efficiency * stake_user (for now stake_user = 1, so weight = efficiency)
      CASE 
        WHEN ue.eggs_produced > 0 THEN LEAST(1.0, ue.eggs_market::numeric / ue.eggs_produced::numeric)
        ELSE 0.0
      END as weight
    FROM user_eggs ue
    WHERE ue.wallet_address IS NOT NULL AND ue.wallet_address != ''  -- Solo usuarios con wallet TON
  ),
  total_weights AS (
    SELECT COALESCE(SUM(weight), 0) as total
    FROM user_efficiency
  )
  SELECT 
    ue.user_id,
    ue.wallet_address,
    ue.eggs_produced,
    ue.eggs_market,
    ue.efficiency,
    ue.weight,
    CASE 
      WHEN tw.total > 0 THEN ue.weight / tw.total
      ELSE 0.0
    END as reward_share,
    CASE 
      WHEN tw.total > 0 THEN (ue.weight / tw.total) * p_total_rewards_ton
      ELSE 0.0
    END as reward_ton
  FROM user_efficiency ue
  CROSS JOIN total_weights tw;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: Create function to generate merkle leaf hash
-- CANONICAL FORMAT: sha256(wallet_address + ":" + amount_nano_decimal_string)
-- amount_nano = floor(reward_ton * 1e9) - nanoTON as integer
CREATE OR REPLACE FUNCTION generate_merkle_leaf_hash(
  p_wallet_address text,
  p_reward_ton numeric  -- TON with decimals
)
RETURNS text AS $$
DECLARE
  v_amount_nano bigint;
BEGIN
  -- Convert to nanoTON (floor to integer)
  v_amount_nano := floor(p_reward_ton * 1e9)::bigint;
  
  -- Generate SHA-256 hash of canonical format: wallet:amount_nano
  RETURN encode(
    digest(
      p_wallet_address || ':' || v_amount_nano::text,
      'sha256'
    ),
    'hex'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 11: Create function to populate epoch allocations
CREATE OR REPLACE FUNCTION populate_epoch_allocations(
  p_epoch_id uuid
)
RETURNS void AS $$
DECLARE
  epoch_record RECORD;
  allocation_record RECORD;
  merkle_hash text;
BEGIN
  -- Get epoch info
  SELECT * INTO epoch_record FROM public.staking_epochs WHERE id = p_epoch_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Epoch % not found', p_epoch_id;
  END IF;

  -- Delete existing allocations for this epoch
  DELETE FROM public.staking_epoch_allocations WHERE epoch_id = p_epoch_id;

  -- Calculate and insert allocations
  FOR allocation_record IN 
    SELECT * FROM calculate_epoch_allocations(p_epoch_id, epoch_record.total_rewards_ton)
  LOOP
    -- Generate merkle leaf hash
    merkle_hash := generate_merkle_leaf_hash(
      allocation_record.wallet_address,
      allocation_record.reward_ton
    );

    -- Insert allocation
    INSERT INTO public.staking_epoch_allocations (
      epoch_id,
      user_id,
      wallet_address,
      eggs_produced,
      eggs_market,
      efficiency,
      weight,
      reward_share,
      reward_ton,
      merkle_leaf_hash
    ) VALUES (
      p_epoch_id,
      allocation_record.user_id,
      allocation_record.wallet_address,
      allocation_record.eggs_produced,
      allocation_record.eggs_market,
      allocation_record.efficiency,
      allocation_record.weight,
      allocation_record.reward_share,
      allocation_record.reward_ton,
      merkle_hash
    );
  END LOOP;

  -- Update epoch status to root_published (after merkle root is calculated externally)
  -- Note: merkle_root should be calculated externally and updated separately
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 12: Create function fn_epoch_eggs to aggregate eggs by user and epoch
-- This function returns eggs produced and eggs that reached market per user for a given epoch period
CREATE OR REPLACE FUNCTION public.fn_epoch_eggs(
  _epoch_start timestamptz,
  _epoch_end   timestamptz
)
RETURNS TABLE (
  user_id uuid,
  wallet_address text,
  eggs_produced bigint,
  eggs_market bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH ton_wallets AS (
    SELECT DISTINCT ON (uw.user_id)
      uw.user_id,
      uw.wallet_address
    FROM public.user_wallets uw
    WHERE uw.blockchain = 'TON'
    ORDER BY uw.user_id, uw.is_primary DESC, uw.last_used_at DESC
  ),
  produced AS (
    SELECT
      me.user_id,
      SUM(me.event_value)::bigint AS eggs_produced
    FROM public.metric_events me
    WHERE me.event_type = 'eggs_produced_batch'
      AND me.created_at >= _epoch_start
      AND me.created_at <  _epoch_end
    GROUP BY me.user_id
  ),
  market AS (
    SELECT
      me.user_id,
      SUM(me.event_value)::bigint AS eggs_market
    FROM public.metric_events me
    WHERE me.event_type = 'eggs_market_batch'
      AND me.created_at >= _epoch_start
      AND me.created_at <  _epoch_end
    GROUP BY me.user_id
  )
  SELECT
    p.id AS user_id,
    tw.wallet_address,
    COALESCE(pr.eggs_produced, 0) AS eggs_produced,
    COALESCE(mk.eggs_market,  0) AS eggs_market
  FROM public.profiles p
  JOIN ton_wallets tw ON tw.user_id = p.id
  LEFT JOIN produced pr ON pr.user_id = p.id
  LEFT JOIN market   mk ON mk.user_id = p.id
  WHERE COALESCE(pr.eggs_produced, 0) > 0  -- solo los que han producido algo
    AND COALESCE(mk.eggs_market, 0) > 0;   -- y han llevado huevos al market
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_epoch_allocations(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_merkle_leaf_hash(text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION populate_epoch_allocations(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_epoch_eggs(timestamptz, timestamptz) TO authenticated;



