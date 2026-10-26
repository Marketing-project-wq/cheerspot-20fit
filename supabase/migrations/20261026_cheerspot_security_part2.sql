-- CheerSpot security, part 2 of 2. Run only after the app update that uses the new functions is live.

-- A. Anonymous visitors can no longer read cheers.
drop policy if exists cheer_select_recent_anon on public.cheerspot_cheers;

-- D. Superadmin reads everything; DJ (admin) reads only approved and played cheers.
drop policy if exists cheer_select_staff on public.cheerspot_cheers;
create policy cheer_select_superadmin on public.cheerspot_cheers
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin');
create policy cheer_select_dj on public.cheerspot_cheers
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' and status in ('approved', 'played'));

-- D. Only superadmin updates rows directly. DJ uses cheerspot_mark_played().
drop policy if exists cheer_update_staff on public.cheerspot_cheers;
create policy cheer_update_superadmin on public.cheerspot_cheers
  for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin');
