insert into storage.buckets (id, name, public)
values ('support-media','support-media', true)
on conflict (id) do nothing;

drop policy if exists "support-media public read" on storage.objects;
create policy "support-media public read"
on storage.objects for select
using (bucket_id = 'support-media');

drop policy if exists "support-media admin write" on storage.objects;
create policy "support-media admin write"
on storage.objects for insert
to authenticated
with check (bucket_id = 'support-media' and app_private.is_admin(auth.uid()));

drop policy if exists "support-media admin update" on storage.objects;
create policy "support-media admin update"
on storage.objects for update
to authenticated
using (bucket_id = 'support-media' and app_private.is_admin(auth.uid()));

drop policy if exists "support-media admin delete" on storage.objects;
create policy "support-media admin delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'support-media' and app_private.is_admin(auth.uid()));