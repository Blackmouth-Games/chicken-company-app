-- Update create_or_update_profile function to create initial buildings
CREATE OR REPLACE FUNCTION public.create_or_update_profile(
  p_telegram_id bigint,
  p_telegram_first_name text,
  p_telegram_last_name text DEFAULT NULL,
  p_telegram_username text DEFAULT NULL,
  p_source text DEFAULT NULL,
  p_referrer_code text DEFAULT NULL
)
RETURNS TABLE(profile_id uuid, referral_code text, is_new_user boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_referral_code TEXT;
  v_referrer_id UUID;
  v_is_new BOOLEAN := false;
BEGIN
  -- Check if profile exists
  SELECT id, profiles.referral_code INTO v_profile_id, v_referral_code
  FROM public.profiles
  WHERE telegram_id = p_telegram_id;
  
  -- If profile doesn't exist, create it
  IF v_profile_id IS NULL THEN
    v_is_new := true;
    
    -- Find referrer if code provided
    IF p_referrer_code IS NOT NULL THEN
      SELECT id INTO v_referrer_id
      FROM public.profiles
      WHERE profiles.referral_code = p_referrer_code;
    END IF;
    
    -- Insert new profile
    INSERT INTO public.profiles (
      telegram_id,
      telegram_first_name,
      telegram_last_name,
      telegram_username,
      source,
      referred_by
    )
    VALUES (
      p_telegram_id,
      p_telegram_first_name,
      p_telegram_last_name,
      p_telegram_username,
      p_source,
      v_referrer_id
    )
    RETURNING id, profiles.referral_code INTO v_profile_id, v_referral_code;
    
    -- Create initial buildings (Warehouse and Market at level 1)
    INSERT INTO public.user_buildings (user_id, building_type, level, position_index, capacity, current_chickens)
    VALUES 
      (v_profile_id, 'warehouse', 1, -1, 1000, 0),
      (v_profile_id, 'market', 1, -2, 100, 0);
    
    -- Create referral record if there's a referrer
    IF v_referrer_id IS NOT NULL THEN
      INSERT INTO public.referrals (referrer_id, referred_id)
      VALUES (v_referrer_id, v_profile_id);
    END IF;
  ELSE
    -- Update existing profile if source is provided and not already set
    IF p_source IS NOT NULL THEN
      UPDATE public.profiles
      SET source = COALESCE(source, p_source),
          updated_at = now()
      WHERE id = v_profile_id;
    END IF;
  END IF;
  
  RETURN QUERY SELECT v_profile_id, v_referral_code, v_is_new;
END;
$$;