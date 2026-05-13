
alter table public.products
  add column if not exists source text not null default 'manual',
  add column if not exists external_provider text,
  add column if not exists external_id text,
  add column if not exists external_price numeric,
  add column if not exists external_currency text,
  add column if not exists external_quantity integer;

create unique index if not exists products_external_unique
  on public.products(external_provider, external_id)
  where external_provider is not null and external_id is not null;

alter table public.site_settings
  add column if not exists brl_per_vnd numeric not null default 0.00024,
  add column if not exists brl_per_usd numeric not null default 5.50;
