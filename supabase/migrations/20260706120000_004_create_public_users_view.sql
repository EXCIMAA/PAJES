-- Create a view `public.users` to satisfy legacy DB functions that query "users"
-- This maps minimal columns from auth.users and provides a `role` column (empty by default)
-- Run this migration in Supabase SQL editor or deploy with your existing migration tooling.

CREATE OR REPLACE VIEW public.users AS
SELECT
  id,
  email,
  ''::text AS role
FROM auth.users;

-- Grant select on view to anon and authenticated if needed
GRANT SELECT ON public.users TO anon;
GRANT SELECT ON public.users TO authenticated;
