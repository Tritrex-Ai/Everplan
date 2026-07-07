-- Vendor role: same access as "team" (timeline + live board, never private
-- shots), just a distinct label so an owner can tell apart a second shooter
-- from a hired vendor in the member list.
alter type public.member_role add value 'vendor';

-- Guest sharing: a no-login, read-only view of the timeline (blocks only —
-- never shots, private or shared) via an unguessable per-event link/QR
-- code. Off by default (null); the owner explicitly turns it on, which is
-- the only real privacy control here.
--
-- This is a bearer-link trust model, same as a shared Google Doc or Zoom
-- link: Supabase Realtime authorizes postgres_changes subscriptions by
-- table-level RLS for the connecting role, not by which specific token a
-- client presented. RLS can only express "guest sharing is on for this
-- event" — it cannot check "this anon connection holds exactly this
-- token" once the token has already done its job of revealing the event id
-- via get_guest_event() below. Anyone holding the link can view the live
-- timeline for as long as sharing stays on; the owner turning it off is the
-- mitigation, same as revoking a shared link anywhere else.
alter table public.events
  add column guest_token uuid unique default null;

-- The owner already has an unconditional UPDATE policy on events
-- ("owners can update events"), so no new policy is needed for them to set
-- or clear guest_token.

-- Security-definer RPC: the only way an anonymous guest resolves a token
-- into an event. Returns just the fields the guest view needs — never
-- couple_names/guest_count/owner_id/coverage_needed. Bypasses RLS the same
-- way is_event_owner()/is_event_member() do (function owner is the table
-- owner, RLS not forced), so it works for the anon role without an events
-- SELECT policy for anon.
create or replace function public.get_guest_event(p_token uuid)
returns table (id uuid, title text, date date, location text)
language sql security definer set search_path = public
stable as $$
  select e.id, e.title, e.date, e.location
  from public.events e
  where e.guest_token = p_token;
$$;

grant execute on function public.get_guest_event(uuid) to anon;

-- Anonymous read access to blocks, scoped to "sharing is currently on" for
-- the block's event. Shots are deliberately never exposed here.
create policy "anon can view blocks for guest-shared events"
  on public.blocks for select to anon
  using (
    exists (
      select 1 from public.events e
      where e.id = blocks.event_id and e.guest_token is not null
    )
  );
