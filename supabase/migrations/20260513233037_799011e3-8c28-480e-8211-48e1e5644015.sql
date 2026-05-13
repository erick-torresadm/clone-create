
-- Roles enum and tables
create type public.app_role as enum ('admin', 'user');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_admin(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(_user_id, 'admin')
$$;

-- First user becomes admin, others get 'user'
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare user_count int;
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));

  select count(*) into user_count from public.user_roles;
  if user_count = 0 then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'user');
  end if;
  return new;
end; $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Profiles policies
create policy "Profiles: view own or admin" on public.profiles for select
  using (auth.uid() = id or public.is_admin(auth.uid()));
create policy "Profiles: update own" on public.profiles for update
  using (auth.uid() = id);

-- User roles policies
create policy "Roles: view own or admin" on public.user_roles for select
  using (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy "Roles: admin manage" on public.user_roles for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Sections
create table public.sections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  emoji text,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.sections enable row level security;
create policy "Sections public read" on public.sections for select using (active = true or public.is_admin(auth.uid()));
create policy "Sections admin write" on public.sections for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Products
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  section_id uuid references public.sections(id) on delete set null,
  price numeric(10,2) not null,
  old_price numeric(10,2),
  image_url text,
  badge text,
  description text,
  sold int not null default 0,
  rating numeric(2,1),
  reviews int not null default 0,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.products enable row level security;
create policy "Products public read" on public.products for select using (active = true or public.is_admin(auth.uid()));
create policy "Products admin write" on public.products for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Coupons
create type public.discount_type as enum ('percent','fixed');
create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  discount_type public.discount_type not null default 'percent',
  value numeric(10,2) not null,
  min_order numeric(10,2) not null default 0,
  max_uses int,
  used_count int not null default 0,
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.coupons enable row level security;
-- Public can read active coupons (to validate at checkout)
create policy "Coupons public read active" on public.coupons for select using (active = true or public.is_admin(auth.uid()));
create policy "Coupons admin write" on public.coupons for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Popups / News
create table public.popups (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  image_url text,
  cta_label text,
  cta_url text,
  audience text not null default 'all',
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.popups enable row level security;
create policy "Popups public read active" on public.popups for select using (
  active = true and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now())
  or public.is_admin(auth.uid())
);
create policy "Popups admin write" on public.popups for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Site settings (singleton row id=1)
create table public.site_settings (
  id int primary key default 1,
  store_name text not null default 'FDM store',
  hero_title text not null default 'A maior loja de perfis e contas premium',
  hero_subtitle text not null default 'Entrega automática, suporte 24/7, garantia.',
  announcement_bar text,
  primary_color text not null default '#0042A9',
  accent_color text not null default '#638CFF',
  logo_url text,
  whatsapp text,
  telegram text,
  updated_at timestamptz not null default now(),
  constraint singleton check (id = 1)
);
alter table public.site_settings enable row level security;
create policy "Settings public read" on public.site_settings for select using (true);
create policy "Settings admin write" on public.site_settings for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
insert into public.site_settings (id) values (1) on conflict do nothing;

-- Orders
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  items jsonb not null,
  subtotal numeric(10,2) not null,
  discount numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  coupon_code text,
  stripe_session_id text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
alter table public.orders enable row level security;
create policy "Orders: own or admin read" on public.orders for select using (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy "Orders: insert" on public.orders for insert with check (true);
create policy "Orders: admin update" on public.orders for update using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Storage bucket for product images
insert into storage.buckets (id, name, public) values ('product-images','product-images', true) on conflict do nothing;
create policy "Public product images read" on storage.objects for select using (bucket_id = 'product-images');
create policy "Admin product images write" on storage.objects for insert with check (bucket_id = 'product-images' and public.is_admin(auth.uid()));
create policy "Admin product images update" on storage.objects for update using (bucket_id = 'product-images' and public.is_admin(auth.uid()));
create policy "Admin product images delete" on storage.objects for delete using (bucket_id = 'product-images' and public.is_admin(auth.uid()));

-- Seed initial sections + products from current catalog
with s as (
  insert into public.sections (title, emoji, sort_order) values
    ('Perfis Brasileiros — Básicos', '🇧🇷', 1),
    ('Prontos pra Rodar (BM 300)', '🇧🇷', 2),
    ('Linha Expert (Restabelecidos)', '🔺', 3),
    ('Opções Gringas (USA)', '🇺🇸', 4),
    ('Perfil PRO Selfie — Mais vendidos', '🔺🇧🇷', 5)
  returning id, title
)
insert into public.products (name, section_id, price, old_price, badge, sold, rating, reviews, sort_order)
select * from (values
  ('Perfil BR — Comum', (select id from s where title='Perfis Brasileiros — Básicos'), 90, 149, null, 1240, 4.9, 312, 1),
  ('Perfil BR — Verificado', (select id from s where title='Perfis Brasileiros — Básicos'), 110, 179, null, 980, 4.9, 220, 2),
  ('Perfil BR — Restabelecido', (select id from s where title='Perfis Brasileiros — Básicos'), 135, 219, null, 740, 4.8, 180, 3),
  ('BM 300 — Comum', (select id from s where title='Prontos pra Rodar (BM 300)'), 150, 249, 'BM 300', 860, 4.9, 240, 1),
  ('BM 300 — Verificado', (select id from s where title='Prontos pra Rodar (BM 300)'), 180, 299, 'BM 300', 640, 4.9, 190, 2),
  ('BM 300 — Restabelecido', (select id from s where title='Prontos pra Rodar (BM 300)'), 197, 329, 'BM 300', 510, 4.9, 160, 3),
  ('Expert Júnior', (select id from s where title='Linha Expert (Restabelecidos)'), 197, 329, 'Expert', 420, 4.9, 130, 1),
  ('Expert Premium (1–2 meses)', (select id from s where title='Linha Expert (Restabelecidos)'), 257, 429, 'Premium', 310, 4.9, 95, 2),
  ('Expert Máster (3+ meses)', (select id from s where title='Linha Expert (Restabelecidos)'), 297, 497, 'Máster', 220, 5.0, 70, 3),
  ('USA — Perfil Aquecido', (select id from s where title='Opções Gringas (USA)'), 197, 329, 'USA', 380, 4.9, 110, 1),
  ('USA — Aquecido + BM', (select id from s where title='Opções Gringas (USA)'), 250, 419, 'USA + BM', 290, 4.9, 88, 2),
  ('USA — Aquecido + BM + Proxy', (select id from s where title='Opções Gringas (USA)'), 297, 497, 'USA Full', 210, 5.0, 64, 3),
  ('PRO Júnior — 30 dias', (select id from s where title='Perfil PRO Selfie — Mais vendidos'), 279, 469, 'TOP', 1820, 5.0, 410, 1),
  ('PRO Premium — 90 dias', (select id from s where title='Perfil PRO Selfie — Mais vendidos'), 447, 749, 'TOP', 1240, 5.0, 320, 2),
  ('PRO Máster — 180 dias', (select id from s where title='Perfil PRO Selfie — Mais vendidos'), 547, 919, 'TOP', 880, 5.0, 240, 3)
) as v(name, section_id, price, old_price, badge, sold, rating, reviews, sort_order);

-- Sample coupon
insert into public.coupons (code, discount_type, value, min_order, active) values
  ('FDM20', 'percent', 20, 0, true) on conflict do nothing;
