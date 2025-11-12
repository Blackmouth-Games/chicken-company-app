-- Drop insecure policies
DROP POLICY IF EXISTS "Building skins can be inserted by anyone" ON public.building_skins;
DROP POLICY IF EXISTS "Building skins can be updated by anyone" ON public.building_skins;

-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (user_id IN (
  SELECT id FROM public.profiles WHERE telegram_id IS NOT NULL
));

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Secure policies for building_skins (only admins can INSERT/UPDATE)
CREATE POLICY "Admins can insert building skins"
ON public.building_skins
FOR INSERT
WITH CHECK (
  public.has_role(
    (SELECT id FROM public.profiles WHERE telegram_id IS NOT NULL LIMIT 1),
    'admin'
  )
);

CREATE POLICY "Admins can update building skins"
ON public.building_skins
FOR UPDATE
USING (
  public.has_role(
    (SELECT id FROM public.profiles WHERE telegram_id IS NOT NULL LIMIT 1),
    'admin'
  )
);