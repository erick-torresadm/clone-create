
-- 1. Profile: add referral_code + referred_by
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by uuid;

-- Backfill referral codes for existing users
UPDATE public.profiles
SET referral_code = upper(substr(replace(id::text, '-', ''), 1, 8))
WHERE referral_code IS NULL;

-- 2. Referral commissions table
CREATE TABLE IF NOT EXISTS public.referral_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_user_id uuid NOT NULL,
  order_id uuid NOT NULL,
  order_total numeric NOT NULL,
  amount numeric NOT NULL,
  rate numeric NOT NULL,
  status text NOT NULL DEFAULT 'available', -- available, locked, paid, canceled
  withdrawal_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_refcomm_referrer ON public.referral_commissions(referrer_id, status);

ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RefComm: user read own"
  ON public.referral_commissions FOR SELECT TO authenticated
  USING (referrer_id = auth.uid());

CREATE POLICY "RefComm: admin read all"
  ON public.referral_commissions FOR SELECT TO authenticated
  USING (app_private.is_admin(auth.uid()));

CREATE POLICY "RefComm: admin write"
  ON public.referral_commissions FOR ALL TO authenticated
  USING (app_private.is_admin(auth.uid()))
  WITH CHECK (app_private.is_admin(auth.uid()));

-- 3. Withdrawal requests
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  pix_key text NOT NULL,
  pix_type text NOT NULL DEFAULT 'cpf', -- cpf, email, phone, random
  full_name text,
  status text NOT NULL DEFAULT 'pending', -- pending, paid, rejected
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_withdraw_user ON public.withdrawal_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_withdraw_status ON public.withdrawal_requests(status, created_at DESC);

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Withdraw: user read own"
  ON public.withdrawal_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Withdraw: admin read all"
  ON public.withdrawal_requests FOR SELECT TO authenticated
  USING (app_private.is_admin(auth.uid()));

CREATE POLICY "Withdraw: admin update"
  ON public.withdrawal_requests FOR UPDATE TO authenticated
  USING (app_private.is_admin(auth.uid()))
  WITH CHECK (app_private.is_admin(auth.uid()));

-- (insert is done via SECURITY DEFINER function only, no insert policy)

-- 4. Update handle_new_user to assign referral_code + capture referred_by
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  user_count int;
  ref_code text;
  ref_by uuid;
  by_code text;
begin
  ref_code := upper(substr(replace(new.id::text, '-', ''), 1, 8));
  by_code := nullif(new.raw_user_meta_data->>'referred_by_code', '');
  if by_code is not null then
    select id into ref_by from public.profiles where upper(referral_code) = upper(by_code) limit 1;
  end if;

  insert into public.profiles (id, email, display_name, referral_code, referred_by)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)),
    ref_code,
    ref_by
  );

  select count(*) into user_count from public.user_roles;
  if user_count = 0 then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'user');
  end if;
  return new;
end; $function$;

-- 5. Function: register commission for a paid order (idempotent)
CREATE OR REPLACE FUNCTION public.register_referral_commission(_order_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid;
  v_total numeric;
  v_referrer uuid;
  v_sales int;
  v_rate numeric;
  v_amount numeric;
BEGIN
  SELECT user_id, total INTO v_user, v_total FROM public.orders WHERE id = _order_id;
  IF v_user IS NULL THEN RETURN; END IF;

  SELECT referred_by INTO v_referrer FROM public.profiles WHERE id = v_user;
  IF v_referrer IS NULL THEN RETURN; END IF;

  -- already exists?
  IF EXISTS (SELECT 1 FROM public.referral_commissions WHERE order_id = _order_id) THEN RETURN; END IF;

  -- count past commissions (any status except canceled) to determine rate
  SELECT count(*) INTO v_sales
  FROM public.referral_commissions
  WHERE referrer_id = v_referrer AND status <> 'canceled';

  v_rate := CASE WHEN v_sales >= 5 THEN 20 ELSE 15 END;
  v_amount := round((v_total * v_rate / 100)::numeric, 2);

  INSERT INTO public.referral_commissions (referrer_id, referred_user_id, order_id, order_total, amount, rate, status)
  VALUES (v_referrer, v_user, _order_id, v_total, v_amount, v_rate, 'available');
END;
$$;

-- 6. Function: request withdrawal (locks commissions FIFO)
CREATE OR REPLACE FUNCTION public.request_withdrawal(_amount numeric, _pix_key text, _pix_type text, _full_name text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_balance numeric;
  v_request uuid;
  v_locked numeric := 0;
  r record;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _amount IS NULL OR _amount < 20 THEN RAISE EXCEPTION 'Valor mínimo de saque é R$ 20,00'; END IF;
  IF _pix_key IS NULL OR length(trim(_pix_key)) < 3 THEN RAISE EXCEPTION 'Chave PIX inválida'; END IF;

  SELECT coalesce(sum(amount), 0) INTO v_balance
    FROM public.referral_commissions
    WHERE referrer_id = v_user AND status = 'available';

  IF _amount > v_balance THEN RAISE EXCEPTION 'Saldo insuficiente'; END IF;

  INSERT INTO public.withdrawal_requests (user_id, amount, pix_key, pix_type, full_name, status)
  VALUES (v_user, _amount, trim(_pix_key), coalesce(_pix_type, 'cpf'), _full_name, 'pending')
  RETURNING id INTO v_request;

  -- Lock commissions FIFO until amount is covered
  FOR r IN
    SELECT id, amount FROM public.referral_commissions
    WHERE referrer_id = v_user AND status = 'available'
    ORDER BY created_at
  LOOP
    EXIT WHEN v_locked >= _amount;
    UPDATE public.referral_commissions SET status = 'locked', withdrawal_id = v_request WHERE id = r.id;
    v_locked := v_locked + r.amount;
  END LOOP;

  RETURN v_request;
END;
$$;

-- 7. Function: process withdrawal (admin)
CREATE OR REPLACE FUNCTION public.process_withdrawal(_request_id uuid, _approve boolean, _note text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT app_private.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;

  IF _approve THEN
    UPDATE public.withdrawal_requests
      SET status = 'paid', processed_at = now(), admin_note = _note
      WHERE id = _request_id AND status = 'pending';
    UPDATE public.referral_commissions SET status = 'paid'
      WHERE withdrawal_id = _request_id;
  ELSE
    UPDATE public.withdrawal_requests
      SET status = 'rejected', processed_at = now(), admin_note = _note
      WHERE id = _request_id AND status = 'pending';
    UPDATE public.referral_commissions SET status = 'available', withdrawal_id = NULL
      WHERE withdrawal_id = _request_id;
  END IF;
END;
$$;
