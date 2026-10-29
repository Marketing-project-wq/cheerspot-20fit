import { supabase } from './supabase.js'

// Row changes on CheerSpot tables, pushed by Supabase Realtime. The database policies still apply,
// so each signed-in role only hears about rows it may read. Callers keep a slow poll as a safety
// net and switch to a fast one while onLive(false) says the channel is down.
let channelCount = 0

export function watchTables(tables, onChange, onLive) {
  if (!supabase) {
    onLive?.(false)
    return () => {}
  }
  const channel = supabase.channel(`cheerspot-${++channelCount}-${Date.now()}`)
  tables.forEach(table => {
    channel.on('postgres_changes', { event: '*', schema: 'public', table }, payload => onChange(table, payload))
  })
  channel.subscribe(status => onLive?.(status === 'SUBSCRIBED'))
  return () => {
    supabase.removeChannel(channel)
  }
}
