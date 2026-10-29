-- CheerSpot Realtime. Applied 2026-10-29.
-- Admin and booth get row changes pushed instead of polling every few seconds.
-- RLS still applies to every change: the DJ only receives approved and played cheers.
alter publication supabase_realtime add table public.cheerspot_cheers, public.cheerspot_settings;
