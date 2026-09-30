-- Guest photo uploads: wedding guests contribute their own photos via the
-- no-login guest link, subject to owner approval before they show up in the
-- shared gallery. Builds on `event_images`, which the init migration already
-- shaped for exactly this ("every upload is tagged with the event and a
-- capture timestamp so the future guest-photo feature works without a
-- rebuild") — it just adds moderation state.

alter table public.event_images
  add column caption text,
  add column guest_name text,
  add column approved boolean not null default false;

-- Only SELECT ("members view event images") and INSERT ("members add event
-- images") existed before this — the owner needs UPDATE (approve) and
-- DELETE (reject/remove) too.
create policy "owners moderate event images"
  on public.event_images for update to authenticated
  using (public.is_event_owner(event_id))
  with check (public.is_event_owner(event_id));

create policy "owners delete event images"
  on public.event_images for delete to authenticated
  using (public.is_event_owner(event_id));

-- Private bucket. Anonymous guest uploads go through the service-role API
-- route (bypasses RLS entirely, same pattern as event-covers/avatars), so no
-- anon storage.objects policy is needed. The owner's own read/update/delete
-- from the workspace UI is scoped below by the {event_id}/{filename} path
-- convention, mirroring shot-photos' "owners manage shot photos" policy.
insert into storage.buckets (id, name, public)
values ('guest-photos', 'guest-photos', false)
on conflict (id) do nothing;

create policy "owners manage guest photos"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'guest-photos'
    and public.is_event_owner(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'guest-photos'
    and public.is_event_owner(((storage.foldername(name))[1])::uuid)
  );
