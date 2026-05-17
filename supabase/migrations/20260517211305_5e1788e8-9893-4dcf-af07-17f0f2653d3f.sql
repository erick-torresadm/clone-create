-- Add admin_notified_at to credit_purchases
ALTER TABLE public.credit_purchases
  ADD COLUMN IF NOT EXISTS admin_notified_at timestamptz;

-- Add admin_notified_at to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS admin_notified_at timestamptz;

-- Backfill: mark all currently paid/done credit_purchases as already notified,
-- EXCEPT the missed one from edilson (3b344442-919f-4e03-9e97-c68f0cdd8984) so it
-- gets retroactively delivered by the new recovery endpoint.
UPDATE public.credit_purchases
SET admin_notified_at = COALESCE(paid_at, created_at)
WHERE status IN ('paid', 'done')
  AND admin_notified_at IS NULL
  AND id <> '3b344442-919f-4e03-9e97-c68f0cdd8984';

-- Backfill: mark all currently paid/delivered orders as already notified.
UPDATE public.orders
SET admin_notified_at = created_at
WHERE status IN ('paid', 'delivered', 'refunded', 'canceled')
  AND admin_notified_at IS NULL;

-- Speed up the recovery sweep
CREATE INDEX IF NOT EXISTS credit_purchases_unnotified_paid_idx
  ON public.credit_purchases (paid_at)
  WHERE admin_notified_at IS NULL AND status IN ('paid', 'done');

CREATE INDEX IF NOT EXISTS orders_unnotified_paid_idx
  ON public.orders (created_at)
  WHERE admin_notified_at IS NULL AND status IN ('paid', 'delivered');