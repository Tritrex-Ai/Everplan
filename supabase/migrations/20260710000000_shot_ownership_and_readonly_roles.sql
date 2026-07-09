-- Shot ownership: team members get their own private shot list (the
-- "photographer view"), not just read/check-off access to the owner's list.
-- Every shot now has a real author; sharing is still the existing
-- visibility toggle, just checked against the author instead of "any
-- active member." This also closes two real gaps found while building this:
-- (1) the old shots UPDATE policy let any active member (including vendor)
-- edit title/description/photos on any shared shot, not just toggle it;
-- (2) 20260707020000_storage_setup.sql added storage.objects policies that
-- grant any authenticated user full read/write/delete on any file in the
-- shot-photos bucket, coexisting with (not replacing) the original scoped
-- policies from 20260706000000_shot_reference_photos.sql.

-- "Client" role: a read-only recipient distinct from "vendor" in the invite
-- UI and member list — same capability tier (see ViewerRole in
-- src/lib/roles.ts, which already treats anything but owner/team as
-- read-only), just a clearer label for sharing a mood board with the
-- person the work is for (a bride, a brand contact, etc.) rather than a
-- hired vendor.
alter type public.member_role add value 'client';

alter table public.shots
  add column created_by uuid references public.profiles (id) on delete cascade;

-- Backfill: every existing shot was created under the old owner-only
-- insert policy, so the event owner is the correct author of record.
update public.shots s
set created_by = e.owner_id
from public.events e
where e.id = s.event_id
  and s.created_by is null;

alter table public.shots
  alter column created_by set not null,
  alter column created_by set default auth.uid();

-- ---------------------------------------------------------------------------
-- New access helper: is the caller an active *team* member on this event?
-- (Distinct from is_event_member(), which is true for any active role
-- including vendor — vendor must NOT get shot-creation or block-write
-- access, that's the whole point of "read-only.")
-- ---------------------------------------------------------------------------
create or replace function public.is_event_team_member(eid uuid)
returns boolean
language sql security definer set search_path = public
stable as $$
  select exists (
    select 1 from public.members m
    where m.event_id = eid and m.user_id = auth.uid()
      and m.status = 'active' and m.role = 'team'
  );
$$;

-- ---------------------------------------------------------------------------
-- Shots: owner or team member may create (as themselves); owner sees
-- everything, a creator always sees their own regardless of visibility,
-- everyone else only sees what's been marked shared; only the owner or the
-- creator may update/delete a shot.
-- ---------------------------------------------------------------------------
drop policy "owners create shots" on public.shots;
create policy "owners and team create shots"
  on public.shots for insert to authenticated
  with check (
    created_by = auth.uid()
    and (public.is_event_owner(event_id) or public.is_event_team_member(event_id))
  );

drop policy "owners see all shots, members see shared shots" on public.shots;
create policy "owners see all, creators see own, members see shared"
  on public.shots for select to authenticated
  using (
    public.is_event_owner(event_id)
    or created_by = auth.uid()
    or (visibility = 'shared' and public.is_event_member(event_id))
  );

-- Update is intentionally two-tier: owner or creator may change anything;
-- any other team member may still toggle capture status on a shot that's
-- been shared with them (the existing "check it off during the event"
-- workflow every team member already has today) but can't edit its
-- content, re-share it, or delete it. Vendor/readonly can never update a
-- shot at all — that's the read-only fix.
drop policy "owners update all shots, members update shared shots" on public.shots;
create policy "owners, creators, and team update shots"
  on public.shots for update to authenticated
  using (
    public.is_event_owner(event_id)
    or created_by = auth.uid()
    or (visibility = 'shared' and public.is_event_team_member(event_id))
  )
  with check (
    public.is_event_owner(event_id)
    or created_by = auth.uid()
    or (visibility = 'shared' and public.is_event_team_member(event_id))
  );

drop policy "owners delete shots" on public.shots;
create policy "owners and creators delete shots"
  on public.shots for delete to authenticated
  using (public.is_event_owner(event_id) or created_by = auth.uid());

-- Column guard: the row-level policy above lets a non-owner, non-creator
-- team member update a shared shot at all (for the capture-status toggle),
-- but RLS can't express "only these columns" — a trigger can. Generalizes
-- the old guard_shot_visibility trigger to guard every content/visibility
-- column, not just visibility.
drop trigger shots_guard_visibility on public.shots;
drop function public.guard_shot_visibility();

create or replace function public.guard_shot_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_event_owner(new.event_id) or new.created_by = auth.uid() then
    return new;
  end if;
  if new.title is distinct from old.title
     or new.description is distinct from old.description
     or new.priority is distinct from old.priority
     or new.visibility is distinct from old.visibility
     or new.reference_images is distinct from old.reference_images
     or new.block_id is distinct from old.block_id
     or new.created_by is distinct from old.created_by then
    raise exception 'only the shot owner or creator can edit this shot';
  end if;
  return new;
end;
$$;

create trigger shots_guard_update
  before update on public.shots
  for each row execute function public.guard_shot_update();

-- ---------------------------------------------------------------------------
-- Blocks: only owner or team may write (mark done / running late). This is
-- what actually makes vendor read-only on the live board — today any active
-- member, vendor included, can update block status.
-- ---------------------------------------------------------------------------
drop policy "members can update blocks" on public.blocks;
create policy "owners and team update blocks"
  on public.blocks for update to authenticated
  using (public.is_event_owner(event_id) or public.is_event_team_member(event_id))
  with check (public.is_event_owner(event_id) or public.is_event_team_member(event_id));

-- ---------------------------------------------------------------------------
-- Storage RLS fix: drop the overly-broad "any authenticated user" policies
-- and replace with one scoped to the shot's creator, alongside the
-- existing owner-manage and member-view-shared policies (unchanged).
-- ---------------------------------------------------------------------------
drop policy "Authenticated users can upload photos" on storage.objects;
drop policy "Authenticated users can update their photos" on storage.objects;
drop policy "Authenticated users can delete photos" on storage.objects;
drop policy "Authenticated users can read photos" on storage.objects;

create policy "creators manage own shot photos"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'shot-photos'
    and exists (
      select 1 from public.shots s
      where s.id::text = (storage.foldername(name))[2]
        and s.event_id::text = (storage.foldername(name))[1]
        and s.created_by = auth.uid()
    )
  )
  with check (
    bucket_id = 'shot-photos'
    and exists (
      select 1 from public.shots s
      where s.id::text = (storage.foldername(name))[2]
        and s.event_id::text = (storage.foldername(name))[1]
        and s.created_by = auth.uid()
    )
  );
