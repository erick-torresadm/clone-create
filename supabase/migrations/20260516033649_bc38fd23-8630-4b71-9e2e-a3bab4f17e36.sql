
CREATE TABLE public.credit_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_email text NOT NULL,
  lovable_email text NOT NULL,
  credits integer NOT NULL,
  cycles integer NOT NULL,
  cycles_completed integer NOT NULL DEFAULT 0,
  daily_cycles_completed integer NOT NULL DEFAULT 0,
  last_cycle_date text,
  package_id text NOT NULL,
  price_brl numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  asaas_payment_id text,
  asaas_customer_id text,
  pix_payload text,
  pix_qr_base64 text,
  pix_expires_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_credit_purchases_payment ON public.credit_purchases(asaas_payment_id);
CREATE INDEX idx_credit_purchases_lovable_email ON public.credit_purchases(lovable_email);
CREATE INDEX idx_credit_purchases_status ON public.credit_purchases(status);

ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;

-- Admin total
CREATE POLICY "Credit purchases admin all"
  ON public.credit_purchases
  FOR ALL
  TO authenticated
  USING (app_private.is_admin(auth.uid()))
  WITH CHECK (app_private.is_admin(auth.uid()));
