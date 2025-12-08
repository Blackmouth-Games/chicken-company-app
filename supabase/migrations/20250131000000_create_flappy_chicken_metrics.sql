-- Migration: Create flappy_chicken_metrics table for game statistics
-- Stores metrics per user for the Flappy Chicken minigame

-- Step 1: Create flappy_chicken_metrics table
CREATE TABLE IF NOT EXISTS public.flappy_chicken_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Game statistics
  total_attempts integer NOT NULL DEFAULT 0,
  total_deaths integer NOT NULL DEFAULT 0,
  total_play_time_seconds integer NOT NULL DEFAULT 0, -- Total time played in seconds
  average_score numeric(10, 2) NOT NULL DEFAULT 0,
  max_level_reached integer NOT NULL DEFAULT 0,
  high_score integer NOT NULL DEFAULT 0,
  
  -- Array to store recent scores (last 100)
  recent_scores integer[] DEFAULT '{}',
  
  -- Timestamps
  last_played_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure one record per user
  UNIQUE(user_id)
);

-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_flappy_chicken_metrics_user_id ON public.flappy_chicken_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_flappy_chicken_metrics_high_score ON public.flappy_chicken_metrics(high_score DESC);
CREATE INDEX IF NOT EXISTS idx_flappy_chicken_metrics_last_played ON public.flappy_chicken_metrics(last_played_at DESC);

-- Step 3: Enable RLS
ALTER TABLE public.flappy_chicken_metrics ENABLE ROW LEVEL SECURITY;

-- Step 4: RLS Policies
-- Users can view their own metrics
CREATE POLICY "Users can view their own metrics"
ON public.flappy_chicken_metrics
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can insert their own metrics
CREATE POLICY "Users can insert their own metrics"
ON public.flappy_chicken_metrics
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own metrics
CREATE POLICY "Users can update their own metrics"
ON public.flappy_chicken_metrics
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admins can view all metrics
CREATE POLICY "Admins can view all metrics"
ON public.flappy_chicken_metrics
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Admins can update all metrics
CREATE POLICY "Admins can update all metrics"
ON public.flappy_chicken_metrics
FOR UPDATE
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

-- Step 5: Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_flappy_chicken_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create trigger for updated_at
CREATE TRIGGER update_flappy_chicken_metrics_updated_at
  BEFORE UPDATE ON public.flappy_chicken_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_flappy_chicken_metrics_updated_at();

-- Step 7: Create function to upsert metrics (for easier updates)
CREATE OR REPLACE FUNCTION upsert_flappy_chicken_metrics(
  p_user_id uuid,
  p_score integer,
  p_play_time_seconds integer,
  p_level_reached integer
)
RETURNS void AS $$
DECLARE
  v_current_metrics public.flappy_chicken_metrics%ROWTYPE;
  v_new_scores integer[];
  v_average_score numeric;
BEGIN
  -- Get or create metrics record
  SELECT * INTO v_current_metrics
  FROM public.flappy_chicken_metrics
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    -- Create new record
    INSERT INTO public.flappy_chicken_metrics (
      user_id,
      total_attempts,
      total_deaths,
      total_play_time_seconds,
      average_score,
      max_level_reached,
      high_score,
      recent_scores,
      last_played_at
    ) VALUES (
      p_user_id,
      1,
      1,
      p_play_time_seconds,
      p_score,
      p_level_reached,
      p_score,
      ARRAY[p_score],
      now()
    );
  ELSE
    -- Update existing record
    v_new_scores := array_append(
      CASE 
        WHEN array_length(v_current_metrics.recent_scores, 1) >= 100 
        THEN v_current_metrics.recent_scores[2:100]
        ELSE v_current_metrics.recent_scores
      END,
      p_score
    );
    
    v_average_score := (
      SELECT COALESCE(AVG(score), 0)
      FROM unnest(v_new_scores) AS score
    );
    
    UPDATE public.flappy_chicken_metrics
    SET
      total_attempts = total_attempts + 1,
      total_deaths = total_deaths + 1,
      total_play_time_seconds = total_play_time_seconds + p_play_time_seconds,
      average_score = ROUND(v_average_score, 2),
      max_level_reached = GREATEST(max_level_reached, p_level_reached),
      high_score = GREATEST(high_score, p_score),
      recent_scores = v_new_scores,
      last_played_at = now()
    WHERE user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION upsert_flappy_chicken_metrics(uuid, integer, integer, integer) TO authenticated;

