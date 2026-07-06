-- Reference-image storage for shots. The bucket is private; access is
-- governed entirely by RLS on storage.objects, mirroring the same privacy
-- rule as the shots table itself: the owner can always read/write; team
-- members can only read images on shots the owner has explicitly shared.
--
-- Path convention: {event_id}/{shot_id}/{filename}

insert into storage.buckets (id, name, public)
values ('shot-photos', 'shot-photos', false)
on conflict (id) do nothing;

create policy "owners manage shot photos"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'shot-photos'
    and exists (
      select 1 from public.shots s
      where s.id::text = (storage.foldername(name))[2]
        and s.event_id::text = (storage.foldername(name))[1]
        and public.is_event_owner(s.event_id)
    )
  )
  with check (
    bucket_id = 'shot-photos'
    and exists (
      select 1 from public.shots s
      where s.id::text = (storage.foldername(name))[2]
        and s.event_id::text = (storage.foldername(name))[1]
        and public.is_event_owner(s.event_id)
    )
  );

create policy "members view shared shot photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'shot-photos'
    and exists (
      select 1 from public.shots s
      where s.id::text = (storage.foldername(name))[2]
        and s.event_id::text = (storage.foldername(name))[1]
        and s.visibility = 'shared'
        and public.is_event_member(s.event_id)
    )
  );
