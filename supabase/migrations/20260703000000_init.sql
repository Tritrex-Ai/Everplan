-- Everplan prototype schema
-- Core shape: User -> Membership -> Project(event) -> Timeline blocks -> Shots (private layer)

-- ---------------------------------------------------------------------------
-- Profiles (mirror of auth.users we can reference and read)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are readable by signed-in users"
  on public.profiles for select to authenticated using (true);

create policy "users manage own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- Events (the "Project": one wedding / event)
-- ---------------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  -- event_type, guest_count, coverage_needed feed the AI timeline builder
  event_type text not null default 'Wedding',
  date date not null,
  location text,
  couple_names text,
  guest_count integer,
  coverage_needed text[] not null default '{photo}',
  cover_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Members (Membership carrying the role; roles beyond owner/team come later,
-- the enum leaves room for them without a rebuild)
-- ---------------------------------------------------------------------------
create type public.member_role as enum ('owner', 'team', 'coordinator', 'couple');

create table public.members (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  invited_email text not null,
  role public.member_role not null default 'team',
  color text not null default '#5B5BD6',
  status text not null default 'invited' check (status in ('invited', 'active')),
  created_at timestamptz not null default now(),
  unique (event_id, invited_email)
);

-- ---------------------------------------------------------------------------
-- Timeline blocks. Real start/end timestamps (not just order) so a future
-- guest-photo feature can line photos up to the moment they were taken.
-- ---------------------------------------------------------------------------
create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  title text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  position integer not null default 0,
  location text,
  notes text,
  status text not null default 'upcoming' check (status in ('upcoming', 'done', 'late')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Shots (the private layer). visibility is owner-controlled, default private.
-- ---------------------------------------------------------------------------
create table public.shots (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.blocks (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'planned' check (status in ('planned', 'captured', 'skipped')),
  visibility text not null default 'private' check (visibility in ('private', 'shared')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  assignee_id uuid references public.profiles (id) on delete set null,
  reference_images jsonb not null default '[]',
  notes text,
  captured_by uuid references public.profiles (id) on delete set null,
  captured_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Event images. Not used by v1 UI, but every upload is tagged with the event
-- and a capture timestamp so the future guest-photo feature works without a
-- rebuild.
-- ---------------------------------------------------------------------------
create table public.event_images (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  storage_path text not null,
  captured_at timestamptz not null default now(),
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Access helpers (security definer so policies don't recurse)
-- ---------------------------------------------------------------------------
create or replace function public.is_event_owner(eid uuid)
returns boolean
language sql security definer set search_path = public
stable as $$
  select exists (
    select 1 from events e where e.id = eid and e.owner_id = auth.uid()
  );
$$;

create or replace function public.is_event_member(eid uuid)
returns boolean
language sql security definer set search_path = public
stable as $$
  select public.is_event_owner(eid) or exists (
    select 1 from members m
    where m.event_id = eid and m.user_id = auth.uid() and m.status = 'active'
  );
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.events enable row level security;
alter table public.members enable row level security;
alter table public.blocks enable row level security;
alter table public.shots enable row level security;
alter table public.event_images enable row level security;

-- events
create policy "members can view events"
  on public.events for select to authenticated
  using (public.is_event_member(id));

create policy "users can create events they own"
  on public.events for insert to authenticated
  with check (owner_id = auth.uid());

create policy "owners can update events"
  on public.events for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "owners can delete events"
  on public.events for delete to authenticated
  using (owner_id = auth.uid());

-- members
create policy "members can view the member list"
  on public.members for select to authenticated
  using (public.is_event_member(event_id));

create policy "owners manage members"
  on public.members for insert to authenticated
  with check (public.is_event_owner(event_id));

create policy "owners update members"
  on public.members for update to authenticated
  using (public.is_event_owner(event_id));

create policy "owners remove members"
  on public.members for delete to authenticated
  using (public.is_event_owner(event_id));

-- blocks
create policy "members can view blocks"
  on public.blocks for select to authenticated
  using (public.is_event_member(event_id));

create policy "owners create blocks"
  on public.blocks for insert to authenticated
  with check (public.is_event_owner(event_id));

-- members may update blocks (mark done / running late from the live board)
create policy "members can update blocks"
  on public.blocks for update to authenticated
  using (public.is_event_member(event_id))
  with check (public.is_event_member(event_id));

create policy "owners delete blocks"
  on public.blocks for delete to authenticated
  using (public.is_event_owner(event_id));

-- shots: THE PRIVACY RULE, enforced here and not just in the UI.
-- Private shots are visible only to the event owner. Shared shots are visible
-- to active members. Owner decides what is shared.
create policy "owners see all shots, members see shared shots"
  on public.shots for select to authenticated
  using (
    public.is_event_owner(event_id)
    or (visibility = 'shared' and public.is_event_member(event_id))
  );

create policy "owners create shots"
  on public.shots for insert to authenticated
  with check (public.is_event_owner(event_id));

create policy "owners update all shots, members update shared shots"
  on public.shots for update to authenticated
  using (
    public.is_event_owner(event_id)
    or (visibility = 'shared' and public.is_event_member(event_id))
  )
  with check (
    public.is_event_owner(event_id)
    or (visibility = 'shared' and public.is_event_member(event_id))
  );

create policy "owners delete shots"
  on public.shots for delete to authenticated
  using (public.is_event_owner(event_id));

-- Only the owner may change a shot's visibility (a member could otherwise
-- flip a shared shot; WITH CHECK can't compare old/new, a trigger can).
create or replace function public.guard_shot_visibility()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.visibility is distinct from old.visibility
     and not public.is_event_owner(new.event_id) then
    raise exception 'only the event owner can change shot visibility';
  end if;
  return new;
end;
$$;

create trigger shots_guard_visibility
  before update on public.shots
  for each row execute function public.guard_shot_visibility();

-- event_images
create policy "members view event images"
  on public.event_images for select to authenticated
  using (public.is_event_member(event_id));

create policy "members add event images"
  on public.event_images for insert to authenticated
  with check (public.is_event_member(event_id));

-- ---------------------------------------------------------------------------
-- Invite claiming: link membership rows to users whether the invitee signs up
-- before or after the invite.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', null));

  update public.members
  set user_id = new.id, status = 'active'
  where user_id is null and lower(invited_email) = lower(new.email);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.link_member_to_existing_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  existing uuid;
begin
  if new.user_id is null then
    select id into existing from public.profiles
    where lower(email) = lower(new.invited_email) limit 1;
    if existing is not null then
      new.user_id := existing;
      new.status := 'active';
    end if;
  end if;
  return new;
end;
$$;

create trigger members_link_existing_user
  before insert on public.members
  for each row execute function public.link_member_to_existing_user();

-- ---------------------------------------------------------------------------
-- updated_at bookkeeping
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger events_touch before update on public.events
  for each row execute function public.touch_updated_at();
create trigger blocks_touch before update on public.blocks
  for each row execute function public.touch_updated_at();
create trigger shots_touch before update on public.shots
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Realtime: live board subscribes to blocks + shots changes (RLS applies)
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.blocks;
alter publication supabase_realtime add table public.shots;
alter publication supabase_realtime add table public.events;
