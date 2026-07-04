-- Fix: the "members can view events" policy called is_event_member(id),
-- which internally re-queries the events table (via is_event_owner). Because
-- PostgreSQL's command-counter visibility means a row inserted by the
-- current command isn't visible to a sub-query within that same command,
-- this broke INSERT ... RETURNING on events (which PostgREST/supabase-js
-- always uses): the RETURNING-visibility recheck couldn't see the row it had
-- just inserted, so every insert failed with "new row violates row-level
-- security policy for table events" even though the row was written
-- correctly. Rewriting the policy to check owner_id directly (no
-- self-re-query) and only fan out to members for the non-owner case fixes
-- it. Other tables (blocks/shots/members/event_images) reference events and
-- members, not themselves, so they don't have this problem.

drop policy if exists "members can view events" on public.events;

create policy "members can view events"
  on public.events for select to authenticated
  using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.members m
      where m.event_id = events.id and m.user_id = auth.uid() and m.status = 'active'
    )
  );
