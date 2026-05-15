
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS meta_pixel_id text;

ALTER TABLE public.support_conversations
  ADD COLUMN IF NOT EXISTS client_email text,
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS client_ip text,
  ADD COLUMN IF NOT EXISTS client_user_agent text;
