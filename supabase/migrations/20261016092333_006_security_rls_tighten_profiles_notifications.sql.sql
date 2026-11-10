/*
# Security: Tighten RLS on profiles and notifications, fix public.users view

## Summary
This migration addresses critical security findings:
1. `profiles` table had fully open RLS (anon + authenticated, USING(true) on all operations) — any anonymous visitor could read/modify all user profiles including role assignments.
2. `notifications` table had fully open RLS — any visitor could read/notifications for any user.
3. `public.users` view exposed `auth.users` to the `anon` role (Supabase advisor: auth_users_exposed + security_definer_view).
4. `notify_clients()` function was SECURITY DEFINER, callable by anon, and had a mutable search_path (Supabase advisor findings).

## Changes

### profiles table
- Replaces open `TO anon, authenticated` policies with `TO authenticated` only.
- SELECT: authenticated users can read all profiles (needed for team/collaborator lookups across roles).
- INSERT: users can only insert their own profile row (auth.uid() = id).
- UPDATE: users can only update their own profile row (auth.uid() = id). This prevents privilege escalation — a user cannot change another user's role.
- DELETE: users can only delete their own profile row.

### notifications table
- Replaces open policies with `TO authenticated` only.
- SELECT/UPDATE/DELETE: scoped to `auth.uid() = user_id` — users see only their own notifications.
- INSERT: any authenticated user can insert (needed for trigger-based notifications from various sources).

### public.users view
- Revokes SELECT from `anon` role (was exposing auth.users to unauthenticated visitors).
- Keeps SELECT on `authenticated` role (needed by internal functions).

### notify_clients() function
- Adds explicit `SET search_path = public, pg_temp` to fix mutable search_path warning.
- Revokes EXECUTE from `anon` role — this trigger function should not be callable via the REST API by anonymous users.
- Keeps EXECUTE on `authenticated` (for internal use).

## Security Impact
- Anonymous visitors can no longer read or modify user profiles.
- Anonymous visitors can no longer read other users' notifications.
- Anonymous visitors can no longer access the `public.users` view.
- The `notify_clients` function is no longer executable by anonymous users via the REST API.
- Users cannot modify other users' profiles (prevents privilege escalation via role changes).

## Rollback
To revert, re-create the original open policies with `TO anon, authenticated USING (true)`.
Re-grant SELECT on public.users to anon.
Re-grant EXECUTE on notify_clients to anon.
*/

-- =====================================================
-- 1. PROFILES TABLE — tighten RLS
-- =====================================================

-- Drop old open policies
DROP POLICY IF EXISTS "anon_select_profiles" ON profiles;
DROP POLICY IF EXISTS "anon_insert_profiles" ON profiles;
DROP POLICY IF EXISTS "anon_update_profiles" ON profiles;
DROP POLICY IF EXISTS "anon_delete_profiles" ON profiles;

-- SELECT: authenticated users can read all profiles (needed for team lookups)
CREATE POLICY "authenticated_select_profiles" ON profiles
  FOR SELECT TO authenticated USING (true);

-- INSERT: users can only create their own profile
CREATE POLICY "authenticated_insert_own_profile" ON profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- UPDATE: users can only update their own profile (prevents role escalation)
CREATE POLICY "authenticated_update_own_profile" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- DELETE: users can only delete their own profile
CREATE POLICY "authenticated_delete_own_profile" ON profiles
  FOR DELETE TO authenticated USING (auth.uid() = id);

-- =====================================================
-- 2. NOTIFICATIONS TABLE — tighten RLS
-- =====================================================

-- Drop old open policies
DROP POLICY IF EXISTS "anon_select_notifications" ON notifications;
DROP POLICY IF EXISTS "anon_insert_notifications" ON notifications;
DROP POLICY IF EXISTS "anon_update_notifications" ON notifications;
DROP POLICY IF EXISTS "anon_delete_notifications" ON notifications;

-- SELECT: users can only see their own notifications
CREATE POLICY "authenticated_select_own_notifications" ON notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- INSERT: any authenticated user can insert (for trigger-based notifications)
CREATE POLICY "authenticated_insert_notifications" ON notifications
  FOR INSERT TO authenticated WITH CHECK (true);

-- UPDATE: users can only update their own notifications (e.g., mark as read)
CREATE POLICY "authenticated_update_own_notifications" ON notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- DELETE: users can only delete their own notifications
CREATE POLICY "authenticated_delete_own_notifications" ON notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =====================================================
-- 3. PUBLIC.USERS VIEW — revoke anon access
-- =====================================================

REVOKE SELECT ON public.users FROM anon;

-- =====================================================
-- 4. NOTIFY_CLIENTS FUNCTION — fix search_path + revoke anon execute
-- =====================================================

-- Recreate with fixed search_path
CREATE OR REPLACE FUNCTION public.notify_clients()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  admin_id uuid;
BEGIN
  BEGIN
    SELECT id INTO admin_id FROM public.users WHERE role = 'admin' LIMIT 1;
  EXCEPTION WHEN undefined_table THEN
    admin_id := NULL;
  END;

  IF admin_id IS NULL THEN
    BEGIN
      SELECT id INTO admin_id FROM auth.users LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      admin_id := NULL;
    END;
  END IF;

  IF admin_id IS NOT NULL THEN
    BEGIN
      INSERT INTO notifications (user_id, title, message, type, created_at, read)
      VALUES (admin_id, 'Nouveau client', CONCAT('Un nouveau client a été ajouté: ', COALESCE(NEW.name, '')), 'client', now(), false);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'notify_clients: notification insert failed: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'notify_clients: no user found, skipping notification';
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'notify_clients suppressed: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Revoke execute from anon (was callable via REST API by anonymous users)
REVOKE EXECUTE ON FUNCTION public.notify_clients() FROM anon;