-- The guest-photo moderation panel subscribes to event_images via
-- postgres_changes (approve/reject should show up live, same as
-- blocks/shots/events already do) — without this, the table was never
-- added to the publication, so those events never fired.
alter publication supabase_realtime add table public.event_images;
