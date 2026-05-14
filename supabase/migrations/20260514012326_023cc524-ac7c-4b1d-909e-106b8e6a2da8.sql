
CREATE TABLE public.product_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  content text NOT NULL,
  delivered boolean NOT NULL DEFAULT false,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_stock_available
  ON public.product_stock (product_id)
  WHERE delivered = false;

CREATE INDEX idx_product_stock_order ON public.product_stock(order_id);

ALTER TABLE public.product_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stock admin read"
  ON public.product_stock FOR SELECT
  TO authenticated
  USING (app_private.is_admin(auth.uid()));

CREATE POLICY "Stock admin write"
  ON public.product_stock FOR ALL
  TO authenticated
  USING (app_private.is_admin(auth.uid()))
  WITH CHECK (app_private.is_admin(auth.uid()));

-- Atomically claim N stock rows for an order. Returns the claimed contents.
CREATE OR REPLACE FUNCTION public.claim_stock(
  _product_id uuid,
  _quantity int,
  _order_id uuid
)
RETURNS TABLE (id uuid, content text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimed_ids uuid[];
BEGIN
  WITH picked AS (
    SELECT s.id
    FROM public.product_stock s
    WHERE s.product_id = _product_id
      AND s.delivered = false
    ORDER BY s.created_at
    LIMIT _quantity
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.product_stock s
  SET delivered = true,
      order_id = _order_id,
      delivered_at = now()
  FROM picked
  WHERE s.id = picked.id
  RETURNING s.id, s.content
  INTO claimed_ids;

  RETURN QUERY
  SELECT s.id, s.content
  FROM public.product_stock s
  WHERE s.order_id = _order_id
    AND s.delivered_at IS NOT NULL
  ORDER BY s.delivered_at DESC
  LIMIT _quantity;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_stock(uuid, int, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_stock(uuid, int, uuid) TO service_role;
