-- Per-block guest visibility. Today the guest link is all-or-nothing: every
-- block on the timeline shows up. The owner needs to keep internal/prep
-- blocks (bridal prep, logistics) off the guest link while still surfacing
-- the public-facing ones (ceremony, reception).
--
-- Defaults to true so every existing block — including ones on events with
-- an already-active guest link — keeps showing exactly as it does today.
-- Nothing changes for anyone until an owner explicitly hides a block.
alter table public.blocks
  add column guest_visible boolean not null default true;

drop policy "anon can view blocks for guest-shared events" on public.blocks;

create policy "anon can view blocks for guest-shared events"
  on public.blocks for select to anon
  using (public.is_guest_shared(event_id) and guest_visible);
