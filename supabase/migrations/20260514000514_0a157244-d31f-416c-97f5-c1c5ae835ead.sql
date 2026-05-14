DROP INDEX IF EXISTS public.products_external_unique;
DROP INDEX IF EXISTS public.products_external_provider_id_unique;
ALTER TABLE public.products ADD CONSTRAINT products_external_provider_id_key UNIQUE (external_provider, external_id);