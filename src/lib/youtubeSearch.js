import { supabase } from './supabase.js'

// Calls the youtube-search Edge Function. The API key stays on the server; the browser only sends the staff session.
export async function searchYouTube(query) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data, error } = await supabase.functions.invoke('youtube-search', { body: { q: query } })
  if (error) throw error
  return data?.items ?? []
}
