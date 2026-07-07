-- Fix: the "anon can view blocks for guest-shared events" policy's EXISTS
-- subquery reads public.events directly. That subquery runs as the anon
-- role (the same role executing the outer blocks query), and events' own
-- RLS has no policy granting anon any visibility at all — so the subquery
-- always saw zero rows and the EXISTS check was always false, silently
-- hiding every block from every guest regardless of guest_token.
--
-- Same fix pattern already used for is_event_owner()/is_event_member():
-- wrap the events lookup in a SECURITY DEFINER function. Because the
-- function is owned by the table owner and events isn't under FORCE ROW
-- LEVEL SECURITY, queries inside the function body bypass RLS entirely —
-- regardless of which role called the function. A raw subquery inline in
-- the policy does not get this bypass; only a security-definer function
-- call does.

create or replace function public.is_guest_shared(p_event_id uuid)
returns boolean
language sql security definer set search_path = public
stable as $$
  select exists (
    select 1 from public.events e
    where e.id = p_event_id and e.guest_token is not null
  );
$$;

drop policy if exists "anon can view blocks for guest-shared events" on public.blocks;

create policy "anon can view blocks for guest-shared events"
  on public.blocks for select to anon
  using (public.is_guest_shared(event_id));
