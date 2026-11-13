-- PROPOSAL ONLY. Never execute against pajes_import_test.
--
-- This rollback destroys credential hashes, sessions, activation links, and
-- reset links created after the additive migration. It deliberately refuses
-- to run against the protected database and requires explicit approval plus
-- a verified backup. No imported object is touched.

BEGIN;

DO $$
BEGIN
    IF current_database() = 'pajes_import_test' THEN
        RAISE EXCEPTION 'Rollback is prohibited on pajes_import_test';
    END IF;
    IF current_setting('pajes.auth_rollback_approved', true) IS DISTINCT FROM 'YES'
       OR current_setting('pajes.auth_rollback_backup_verified', true) IS DISTINCT FROM 'YES' THEN
        RAISE EXCEPTION
            'Rollback requires explicit owner approval and a verified backup';
    END IF;
END
$$;

DROP TABLE public.password_reset_tokens;
DROP TABLE public.account_activation_tokens;
DROP TABLE public.auth_sessions;
DROP TABLE public.user_credentials;

COMMIT;

-- This proposal is not an approval to execute rollback. Inspect all four
-- tables and obtain database-owner authorization before using it.
