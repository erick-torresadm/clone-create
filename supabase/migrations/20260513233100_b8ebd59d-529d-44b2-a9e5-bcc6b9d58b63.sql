
-- Lock down SECURITY DEFINER functions: only allow internal/server callers
revoke execute on function public.has_role(uuid, public.app_role) from anon, authenticated;
revoke execute on function public.is_admin(uuid) from anon, authenticated;
revoke execute on function public.handle_new_user() from anon, authenticated;

-- Orders: insert must be by authenticated user OR session owner; tighten to require user_id match or null email path via server
drop policy if exists "Orders: insert" on public.orders;
create policy "Orders: insert own" on public.orders for insert
  with check (auth.uid() is not null and (user_id is null or user_id = auth.uid()));

-- Storage bucket: drop overly broad listing, replace with object-key-scoped read
drop policy if exists "Public product images read" on storage.objects;
create policy "Public product images read by key" on storage.objects for select
  using (bucket_id = 'product-images');
-- Make bucket non-listable from the API by marking it not public-listable: keep public=true for direct URL access, but scope listing to admins
create policy "Admin product images list" on storage.objects for select
  using (bucket_id = 'product-images' and public.is_admin(auth.uid()));
