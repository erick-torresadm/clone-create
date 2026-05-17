
ALTER TABLE public.credit_purchases
  ADD COLUMN IF NOT EXISTS bonus_credits integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_percent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cashback_generated numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cashback_applied numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cashback_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS followup_d3_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS followup_d15_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS cashback_expiry_warned_at timestamptz,
  ADD COLUMN IF NOT EXISTS purchase_sequence integer;

CREATE INDEX IF NOT EXISTS idx_credit_purchases_buyer_email_paid
  ON public.credit_purchases (buyer_email, paid_at)
  WHERE status IN ('paid','done');

CREATE INDEX IF NOT EXISTS idx_credit_purchases_followup_d3
  ON public.credit_purchases (paid_at)
  WHERE status IN ('paid','done') AND followup_d3_sent_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_credit_purchases_followup_d15
  ON public.credit_purchases (paid_at)
  WHERE status IN ('paid','done') AND followup_d15_sent_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_credit_purchases_cashback_warn
  ON public.credit_purchases (cashback_expires_at)
  WHERE cashback_expires_at IS NOT NULL AND cashback_expiry_warned_at IS NULL;
