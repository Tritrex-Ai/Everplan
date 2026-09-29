-- Public storage bucket for event cover photos. Uploads/deletes go through
-- the admin API route (service role, ownership checked in application code —
-- same pattern as the avatars bucket), so no RLS policies are needed here:
-- a public bucket serves reads directly, and the service role bypasses RLS
-- for writes regardless of policy.
insert into storage.buckets (id, name, public)
values ('event-covers', 'event-covers', true)
on conflict (id) do nothing;
