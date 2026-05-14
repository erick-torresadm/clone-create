-- 1) Unique index for ON CONFLICT(external_provider, external_id)
CREATE UNIQUE INDEX IF NOT EXISTS products_external_provider_id_unique
  ON public.products (external_provider, external_id)
  WHERE external_provider IS NOT NULL AND external_id IS NOT NULL;

-- 2) Site visibility / layout controls
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS home_max_products integer NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS home_show_categories boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS home_show_all_products boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS home_grid_cols integer NOT NULL DEFAULT 4;