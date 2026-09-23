/*
# Add auto-profile trigger and packages read policy

## Overview
1. Creates a trigger function to auto-create a profile row when a new user signs up.
2. Adds a SELECT policy to `packages` so authenticated users can read available plans.

## Changes
- New function `handle_new_user()`: inserts into profiles on auth.users INSERT.
- New trigger `on_auth_user_created` on auth.users.
- New SELECT policy on packages for authenticated users.

## Security
- packages SELECT is public to all authenticated users (plan info is not sensitive).
- Profile auto-creation uses the new user's ID.

## Notes
1. The trigger ensures every new signup gets a profile with role='tenant' and package_id=1 (Free).
2. Packages table is read-only from the client side.
*/

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, package_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'tenant',
    1
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- Allow authenticated users to read packages
DROP POLICY IF EXISTS "authenticated_read_packages" ON packages;
CREATE POLICY "authenticated_read_packages" ON packages FOR SELECT
  TO authenticated USING (true);
