
CREATE TABLE public.telegram_subscribers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id bigint NOT NULL UNIQUE,
  user_id uuid,
  username text,
  first_name text,
  link_token text UNIQUE,
  active boolean NOT NULL DEFAULT true,
  subscribed_at timestamptz NOT NULL DEFAULT now(),
  last_notified_at timestamptz
);

CREATE INDEX idx_telegram_subscribers_user ON public.telegram_subscribers(user_id);
CREATE INDEX idx_telegram_subscribers_active ON public.telegram_subscribers(active);

ALTER TABLE public.telegram_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subs admin all" ON public.telegram_subscribers
  FOR ALL TO authenticated
  USING (app_private.is_admin(auth.uid()))
  WITH CHECK (app_private.is_admin(auth.uid()));

CREATE POLICY "Subs user read own" ON public.telegram_subscribers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Histórico de broadcasts (para não repetir avisos)
CREATE TABLE public.promo_broadcasts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kind text NOT NULL,
  reference_id text,
  title text,
  body text,
  recipients_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, reference_id)
);

ALTER TABLE public.promo_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Broadcasts admin all" ON public.promo_broadcasts
  FOR ALL TO authenticated
  USING (app_private.is_admin(auth.uid()))
  WITH CHECK (app_private.is_admin(auth.uid()));

-- Função para gerar/recuperar o token de vínculo do usuário logado
CREATE OR REPLACE FUNCTION public.get_or_create_telegram_link_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_token text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  -- já vinculado?
  SELECT link_token INTO v_token FROM public.telegram_subscribers
   WHERE user_id = v_user LIMIT 1;
  IF v_token IS NOT NULL THEN RETURN v_token; END IF;

  -- gera token determinístico curto
  v_token := 'u' || substr(replace(v_user::text, '-', ''), 1, 16);
  RETURN v_token;
END;
$$;
