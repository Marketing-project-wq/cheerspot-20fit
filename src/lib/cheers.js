import { supabase } from './supabase.js'

const BUCKET = 'cheerspot-audio'

const EXT = { 'audio/mp4': 'm4a', 'audio/aac': 'm4a', 'audio/webm': 'webm', 'audio/ogg': 'ogg' }

function extOf(type) {
  const base = (type || '').split(';')[0].trim()
  return EXT[base] || 'audio'
}

// Uploads the recorded voice note and inserts its row as pending. No account needed: the
// database policies only let anonymous visitors insert pending cheers and read recent ones.
export async function submitCheer({ blob, senderName, athleteName, durationSec }) {
  if (!supabase) throw new Error('Supabase is not configured')

  const path = `${crypto.randomUUID()}.${extOf(blob.type)}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: blob.type || 'audio/mp4' })
  if (uploadError) throw uploadError

  const { data, error } = await supabase
    .from('cheerspot_cheers')
    .insert({
      sender_name: senderName.trim() || 'Penonton',
      athlete_name: athleteName.trim(),
      duration_sec: Math.max(1, Math.round(durationSec)),
      audio_path: path,
    })
    .select('id')
    .single()
  if (error) throw error

  // Transcription runs in the background. If it fails, the cheer is still sent and the admin can listen.
  supabase.functions.invoke('cheerspot-transcribe', { body: { id: data.id } })
}

// Cheers from the last hour, newest first. Anonymous reads are limited to that window by RLS.
export async function fetchRecentCheers() {
  if (!supabase) return null
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('cheerspot_cheers')
    .select('id, created_at, sender_name, athlete_name, duration_sec, audio_path, status, transcript')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
  if (error) return null
  return data
}
