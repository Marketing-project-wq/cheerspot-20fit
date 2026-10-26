-- CheerSpot security, part 1 of 2. Additive only: current app keeps working.
-- Touches only cheerspot_* objects, the cheerspot-audio bucket and cron job 48.

-- A. Sender can check the status of their own cheer by id (uuid, not guessable). Status only.
create or replace function public.cheerspot_get_cheer_status(p_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select status from public.cheerspot_cheers where id = p_id
$$;
revoke all on function public.cheerspot_get_cheer_status(uuid) from public;
grant execute on function public.cheerspot_get_cheer_status(uuid) to anon, authenticated;

-- B. Audio bucket: max 2 MB, audio files only.
update storage.buckets
   set file_size_limit = 2097152,
       allowed_mime_types = array['audio/webm', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/mpeg', 'audio/wav', 'audio/x-m4a']
 where id = 'cheerspot-audio';

-- C. New cheers always start clean: pending, no transcript, no reason.
--    The transcribe Edge Function fills transcript afterwards with the service role (UPDATE, not affected).
create or replace function public.cheerspot_clean_new_cheer()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.status := 'pending';
  new.transcript := null;
  new.reason := null;
  new.created_at := now();
  return new;
end
$$;
drop trigger if exists cheerspot_clean_new_cheer on public.cheerspot_cheers;
create trigger cheerspot_clean_new_cheer
  before insert on public.cheerspot_cheers
  for each row execute function public.cheerspot_clean_new_cheer();

-- D (prep). DJ marks a cheer played through this function only: approved -> played, nothing else.
create or replace function public.cheerspot_mark_played(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') not in ('superadmin', 'admin') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.cheerspot_cheers set status = 'played' where id = p_id and status in ('approved', 'played');
end
$$;
revoke all on function public.cheerspot_mark_played(uuid) from public;
grant execute on function public.cheerspot_mark_played(uuid) to authenticated;

-- E. Stop the 1-hour cleanup job.
select cron.unschedule(48);
