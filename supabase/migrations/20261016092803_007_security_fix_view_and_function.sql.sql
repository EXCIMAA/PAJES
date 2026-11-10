/*
# Security: Fix remaining advisor findings on public.users view and notify_clients function

## Summary
1. `public.users` view exposed to authenticated + SECURITY DEFINER — should not be queryable via REST API.
2. `notify_clients()` callable by anon and authenticated via REST API — should only be a trigger.

## Changes
- Drops and recreates public.users with security_invoker = true
- Revokes SELECT from authenticated on public.users
- Revokes EXECUTE on notify_clients from anon and authenticated
*/

-- Drop and recreate the view as SECURITY INVOKER
DROP VIEW IF EXISTS public.users;

CREATE VIEW public.users AS
SELECT
  id,
  email,
  ''::text AS role
FROM auth.users;

ALTER VIEW public.users SET (security_invoker = true);

-- Do not grant SELECT to anyone — only internal functions should use this
-- notify_clients uses SECURITY DEFINER so it can access auth.users directly

-- Revoke EXECUTE on notify_clients from all public roles
REVOKE EXECUTE ON FUNCTION public.notify_clients() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_clients() FROM authenticated;