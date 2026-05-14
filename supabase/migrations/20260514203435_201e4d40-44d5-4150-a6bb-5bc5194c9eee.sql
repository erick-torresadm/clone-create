
-- 1) Cupons: remover leitura pública
DROP POLICY IF EXISTS "Coupons public read active" ON public.coupons;

-- 2) Mover telegram_admin_chat_id para tabela admin-only
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id integer PRIMARY KEY DEFAULT 1,
  telegram_admin_chat_id text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_settings_singleton CHECK (id = 1)
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin settings read" ON public.admin_settings
  FOR SELECT TO authenticated
  USING (app_private.is_admin(auth.uid()));

CREATE POLICY "Admin settings write" ON public.admin_settings
  FOR ALL TO authenticated
  USING (app_private.is_admin(auth.uid()))
  WITH CHECK (app_private.is_admin(auth.uid()));

-- Migrar valor existente
INSERT INTO public.admin_settings (id, telegram_admin_chat_id)
SELECT 1, telegram_admin_chat_id FROM public.site_settings WHERE id = 1
ON CONFLICT (id) DO UPDATE SET telegram_admin_chat_id = EXCLUDED.telegram_admin_chat_id;

-- Remover coluna sensível de site_settings
ALTER TABLE public.site_settings DROP COLUMN IF EXISTS telegram_admin_chat_id;
