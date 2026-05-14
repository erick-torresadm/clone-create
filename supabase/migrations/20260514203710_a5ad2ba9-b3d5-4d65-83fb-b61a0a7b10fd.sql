
REVOKE EXECUTE ON FUNCTION public.claim_stock(uuid, integer, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_db_size() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon, public;
