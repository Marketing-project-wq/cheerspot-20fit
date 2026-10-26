import { supabase } from './supabase.js'

const BUCKET = 'cheerspot-audio'

const EXT = { 'audio/mp4': 'm4a', 'audio/aac': 'm4a', 'audio/webm': 'webm', 'audio/ogg': 'ogg' }

// The bucket only accepts plain audio types, so drop parameters like ";codecs=opus".
function baseType(type) {
  return (type || '').split(';')[0].trim() || 'audio/mp4'
}

function extOf(type) {
  return EXT[baseType(type)] || 'audio'
}

// Uploads the recorded voice note and inserts its row as pending. Returns the cheer id.
// No account needed: anonymous visitors may insert but not read, so the id is made here.
export async function submitCheer({ blob, senderName, athleteName, durationSec }) {
  if (!supabase) throw new Error('Supabase is not configured')

  const path = `${crypto.randomUUID()}.${extOf(blob.type)}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: baseType(blob.type) })
  if (uploadError) throw uploadError

  const id = crypto.randomUUID()
  const { error } = await supabase
    .from('cheerspot_cheers')
    .insert({
      id,
      sender_name: senderName.trim() || 'Penonton',
      athlete_name: athleteName.trim(),
      duration_sec: Math.max(1, Math.round(durationSec)),
      audio_path: path,
    })
  if (error) throw error

  // Transcription runs in the background. If it fails, the cheer is still sent and the admin can listen.
  supabase.functions.invoke('cheerspot-transcribe', { body: { id } })
  return id
}

// Anyone with the id can read the status (pending, approved, rejected, played). Nothing else.
export async function getCheerStatus(id) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data, error } = await supabase.rpc('cheerspot_get_cheer_status', { p_id: id })
  if (error) throw error
  return data
}

// All cheers for this event, newest first. Staff only: the database policy blocks anonymous reads.
export async function fetchRecentCheers() {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('cheerspot_cheers')
    .select('id, created_at, sender_name, athlete_name, duration_sec, audio_path, status, transcript, reason')
    .order('created_at', { ascending: false })
  if (error) return null
  return data
}

// Staff only: saves the moderation decision. Reject reasons are stored with the row.
export async function updateCheerStatus(id, status, reason = null) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { error } = await supabase
    .from('cheerspot_cheers')
    .update({ status, reason })
    .eq('id', id)
  if (error) throw error
}

// Staff only: a short-lived link to play the recorded voice note.
export async function getAudioUrl(path) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data, error } = await supabase.storage.from('cheerspot-audio').createSignedUrl(path, 600)
  if (error) throw error
  return data.signedUrl
}
