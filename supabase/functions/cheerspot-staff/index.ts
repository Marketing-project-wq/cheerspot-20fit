import { createClient } from 'npm:@supabase/supabase-js@2'

// Staff tools for CheerSpot: DJ accounts (superadmin only) and deleting a cheer (superadmin any cheer,
// DJ only cheers the booth shows: approved or played). Both need the service role, so this runs on
// the server. The auth project is shared with other 20FIT systems: accounts made here carry
// app_metadata.cheerspot = true, and list, reset and remove only touch those.
const MIN_PASSWORD = 8
// DJs sign in with a username; Supabase stores it as username@DJ_EMAIL_DOMAIN (our own domain, no mail
// is sent). Must match src/lib/auth.js.
const DJ_EMAIL_DOMAIN = 'cheerspot.20fit.id'
const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,31}$/
const PER_PAGE = 1000
const MAX_PAGES = 20

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const res = await handle(req)
  Object.entries(CORS).forEach(([key, value]) => res.headers.set(key, value))
  return res
})

const fail = (status: number, error: string) => Response.json({ error }, { status })

async function handle(req: Request): Promise<Response> {
  if (req.method !== 'POST') return fail(405, 'Method not allowed')

  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return fail(401, 'Sign in first')

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: caller, error: callerError } = await admin.auth.getUser(token)
  const role = callerError ? null : caller?.user?.app_metadata?.role
  if (role !== 'superadmin' && role !== 'admin') return fail(403, 'Staff only')

  const input = await req.json().catch(() => ({}))
  const action = input?.action
  if (role !== 'superadmin' && action !== 'delete_cheer') return fail(403, 'Superadmin only')

  if (action === 'list') {
    const accounts = await listDjAccounts(admin)
    if (!accounts) return fail(502, 'Could not load accounts')
    return Response.json({ accounts })
  }

  if (action === 'create') {
    const username = typeof input.username === 'string' ? input.username.trim().toLowerCase() : ''
    const name = typeof input.name === 'string' ? input.name.trim().slice(0, 80) : ''
    const password = typeof input.password === 'string' ? input.password : ''
    if (!USERNAME_RE.test(username)) return fail(400, 'invalid_username')
    const email = `${username}@${DJ_EMAIL_DOMAIN}`
    if (password.length < MIN_PASSWORD) return fail(400, 'weak_password')
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, username },
      app_metadata: { role: 'admin', cheerspot: true },
    })
    if (error) {
      const taken = error.status === 422 || /registered|exists/i.test(error.message)
      return taken ? fail(409, 'username_taken') : fail(502, 'create_failed')
    }
    return Response.json({ account: toAccount(data.user) })
  }

  if (action === 'reset' || action === 'remove') {
    const id = typeof input.id === 'string' ? input.id : ''
    const { data, error } = await admin.auth.admin.getUserById(id)
    if (error || !data?.user || data.user.app_metadata?.cheerspot !== true) return fail(404, 'not_found')
    if (action === 'reset') {
      const password = typeof input.password === 'string' ? input.password : ''
      if (password.length < MIN_PASSWORD) return fail(400, 'weak_password')
      const { error: updateError } = await admin.auth.admin.updateUserById(id, { password })
      if (updateError) return fail(502, 'reset_failed')
      return Response.json({ ok: true })
    }
    const { error: deleteError } = await admin.auth.admin.deleteUser(id)
    if (deleteError) return fail(502, 'remove_failed')
    return Response.json({ ok: true })
  }

  // Removes a cheer for good: its audio file, then its row. A DJ may only remove cheers the booth
  // shows (approved or played), never pending or rejected ones that are still the superadmin's call.
  if (action === 'delete_cheer') {
    const id = typeof input.id === 'string' ? input.id : ''
    const { data: row, error: rowError } = await admin.from('cheerspot_cheers').select('id, audio_path, status').eq('id', id).maybeSingle()
    if (rowError) return fail(502, 'delete_failed')
    if (!row) return fail(404, 'not_found')
    if (role !== 'superadmin' && row.status !== 'approved' && row.status !== 'played') return fail(403, 'Not allowed')
    if (row.audio_path) {
      const { error: fileError } = await admin.storage.from('cheerspot-audio').remove([row.audio_path])
      if (fileError) return fail(502, 'delete_failed')
    }
    const { error: deleteError } = await admin.from('cheerspot_cheers').delete().eq('id', id)
    if (deleteError) return fail(502, 'delete_failed')
    return Response.json({ ok: true })
  }

  return fail(400, 'Unknown action')
}

function toAccount(user: any) {
  return {
    id: user.id,
    username: user.user_metadata?.username ?? String(user.email ?? '').split('@')[0],
    name: user.user_metadata?.name ?? '',
    createdAt: user.created_at ?? null,
    lastSignInAt: user.last_sign_in_at ?? null,
  }
}

// Pages through auth users and keeps only CheerSpot DJ accounts. Never returns other systems' users.
async function listDjAccounts(admin: any) {
  const accounts: ReturnType<typeof toAccount>[] = []
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PER_PAGE })
    if (error) return null
    const users = data?.users ?? []
    for (const user of users) {
      if (user.app_metadata?.cheerspot === true && user.app_metadata?.role === 'admin') accounts.push(toAccount(user))
    }
    if (users.length < PER_PAGE) break
  }
  return accounts.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
}
