-- Reference links on shots (Pinterest boards, Instagram posts, YouTube
-- clips — anything a shooter wants to point at besides an uploaded photo).
-- Same shape as reference_images: a jsonb array of strings, edited by the
-- shot's owner/creator, visible to whoever can see the shot.
alter table public.shots
  add column reference_links jsonb not null default '[]'::jsonb;

-- Extend the column guard so a non-owner, non-creator team member (who may
-- still toggle capture status on a shared shot) can't edit links either.
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
     or new.reference_links is distinct from old.reference_links
     or new.block_id is distinct from old.block_id
     or new.created_by is distinct from old.created_by then
    raise exception 'only the shot owner or creator can edit this shot';
  end if;
  return new;
end;
$$;
