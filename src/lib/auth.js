import { supabase } from './supabase.js'

// Staff roles are set in app_metadata from the Supabase dashboard. Users cannot change them.
const STAFF_ROLES = ['superadmin', 'admin']

// Returns 'superadmin' or 'admin' for staff sessions, otherwise null.
export function staffRole(session) {
  const role = session?.user?.app_metadata?.role
  return STAFF_ROLES.includes(role) ? role : null
}

export async function signIn(email, password) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.session
}

export async function signOut() {
  if (!supabase) return
  await supabase.auth.signOut()
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
