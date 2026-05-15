
-- 1. Coluna para evitar reenvio do email de carrinho abandonado
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS abandoned_email_sent_at TIMESTAMPTZ;

-- 2. Função para incrementar uso de cupom de forma atômica
CREATE OR REPLACE FUNCTION public.increment_coupon_usage(_code TEXT)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.coupons
  SET used_count = used_count + 1
  WHERE upper(code) = upper(_code);
$$;

GRANT EXECUTE ON FUNCTION public.increment_coupon_usage(TEXT) TO authenticated, service_role;

-- 3. Habilita extensões para cron
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
