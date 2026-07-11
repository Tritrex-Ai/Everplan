-- Mandatory signup onboarding: "Who are you?" (profession, reusing the
-- existing profiles.professions field) plus a new "solo or team?" field.
-- Purely descriptive, same as professions — never used for permissions.
--
-- Defaults to incomplete for brand-new rows, but every profile that already
-- exists gets backfilled to complete so nobody who's already signed up is
-- retroactively interrupted by this.
alter table public.profiles add column onboarding_completed boolean not null default false;
alter table public.profiles add column team_size text check (team_size in ('solo', 'team'));

update public.profiles set onboarding_completed = true;
