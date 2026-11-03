import { createClient } from 'npm:@supabase/supabase-js@2'

// Sign-in link for the CheerSpot superadmin, for racelabtiming.20fit.id. Their SERVER calls this with
// the shared key and redirects the staff member to the returned url, which signs them in to /admin.
//
//   POST /functions/v1/cheerspot-sso
//   Header: x-cheerspot-sso-key: <CHEERSPOT_SSO_KEY>
//   Out:    { url }
//
// The link holds a one-time token: it works once and expires with the project's email OTP expiry,
// so redirect to it right away.
// It is in the url fragment (#), so it never reaches a server log. verify_jwt is off: the caller is
// a server with no Supabase session, and the shared key is the credential.
//
// Secrets: CHEERSPOT_SSO_KEY (the shared key, at least 32 characters) and CHEERSPOT_SSO_USER_ID (the
// superadmin account the link signs in as). The account must have app_metadata.role = 'superadmin'.
const APP_URL = 'https://cheerspot.20fit.id'
const MIN_KEY = 32

const fail = (status: number, error: string) => Response.json({ error }, { status })

// Same length and content, compared without an early exit, so timing does not leak the key.
function sameKey(a: string, b: string) {
  const x = new TextEncoder().encode(a)
  const y = new TextEncoder().encode(b)
  let diff = x.length ^ y.length
  for (let i = 0; i < Math.max(x.length, y.length); i += 1) diff |= (x[i] ?? 0) ^ (y[i] ?? 0)
  return diff === 0
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return fail(405, 'Method not allowed')

  const key = Deno.env.get('CHEERSPOT_SSO_KEY') ?? ''
  const userId = Deno.env.get('CHEERSPOT_SSO_USER_ID') ?? ''
  if (key.length < MIN_KEY || !userId) return fail(503, 'Not configured')
  if (!sameKey(req.headers.get('x-cheerspot-sso-key') ?? '', key)) return fail(401, 'Invalid key')

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Looked up by id first: generateLink would create a new user for an unknown email.
  const { data: found, error: findError } = await admin.auth.admin.getUserById(userId)
  const user = findError ? null : found?.user
  if (!user?.email || user.app_metadata?.role !== 'superadmin') return fail(503, 'Not configured')

  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email: user.email })
  const hashed = data?.properties?.hashed_token
  if (error || !hashed || data?.user?.id !== user.id) return fail(502, 'Could not create the link')

  return Response.json({ url: `${APP_URL}/admin#sso=${encodeURIComponent(hashed)}` })
})
