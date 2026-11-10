-- Safe replacement for notify_clients trigger function
-- This version is defensive: it handles missing public.users table/view and avoids raising errors.
-- It inserts a notification only if an admin user is found; otherwise it does nothing.
-- Apply in Supabase SQL Editor (or via migration tooling).

CREATE OR REPLACE FUNCTION public.notify_clients()
RETURNS trigger AS $$
DECLARE
  admin_id uuid;
BEGIN
  -- Try to get an admin id from public.users if available
  BEGIN
    SELECT id INTO admin_id FROM public.users WHERE role = 'admin' LIMIT 1;
  EXCEPTION WHEN undefined_table THEN
    admin_id := NULL;
  END;

  -- Fallback: try to find a user in auth.users (first user) if no admin found
  IF admin_id IS NULL THEN
    BEGIN
      SELECT id INTO admin_id FROM auth.users LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      admin_id := NULL;
    END;
  END IF;

  -- If we found an admin (or any user), insert a notification for them; otherwise skip
  IF admin_id IS NOT NULL THEN
    BEGIN
      INSERT INTO notifications (user_id, title, message, type, created_at, read)
      VALUES (admin_id, 'Nouveau client', CONCAT('Un nouveau client a été ajouté: ', COALESCE(NEW.name, '')), 'client', now(), false);
    EXCEPTION WHEN OTHERS THEN
      -- swallow any error to avoid breaking the triggering operation
      RAISE NOTICE 'notify_clients: notification insert failed: %', SQLERRM;
    END;
  ELSE
    -- No admin/user found: do nothing but log
    RAISE NOTICE 'notify_clients: no user found, skipping notification';
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never fail the original insert/update because of this function
  RAISE NOTICE 'notify_clients suppressed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
