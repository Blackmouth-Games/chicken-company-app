-- Fix security warnings: Add search_path to existing functions

-- Fix handle_updated_at function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix generate_referral_code function
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := 'CC' || UPPER(substring(md5(random()::text) from 1 for 8));
  END IF;
  RETURN NEW;
END;
$function$;

-- Update new metric functions with search_path (they already have it, but ensuring consistency)
CREATE OR REPLACE FUNCTION public.increment_daily_metric(
  p_date DATE,
  p_metric_type metric_type,
  p_increment BIGINT DEFAULT 1,
  p_metadata JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.daily_metrics (date, metric_type, metric_value, metadata)
  VALUES (p_date, p_metric_type, p_increment, p_metadata)
  ON CONFLICT (date, metric_type) 
  DO UPDATE SET 
    metric_value = daily_metrics.metric_value + p_increment,
    metadata = COALESCE(p_metadata, daily_metrics.metadata),
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.record_metric_event(
  p_user_id UUID,
  p_event_type metric_type,
  p_event_value NUMERIC DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_session_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO public.metric_events (user_id, event_type, event_value, metadata, session_id)
  VALUES (p_user_id, p_event_type, p_event_value, p_metadata, p_session_id)
  RETURNING id INTO v_event_id;
  
  PERFORM increment_daily_metric(CURRENT_DATE, p_event_type, 1, p_metadata);
  
  RETURN v_event_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_metrics_summary(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  date DATE,
  metric_type metric_type,
  metric_value BIGINT,
  metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT dm.date, dm.metric_type, dm.metric_value, dm.metadata
  FROM public.daily_metrics dm
  WHERE dm.date BETWEEN p_start_date AND p_end_date
  ORDER BY dm.date DESC, dm.metric_type;
END;
$$;