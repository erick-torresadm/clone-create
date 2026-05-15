-- 1) Banner de cupom editável no admin
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS welcome_coupon_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS welcome_coupon_text text NOT NULL DEFAULT '💸 CUPOM DE BOAS VINDAS:',
  ADD COLUMN IF NOT EXISTS welcome_coupon_code text NOT NULL DEFAULT 'BEMVINDO10';

-- 2) Sons habilitáveis pelo admin
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS sounds_enabled boolean NOT NULL DEFAULT true;

-- 3) Chat de suporte (user <-> admin)
CREATE TABLE IF NOT EXISTS public.support_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text,
  status text NOT NULL DEFAULT 'open', -- open | closed
  last_message_at timestamptz NOT NULL DEFAULT now(),
  unread_user int NOT NULL DEFAULT 0,
  unread_admin int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS support_conversations_user_idx ON public.support_conversations(user_id);
CREATE INDEX IF NOT EXISTS support_conversations_last_msg_idx ON public.support_conversations(last_message_at DESC);

CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('user','admin')),
  sender_id uuid,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS support_messages_convo_idx ON public.support_messages(conversation_id, created_at);

ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Conversations RLS
CREATE POLICY "Convo: user read own" ON public.support_conversations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Convo: admin read all" ON public.support_conversations
  FOR SELECT TO authenticated USING (app_private.is_admin(auth.uid()));
CREATE POLICY "Convo: user insert own" ON public.support_conversations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Convo: admin update" ON public.support_conversations
  FOR UPDATE TO authenticated USING (app_private.is_admin(auth.uid())) WITH CHECK (app_private.is_admin(auth.uid()));
CREATE POLICY "Convo: user update own" ON public.support_conversations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Messages RLS
CREATE POLICY "Msg: user read own" ON public.support_messages
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.support_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid())
  );
CREATE POLICY "Msg: admin read all" ON public.support_messages
  FOR SELECT TO authenticated USING (app_private.is_admin(auth.uid()));
CREATE POLICY "Msg: user insert own" ON public.support_messages
  FOR INSERT TO authenticated WITH CHECK (
    sender = 'user' AND sender_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.support_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid())
  );
CREATE POLICY "Msg: admin insert" ON public.support_messages
  FOR INSERT TO authenticated WITH CHECK (
    sender = 'admin' AND app_private.is_admin(auth.uid())
  );

-- Trigger: keep last_message_at + unread counters in sync
CREATE OR REPLACE FUNCTION public.support_after_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.sender = 'user' THEN
    UPDATE public.support_conversations
      SET last_message_at = NEW.created_at, unread_admin = unread_admin + 1, status = 'open'
      WHERE id = NEW.conversation_id;
  ELSE
    UPDATE public.support_conversations
      SET last_message_at = NEW.created_at, unread_user = unread_user + 1
      WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS support_after_message_t ON public.support_messages;
CREATE TRIGGER support_after_message_t
AFTER INSERT ON public.support_messages
FOR EACH ROW EXECUTE FUNCTION public.support_after_message();

-- Mark-read RPCs
CREATE OR REPLACE FUNCTION public.support_mark_read_user(_convo uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.support_conversations SET unread_user = 0
   WHERE id = _convo AND user_id = auth.uid();
$$;
CREATE OR REPLACE FUNCTION public.support_mark_read_admin(_convo uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.support_conversations SET unread_admin = 0
   WHERE id = _convo AND app_private.is_admin(auth.uid());
$$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_conversations;