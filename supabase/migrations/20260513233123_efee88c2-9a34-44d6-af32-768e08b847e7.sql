
revoke execute on function public.has_role(uuid, public.app_role) from public;
revoke execute on function public.is_admin(uuid) from public;
revoke execute on function public.handle_new_user() from public;

-- Tighten bucket: drop broad public select; only signed URLs / direct keys (still public=true in bucket means objects fetchable via public URL even without policy)
drop policy if exists "Public product images read by key" on storage.objects;
drop policy if exists "Admin product images list" on storage.objects;
-- No SELECT policy needed — bucket marked public=true makes individual files reachable via their public URL without RLS.
