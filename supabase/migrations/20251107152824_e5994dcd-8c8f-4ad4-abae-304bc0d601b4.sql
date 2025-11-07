-- Create application logs table for errors and important events
CREATE TABLE IF NOT EXISTS public.app_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'error', 'critical')),
  message TEXT NOT NULL,
  context JSONB,
  stack_trace TEXT,
  user_agent TEXT,
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster queries by user and level
CREATE INDEX IF NOT EXISTS idx_app_logs_user_id ON public.app_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_app_logs_level ON public.app_logs(level);
CREATE INDEX IF NOT EXISTS idx_app_logs_created_at ON public.app_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.app_logs ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own logs
CREATE POLICY "Users can insert their own logs"
  ON public.app_logs
  FOR INSERT
  WITH CHECK (true);

-- Allow users to view their own logs
CREATE POLICY "Users can view their own logs"
  ON public.app_logs
  FOR SELECT
  USING (user_id = (SELECT id FROM public.profiles WHERE telegram_id IS NOT NULL));

-- Create function to log errors
CREATE OR REPLACE FUNCTION public.log_error(
  p_user_id UUID,
  p_level TEXT,
  p_message TEXT,
  p_context JSONB DEFAULT NULL,
  p_stack_trace TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.app_logs (
    user_id,
    level,
    message,
    context,
    stack_trace,
    user_agent,
    url
  )
  VALUES (
    p_user_id,
    p_level,
    p_message,
    p_context,
    p_stack_trace,
    p_user_agent,
    p_url
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;