
-- 1) Tighten Orders INSERT: require user_id = auth.uid() (no NULL)
DROP POLICY IF EXISTS "Orders: insert own" ON public.orders;
CREATE POLICY "Orders: insert own"
  ON public.orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- 2) Coupons: allow lookup of active coupons by code (cart validation needs this)
DROP POLICY IF EXISTS "Coupons public read active" ON public.coupons;
CREATE POLICY "Coupons public read active"
  ON public.coupons FOR SELECT TO anon, authenticated
  USING (active = true);

-- 3) Support-media: make bucket private; restrict reads to admins or
--    conversation participants based on path prefix = '<convo_id>/...'
UPDATE storage.buckets SET public = false WHERE id = 'support-media';

DROP POLICY IF EXISTS "support-media public read" ON storage.objects;
DROP POLICY IF EXISTS "support-media admin write" ON storage.objects;
DROP POLICY IF EXISTS "support-media admin update" ON storage.objects;
DROP POLICY IF EXISTS "support-media admin delete" ON storage.objects;
DROP POLICY IF EXISTS "support-media participants read" ON storage.objects;
DROP POLICY IF EXISTS "support-media admin all" ON storage.objects;
DROP POLICY IF EXISTS "support-media user insert own convo" ON storage.objects;

-- Admin: full access
CREATE POLICY "support-media admin all"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'support-media' AND app_private.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'support-media' AND app_private.is_admin(auth.uid()));

-- Conversation participants: read files in their own conversation folder
CREATE POLICY "support-media participants read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'support-media'
    AND EXISTS (
      SELECT 1 FROM public.support_conversations c
      WHERE c.user_id = auth.uid()
        AND (storage.foldername(name))[1] = c.id::text
    )
  );

-- Conversation participants: upload files into their own conversation folder
CREATE POLICY "support-media user insert own convo"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'support-media'
    AND EXISTS (
      SELECT 1 FROM public.support_conversations c
      WHERE c.user_id = auth.uid()
        AND (storage.foldername(name))[1] = c.id::text
    )
  );

-- 4) Realtime messages: enable RLS so random users can't subscribe to
--    arbitrary topics. Allow only authenticated, and only for conversation
--    topics they own (or admins).
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "realtime: authenticated topics" ON realtime.messages;
CREATE POLICY "realtime: authenticated topics"
  ON realtime.messages FOR SELECT TO authenticated
  USING (
    -- Admins can subscribe to anything
    app_private.is_admin(auth.uid())
    -- Participants can subscribe to topics scoped to their conversation
    OR EXISTS (
      SELECT 1 FROM public.support_conversations c
      WHERE c.user_id = auth.uid()
        AND realtime.topic() IN (
          'support-user-' || c.id::text,
          'support-typing-' || c.id::text
        )
    )
  );

-- 5) Revoke EXECUTE from anon on sensitive SECURITY DEFINER functions.
REVOKE EXECUTE ON FUNCTION public.claim_stock(uuid, integer, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.request_withdrawal(numeric, text, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.process_withdrawal(uuid, boolean, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.process_reseller(uuid, boolean, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.request_reseller(text, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.register_referral_commission(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_or_create_telegram_link_token() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.increment_coupon_usage(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.support_mark_read_user(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.support_mark_read_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.my_reseller_discount() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_approved_reseller(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_db_size() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_stock_counts() FROM anon, public;

-- 6) Clear any leaked admin chat IDs from public site_settings telegram/whatsapp fields.
UPDATE public.site_settings SET telegram = NULL, whatsapp = NULL WHERE id = 1;
