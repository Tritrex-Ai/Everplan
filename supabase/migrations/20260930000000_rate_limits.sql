-- Fixed-window rate limiting, backed by Postgres — no external cache needed
-- at Everplan's current scale. Only ever called via the service-role client,
-- so no client-facing RLS policies are granted.

create table if not exists public.rate_limits (
  key text primary key,
  count integer not null default 1,
  window_start timestamptz not null default now()
);

alter table public.rate_limits enable row level security;

create or replace function public.check_rate_limit(
  p_key text,
  p_limit int,
  p_window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_count int;
  v_window_start timestamptz;
begin
  insert into public.rate_limits (key, count, window_start)
  values (p_key, 1, v_now)
  on conflict (key) do update
    set count = case
          when public.rate_limits.window_start <= v_now - make_interval(secs => p_window_seconds)
            then 1
          else public.rate_limits.count + 1
        end,
        window_start = case
          when public.rate_limits.window_start <= v_now - make_interval(secs => p_window_seconds)
            then v_now
          else public.rate_limits.window_start
        end
  returning count, window_start into v_count, v_window_start;

  return v_count <= p_limit;
end;
$$;

grant execute on function public.check_rate_limit(text, int, int) to service_role;
