-- Create the shot-photos storage bucket
insert into storage.buckets (id, name, public) 
values ('shot-photos', 'shot-photos', false)
on conflict (id) do nothing;

-- storage.objects already has RLS enabled by default on every Supabase
-- project (Supabase manages this at the platform level) — the migration
-- role isn't the table owner (supabase_storage_admin is), so an explicit
-- `alter table storage.objects enable row level security` here fails with
-- "must be owner of table objects" instead of being a harmless no-op.

-- Policy: Anyone can read shot-photos (or we could limit it to authenticated users)
-- In Everplan, shots might be viewed by anyone with a guest link if shared, but usually they are authenticated.
-- Let's make reads authenticated-only by default, but if a guest link is used, they might need access.
-- The prototype currently uses signed URLs (`createSignedUrl`), which bypasses RLS for reading.
-- So we only need to secure uploads/deletes.
create policy "Authenticated users can upload photos"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'shot-photos' );

create policy "Authenticated users can update their photos"
  on storage.objects for update
  to authenticated
  using ( bucket_id = 'shot-photos' );

create policy "Authenticated users can delete photos"
  on storage.objects for delete
  to authenticated
  using ( bucket_id = 'shot-photos' );

create policy "Authenticated users can read photos"
  on storage.objects for select
  to authenticated
  using ( bucket_id = 'shot-photos' );
