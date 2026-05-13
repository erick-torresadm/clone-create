
alter table public.orders
  add column if not exists delivered_data jsonb,
  add column if not exists external_order_id text;

alter table public.products
  add column if not exists auto_sync boolean not null default true;
