-- CheerSpot booth remote control: defence in depth. Applied 2026-11-06.
-- Supabase grants EXECUTE on new public functions to anon by default, and "revoke ... from public"
-- does not remove that grant. The function already refuses anyone without a staff role, but anon
-- should not be able to call it at all. authenticated keeps EXECUTE (the booth signs in as DJ).
revoke execute on function public.cheerspot_booth_claim_command(uuid, text, text, integer) from anon;
