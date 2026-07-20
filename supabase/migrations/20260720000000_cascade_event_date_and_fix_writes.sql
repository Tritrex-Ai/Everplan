-- Editing an event's date used to only touch the events row. Every block
-- keeps its own absolute start_time/end_time timestamps (set once, at
-- creation or last edit), so nothing about them updates just because the
-- event's date changes elsewhere — and the Timeline tab only ever displays
-- time-of-day, never the date, so a block silently sitting on the wrong day
-- was invisible until someone checked the guest board or the raw row.
--
-- Fix at the source: whenever an event's date changes, shift every one of
-- its blocks' start_time/end_time by the same delta, in the same
-- transaction as the event update. This works regardless of which code path
-- changes the date (the Edit Event form today, anything else tomorrow).
create or replace function public.shift_blocks_on_event_date_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  delta interval;
begin
  if new.date is distinct from old.date then
    delta := (new.date - old.date) * interval '1 day';
    update public.blocks
    set start_time = start_time + delta,
        end_time = end_time + delta
    where event_id = new.id;
  end if;
  return new;
end;
$$;

create trigger events_shift_blocks_on_date_change
  after update on public.events
  for each row execute function public.shift_blocks_on_event_date_change();
