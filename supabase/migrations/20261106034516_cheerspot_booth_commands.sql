-- CheerSpot booth remote control. Applied 2026-11-06.
-- The superadmin controls the DJ booth (/dj) from /admin by inserting commands here. The booth picks
-- them up (Realtime postgres_changes + a poll) and claims each one through
-- cheerspot_booth_claim_command before running it. The table is also the audit log: who, when, what,
-- which booth, and the outcome. No update or delete policy, so the app cannot rewrite it.

begin;

create table public.cheerspot_booth_commands (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('set_mode','play_next','pause','resume','stop','skip','replay','ducker_test','ducker_restore_now')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  created_by_email text default (auth.jwt() ->> 'email'),
  executed_at timestamptz,
  executed_by text,            -- id of the booth (/dj tab) that ran it
  result text check (result in ('ok','noop','not_found','stale'))
);
create index cheerspot_booth_commands_created_at_idx on public.cheerspot_booth_commands (created_at desc);
alter table public.cheerspot_booth_commands enable row level security;

-- Who and when always come from the session and the server clock, never from the client.
create or replace function public.cheerspot_booth_command_stamp()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.created_at := now();
  new.created_by := auth.uid();
  new.created_by_email := auth.jwt() ->> 'email';
  new.executed_at := null;
  new.executed_by := null;
  new.result := null;
  return new;
end $$;
create trigger cheerspot_booth_command_stamp before insert on public.cheerspot_booth_commands
  for each row execute function public.cheerspot_booth_command_stamp();

-- Insert: superadmin only (same rule as writing cheerspot_settings).
create policy booth_cmd_insert_superadmin on public.cheerspot_booth_commands
  for insert to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin');
-- Read: superadmin (status and audit) and the DJ account (booth).
create policy booth_cmd_select_staff on public.cheerspot_booth_commands
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('superadmin','admin'));
-- No update/delete policy: the log cannot be edited. The booth records the outcome only through the
-- function below.

-- The booth claims a command atomically. Only one booth runs it, and a command older than
-- p_max_age_sec (by the server clock) is marked 'stale' and not run.
create or replace function public.cheerspot_booth_claim_command(
  p_id uuid, p_booth_id text, p_result text, p_max_age_sec integer)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_created timestamptz;
  v_executed timestamptz;
begin
  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') not in ('superadmin','admin') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_result not in ('ok','noop','not_found') then
    raise exception 'bad result' using errcode = '22023';
  end if;
  select created_at, executed_at into v_created, v_executed
    from public.cheerspot_booth_commands where id = p_id for update;
  if not found then return 'missing'; end if;
  if v_executed is not null then return 'taken'; end if;
  if v_created < now() - make_interval(secs => least(greatest(coalesce(p_max_age_sec, 30), 1), 300)) then
    update public.cheerspot_booth_commands set result = 'stale' where id = p_id and result is null;
    return 'stale';
  end if;
  update public.cheerspot_booth_commands
     set executed_at = now(), executed_by = left(p_booth_id, 64), result = p_result
   where id = p_id;
  return 'claimed';
end $$;
revoke all on function public.cheerspot_booth_claim_command(uuid, text, text, integer) from public;
grant execute on function public.cheerspot_booth_claim_command(uuid, text, text, integer) to authenticated;

alter publication supabase_realtime add table public.cheerspot_booth_commands;

commit;
