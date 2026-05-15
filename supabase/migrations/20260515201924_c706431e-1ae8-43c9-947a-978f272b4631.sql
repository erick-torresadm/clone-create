ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS traffic_source text;
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON public.orders (status, created_at DESC);