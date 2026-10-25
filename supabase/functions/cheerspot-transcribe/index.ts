import { createClient } from 'npm:@supabase/supabase-js@2'

// Only cheers from the last 5 minutes can be transcribed. This keeps repeated calls from
// spending the OpenRouter balance on old or made-up ids.
const MAX_AGE_MS = 5 * 60 * 1000
const MODEL = 'openai/whisper-1'

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}

// The browser calls this from the web app, so it must answer the CORS preflight (OPTIONS).
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

async function handle(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const { id } = await req.json().catch(() => ({ id: null }))
  if (typeof id !== 'string') return new Response('Bad request', { status: 400 })

  const apiKey = Deno.env.get('CHEERSPOT_OPENROUTER_API_KEY')
  if (!apiKey) return new Response('Transcription key is not set', { status: 500 })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: row, error } = await supabase
    .from('cheerspot_cheers')
    .select('id, audio_path, created_at, transcript')
    .eq('id', id)
    .maybeSingle()
  if (error || !row) return new Response('Cheer not found', { status: 404 })
  if (row.transcript !== null) return Response.json({ skipped: 'already transcribed' })
  if (Date.now() - Date.parse(row.created_at) > MAX_AGE_MS) {
    return new Response('Cheer is too old to transcribe', { status: 410 })
  }

  const { data: file, error: downloadError } = await supabase.storage
    .from('cheerspot-audio')
    .download(row.audio_path)
  if (downloadError || !file) return new Response('Audio not found', { status: 404 })

  const format = row.audio_path.split('.').pop() ?? 'webm'
  const audio = toBase64(new Uint8Array(await file.arrayBuffer()))

  const res = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      language: 'id',
      input_audio: { data: audio, format },
    }),
  })
  if (!res.ok) return new Response('Transcription failed', { status: 502 })

  const { text } = await res.json()
  const transcript = typeof text === 'string' ? text.trim() : ''

  const { error: updateError } = await supabase
    .from('cheerspot_cheers')
    .update({ transcript })
    .eq('id', id)
  if (updateError) return new Response('Could not save transcript', { status: 500 })

  return Response.json({ ok: true })
}
