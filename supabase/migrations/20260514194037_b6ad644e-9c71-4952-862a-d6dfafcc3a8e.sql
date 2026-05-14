CREATE OR REPLACE FUNCTION public.claim_stock(_product_id uuid, _quantity integer, _order_id uuid)
 RETURNS TABLE(id uuid, content text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH picked AS (
    SELECT s.id
    FROM public.product_stock s
    WHERE s.product_id = _product_id
      AND s.delivered = false
    ORDER BY s.created_at
    LIMIT _quantity
    FOR UPDATE SKIP LOCKED
  ),
  updated AS (
    UPDATE public.product_stock s
    SET delivered = true,
        order_id = _order_id,
        delivered_at = now()
    FROM picked
    WHERE s.id = picked.id
    RETURNING s.id, s.content
  )
  SELECT u.id, u.content FROM updated u;
END;
$function$;