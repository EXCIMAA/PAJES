/*
# Security: Revoke PUBLIC execute on notify_clients

The function still has a grant to the implicit PUBLIC role (`=X/postgres` in proacl).
This means any role (including anon and authenticated) can execute it.
Revoke from PUBLIC explicitly.
*/

REVOKE EXECUTE ON FUNCTION public.notify_clients() FROM PUBLIC;