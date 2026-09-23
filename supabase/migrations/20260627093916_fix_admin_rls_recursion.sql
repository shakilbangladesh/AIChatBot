-- Create a SECURITY DEFINER function that bypasses RLS to check if caller is super_admin.
-- This prevents infinite recursion when the profiles table policy references itself.
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

-- Drop the broken recursive policy
DROP POLICY IF EXISTS "Super admins can do everything" ON profiles;

-- Recreate with the security-definer function (no recursion)
CREATE POLICY "Super admins full access" ON profiles
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());
