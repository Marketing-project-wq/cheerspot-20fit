import { supabase } from './supabase.js'

// Superadmin only: DJ accounts, through the cheerspot-staff Edge Function (it holds the service role).
// Errors carry a short code (username_taken, weak_password, invalid_username, not_found) in err.code.
async function call(body) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data, error } = await supabase.functions.invoke('cheerspot-staff', { body })
  if (error) {
    const payload = await error.context?.json?.().catch(() => null)
    const err = new Error(payload?.error || error.message)
    err.code = payload?.error || 'failed'
    throw err
  }
  return data
}

export const listDjAccounts = () => call({ action: 'list' }).then(data => data.accounts ?? [])
export const createDjAccount = ({ name, username, password }) => call({ action: 'create', name, username, password })
export const resetDjPassword = (id, password) => call({ action: 'reset', id, password })
export const removeDjAccount = id => call({ action: 'remove', id })
