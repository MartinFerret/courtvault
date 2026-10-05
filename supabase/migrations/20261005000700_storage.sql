-- Private bucket for user card photos: compressed thumbnails only (200 KB hard cap at the
-- bucket level, target under 100 KB on the device), one folder per user, photo cap per plan.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('card-photos', 'card-photos', false, 204800, array['image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "read own card photos" on storage.objects
for select to authenticated
using (bucket_id = 'card-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "upload own card photos within cap" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'card-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and public.within_photo_cap((select auth.uid()))
);

create policy "update own card photos" on storage.objects
for update to authenticated
using (bucket_id = 'card-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'card-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "delete own card photos" on storage.objects
for delete to authenticated
using (bucket_id = 'card-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
