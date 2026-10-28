import { forgetLocalSession, setRememberSession, supabase } from './supabase.js'

// Staff roles are set in app_metadata from the Supabase dashboard. Users cannot change them.
const STAFF_ROLES = ['superadmin', 'admin']

// Returns 'superadmin' or 'admin' for staff sessions, otherwise null.
export function staffRole(session) {
  const role = session?.user?.app_metadata?.role
  return STAFF_ROLES.includes(role) ? role : null
}

// DJ accounts sign in with a username. Supabase needs an email, so a username maps to an internal
// address on our own domain that never receives mail. Must match cheerspot-staff.
export const DJ_EMAIL_DOMAIN = 'cheerspot.20fit.id'

export function loginEmail(login) {
  const value = String(login || '').trim().toLowerCase()
  return value.includes('@') ? value : `${value}@${DJ_EMAIL_DOMAIN}`
}

export async function signIn(login, password, { remember = true } = {}) {
  if (!supabase) throw new Error('Supabase is not configured')
  setRememberSession(remember)
  const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail(login), password })
  if (error) throw error
  return data.session
}

const HANDOFF_KEY = 'cz-dj-handoff'

// A DJ who signs in on /admin belongs in the booth. The session moves to the /dj area: its tokens
// are passed through this tab's sessionStorage, and the /admin copy is only forgotten locally. signOut
// is not used here: even its local scope ends the session on the server, which would kill the handoff.
export async function handOffToDj() {
  const session = await getSession()
  if (session) {
    try {
      sessionStorage.setItem(
        HANDOFF_KEY,
        JSON.stringify({ access_token: session.access_token, refresh_token: session.refresh_token }),
      )
    } catch {
      // Storage blocked: the DJ signs in again on /dj.
    }
  }
  forgetLocalSession()
}

// On /dj: picks up a session handed over from /admin. Returns true when one was taken.
export async function takeHandoff() {
  let tokens = null
  try {
    tokens = JSON.parse(sessionStorage.getItem(HANDOFF_KEY) || 'null')
    sessionStorage.removeItem(HANDOFF_KEY)
  } catch {
    tokens = null
  }
  if (!tokens || !supabase) return false
  setRememberSession(false)
  const { error } = await supabase.auth.setSession(tokens)
  return !error
}

// Ends only this browser's session for this area. The default (global) would also sign the account
// out of /admin or /dj in another tab and on every other device.
export async function signOut() {
  if (!supabase) return
  await supabase.auth.signOut({ scope: 'local' })
}

export async function getSession() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}

// Calls back with the session on every sign-in, sign-out and token refresh. Returns an unsubscribe.
export function onSessionChange(callback) {
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session))
  return () => data.subscription.unsubscribe()
}
