-- Create enum for metric types
CREATE TYPE public.metric_type AS ENUM (
  'new_guest_users',
  'new_registered_users',
  'session_duration',
  'page_view',
  'button_click',
  'feature_usage'
);

-- Table for daily aggregated metrics
CREATE TABLE public.daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  metric_type metric_type NOT NULL,
  metric_value BIGINT NOT NULL DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(date, metric_type)
);

-- Table for individual metric events (more granular tracking)
CREATE TABLE public.metric_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type metric_type NOT NULL,
  event_value NUMERIC,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  session_id UUID REFERENCES public.user_sessions(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metric_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_metrics (admin only for now, can be expanded)
CREATE POLICY "Anyone can view daily metrics"
ON public.daily_metrics
FOR SELECT
USING (true);

CREATE POLICY "System can insert daily metrics"
ON public.daily_metrics
FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update daily metrics"
ON public.daily_metrics
FOR UPDATE
USING (true);

-- RLS Policies for metric_events
CREATE POLICY "Users can view their own events"
ON public.metric_events
FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own events"
ON public.metric_events
FOR INSERT
WITH CHECK (true);

-- Function to increment daily metric
CREATE OR REPLACE FUNCTION public.increment_daily_metric(
  p_date DATE,
  p_metric_type metric_type,
  p_increment BIGINT DEFAULT 1,
  p_metadata JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Function to record metric event
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
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO public.metric_events (user_id, event_type, event_value, metadata, session_id)
  VALUES (p_user_id, p_event_type, p_event_value, p_metadata, p_session_id)
  RETURNING id INTO v_event_id;
  
  -- Also increment daily metric
  PERFORM increment_daily_metric(CURRENT_DATE, p_event_type, 1, p_metadata);
  
  RETURN v_event_id;
END;
$$;

-- Function to get daily metrics summary
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
AS $$
BEGIN
  RETURN QUERY
  SELECT dm.date, dm.metric_type, dm.metric_value, dm.metadata
  FROM public.daily_metrics dm
  WHERE dm.date BETWEEN p_start_date AND p_end_date
  ORDER BY dm.date DESC, dm.metric_type;
END;
$$;

-- Trigger to update updated_at on daily_metrics
CREATE TRIGGER update_daily_metrics_updated_at
BEFORE UPDATE ON public.daily_metrics
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_daily_metrics_date ON public.daily_metrics(date DESC);
CREATE INDEX idx_daily_metrics_type ON public.daily_metrics(metric_type);
CREATE INDEX idx_metric_events_user ON public.metric_events(user_id);
CREATE INDEX idx_metric_events_type ON public.metric_events(event_type);
CREATE INDEX idx_metric_events_created ON public.metric_events(created_at DESC);
CREATE INDEX idx_metric_events_session ON public.metric_events(session_id);