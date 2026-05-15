
-- Reseller program
CREATE TABLE public.reseller_accounts (
  user_id uuid PRIMARY KEY,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  whatsapp text,
  telegram text,
  reason text,
  discount_pct numeric NOT NULL DEFAULT 50 CHECK (discount_pct >= 0 AND discount_pct <= 90),
  admin_note text,
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reseller_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reseller: read own"
ON public.reseller_accounts FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Reseller: admin read all"
ON public.reseller_accounts FOR SELECT TO authenticated
USING (app_private.is_admin(auth.uid()));

CREATE POLICY "Reseller: insert own pending"
ON public.reseller_accounts FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Reseller: admin write"
ON public.reseller_accounts FOR ALL TO authenticated
USING (app_private.is_admin(auth.uid()))
WITH CHECK (app_private.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.update_reseller_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_reseller_updated_at
BEFORE UPDATE ON public.reseller_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_reseller_updated_at();

-- Helper: is approved reseller?
CREATE OR REPLACE FUNCTION public.is_approved_reseller(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.reseller_accounts
    WHERE user_id = _user_id AND status = 'approved'
  );
$$;

-- Get current user's reseller discount (0 if not approved)
CREATE OR REPLACE FUNCTION public.my_reseller_discount()
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT coalesce(
    (SELECT discount_pct FROM public.reseller_accounts
      WHERE user_id = auth.uid() AND status = 'approved'),
    0
  );
$$;

-- Admin RPC: approve / reject a reseller
CREATE OR REPLACE FUNCTION public.process_reseller(_user_id uuid, _approve boolean, _note text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT app_private.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _approve THEN
    UPDATE public.reseller_accounts
      SET status = 'approved', approved_at = now(), approved_by = auth.uid(), admin_note = _note
      WHERE user_id = _user_id;
  ELSE
    UPDATE public.reseller_accounts
      SET status = 'rejected', approved_at = now(), approved_by = auth.uid(), admin_note = _note
      WHERE user_id = _user_id;
  END IF;
END;
$$;

-- Self request: create or revive a pending request
CREATE OR REPLACE FUNCTION public.request_reseller(_whatsapp text, _telegram text, _reason text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO public.reseller_accounts (user_id, whatsapp, telegram, reason, status)
  VALUES (v_user, _whatsapp, _telegram, _reason, 'pending')
  ON CONFLICT (user_id) DO UPDATE
    SET whatsapp = excluded.whatsapp,
        telegram = excluded.telegram,
        reason = excluded.reason,
        status = CASE WHEN public.reseller_accounts.status = 'approved'
                      THEN 'approved' ELSE 'pending' END,
        admin_note = NULL;
END;
$$;
