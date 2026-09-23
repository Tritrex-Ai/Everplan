-- Reusable timeline templates. A template's blocks are stored as HH:MM
-- time-of-day text (matching the shape of an AI-drafted block, see
-- src/lib/types.ts DraftBlock) rather than absolute timestamps, since a
-- template isn't tied to any one event's date — applying it to an event
-- runs the same blockTimes(event.date, start, end) conversion the AI
-- builder already uses to turn HH:MM into that event's real start/end.

create table public.templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.template_blocks (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates (id) on delete cascade,
  title text not null,
  start_time text not null, -- "HH:MM", 24h
  end_time text not null, -- "HH:MM", 24h
  location text,
  notes text,
  position integer not null default 0
);

alter table public.templates enable row level security;
alter table public.template_blocks enable row level security;

create policy "owner manages own templates"
  on public.templates for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "owner manages own template blocks"
  on public.template_blocks for all to authenticated
  using (
    exists (
      select 1 from public.templates t
      where t.id = template_id and t.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.templates t
      where t.id = template_id and t.owner_id = auth.uid()
    )
  );
