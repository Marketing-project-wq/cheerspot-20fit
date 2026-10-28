-- Shared CheerSpot settings read by every device (admin and DJ booth). Applied 2026-10-28.
create table public.cheerspot_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.cheerspot_settings enable row level security;

-- Superadmin and DJ can read
create policy cheerspot_settings_select_staff on public.cheerspot_settings
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('superadmin', 'admin'));

-- Only the superadmin can change
create policy cheerspot_settings_write_superadmin on public.cheerspot_settings
  for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin');

-- Starting value: 60 seconds between AUTO cheers
insert into public.cheerspot_settings (key, value) values ('auto_gap_sec', '60');
