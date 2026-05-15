
REVOKE EXECUTE ON FUNCTION public.increment_coupon_usage(TEXT) FROM authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.increment_coupon_usage(TEXT) TO service_role;
