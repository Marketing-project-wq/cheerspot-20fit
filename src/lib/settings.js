import { supabase } from './supabase.js'

// Shared CheerSpot settings in cheerspot_settings (key -> JSON value). Staff can read; only the
// superadmin can write. Used for values the admin sets and the booth on another device follows.
export const AUTO_GAP_KEY = 'auto_gap_sec'
export const AUTO_GAP_CHOICES = [30, 45, 60, 90, 120]
export const DEFAULT_AUTO_GAP = 60

export async function readSetting(key, fallback) {
  if (!supabase) return fallback
  const { data, error } = await supabase.from('cheerspot_settings').select('value').eq('key', key).maybeSingle()
  if (error) throw error
  return data ? data.value : fallback
}

export async function saveSetting(key, value) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { error } = await supabase
    .from('cheerspot_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (error) throw error
}
