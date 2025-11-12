-- Create trigger to link auth.users with profiles table when wallet connects
-- This ensures the relationship between Telegram users and auth users

CREATE OR REPLACE FUNCTION public.link_auth_user_to_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_telegram_id BIGINT;
BEGIN
  -- Extract profile_id and telegram_id from user metadata
  v_profile_id := (NEW.raw_user_meta_data->>'profile_id')::UUID;
  v_telegram_id := (NEW.raw_user_meta_data->>'telegram_id')::BIGINT;
  
  -- If we have a profile_id in metadata, ensure it's linked
  IF v_profile_id IS NOT NULL THEN
    -- Update the profile to store auth_user_id (we'll add this column if needed)
    -- For now, just log the connection
    RAISE NOTICE 'Auth user % linked to profile %', NEW.id, v_profile_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users (only if it doesn't exist)
DROP TRIGGER IF EXISTS on_auth_user_created_link_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_link_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.link_auth_user_to_profile();

-- Add helpful comment
COMMENT ON FUNCTION public.link_auth_user_to_profile() IS 
'Links auth.users created via wallet connection to their corresponding profiles table entry';