CREATE OR REPLACE FUNCTION public.process_reseller(_user_id uuid, _approve boolean, _note text, _discount_pct numeric DEFAULT NULL)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT app_private.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _approve THEN
    UPDATE public.reseller_accounts
      SET status = 'approved',
          approved_at = now(),
          approved_by = auth.uid(),
          admin_note = _note,
          discount_pct = COALESCE(_discount_pct, discount_pct)
      WHERE user_id = _user_id;
  ELSE
    UPDATE public.reseller_accounts
      SET status = 'rejected', approved_at = now(), approved_by = auth.uid(), admin_note = _note
      WHERE user_id = _user_id;
  END IF;
END;
$function$;

-- Allow admin to update discount independently of approval
CREATE OR REPLACE FUNCTION public.set_reseller_discount(_user_id uuid, _discount_pct numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT app_private.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _discount_pct IS NULL OR _discount_pct < 0 OR _discount_pct > 90 THEN
    RAISE EXCEPTION 'discount_pct deve estar entre 0 e 90';
  END IF;
  UPDATE public.reseller_accounts
    SET discount_pct = _discount_pct
    WHERE user_id = _user_id;
END;
$function$;