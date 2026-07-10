-- Post-meeting refinements:
-- (1) a self-reported, multi-value profession field per account, purely
--     descriptive (invite-flow context + future reporting), never used for
--     permissions — the per-event role (owner/team/vendor/client) stays the
--     only thing that drives access.
-- (2) a per-shot time budget so a photographer can see whether their planned
--     shots fit inside the block the owner allotted for them.

alter table public.profiles
  add column professions text[] not null default '{}';

alter table public.shots
  add column duration_minutes integer not null default 5
    check (duration_minutes > 0);

-- guard_shot_update() already stops a non-owner, non-creator team member
-- (the one case that's allowed to update a shot at all, for the
-- collaborative capture-status toggle) from changing its content columns.
-- duration_minutes needs to join that list, or the same exception that lets
-- them flip status would also let them silently edit someone else's time
-- budget.
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
     or new.created_by is distinct from old.created_by
     or new.duration_minutes is distinct from old.duration_minutes then
    raise exception 'only the shot owner or creator can edit this shot';
  end if;
  return new;
end;
$$;
