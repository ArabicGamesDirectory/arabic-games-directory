-- 01 — Submission hardening: rate-limit table + function.
--
-- RUN: any time — before or after deploying. Purely additive.
-- /api/submit fails OPEN while this function is missing (logs a warning,
-- allows the request), so there is no ordering in which submissions break.
-- Paste the whole file into the Supabase SQL editor and run it.

-- Fixed-window rate-limit buckets. One row per key; the row is reused, and
-- the daily cleanup cron deletes rows whose window closed >24h ago.
create table rate_limits (
  key          text primary key,
  count        integer not null default 0,
  window_start timestamptz not null default now()
);

-- RLS on with NO policies = service role only. anon/authenticated cannot read
-- or write it, so nobody can inspect or poison another visitor's bucket.
alter table rate_limits enable row level security;

-- Atomic check-and-increment. This MUST happen inside the database: doing it
-- as read-then-write from the route would race, and two concurrent requests
-- could both see the same stale count.
create or replace function check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into rate_limits as r (key, count, window_start)
       values (p_key, 1, now())
  on conflict (key) do update
     set count = case
           when r.window_start < now() - make_interval(secs => p_window_seconds)
           then 1 else r.count + 1 end,
         window_start = case
           when r.window_start < now() - make_interval(secs => p_window_seconds)
           then now() else r.window_start end
  returning r.count into v_count;

  return v_count <= p_limit;
end;
$$;

-- Supabase grants EXECUTE to public by default; only the service role should
-- be able to move these counters.
revoke all on function check_rate_limit(text, integer, integer)
  from public, anon, authenticated;
