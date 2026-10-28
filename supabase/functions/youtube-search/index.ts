import { createClient } from 'npm:@supabase/supabase-js@2'

// Searches YouTube for the booth. The API key stays on the server; only signed-in staff can call this.
const STAFF_ROLES = ['superadmin', 'admin']
const MAX_QUERY = 100

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

  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return new Response('Sign in first', { status: 401 })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  const role = userData?.user?.app_metadata?.role
  if (userError || !STAFF_ROLES.includes(role)) return new Response('Staff only', { status: 403 })

  const { q } = await req.json().catch(() => ({ q: '' }))
  const query = typeof q === 'string' ? q.trim().slice(0, MAX_QUERY) : ''
  if (!query) return new Response('Type what to search for', { status: 400 })

  const apiKey = Deno.env.get('YOUTUBE_API_KEY')
  if (!apiKey) return new Response('YouTube key is not set', { status: 500 })

  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    videoEmbeddable: 'true',
    safeSearch: 'moderate',
    maxResults: '10',
    q: query,
    key: apiKey,
  })
  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`)
  if (!res.ok) return new Response('YouTube search failed', { status: 502 })

  const body = await res.json()
  const items = (body.items ?? [])
    // Upcoming streams cannot be played yet.
    .filter((item: any) => item.id?.videoId && item.snippet?.liveBroadcastContent !== 'upcoming')
    .map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet?.title ?? '',
      channel: item.snippet?.channelTitle ?? '',
      thumb: item.snippet?.thumbnails?.medium?.url ?? item.snippet?.thumbnails?.default?.url ?? '',
      live: item.snippet?.liveBroadcastContent === 'live',
      durationSec: null as number | null,
    }))

  // Durations come from a second call (1 quota unit). If it fails, results still show without them.
  if (items.length) {
    const details = new URLSearchParams({ part: 'contentDetails', id: items.map((item: any) => item.id).join(','), key: apiKey })
    const detailRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?${details}`).catch(() => null)
    if (detailRes?.ok) {
      const detailBody = await detailRes.json()
      const byId = new Map((detailBody.items ?? []).map((v: any) => [v.id, parseDuration(v.contentDetails?.duration)]))
      items.forEach((item: any) => {
        item.durationSec = byId.get(item.id) ?? null
      })
    }
  }

  return Response.json({ items })
}

// ISO 8601 duration such as PT1H29M22S. Live streams report P0D, which becomes null.
function parseDuration(value: unknown): number | null {
  const m = typeof value === 'string' ? value.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/) : null
  if (!m) return null
  const [, d, h, min, sec] = m.map(part => Number(part) || 0)
  const total = d * 86400 + h * 3600 + min * 60 + sec
  return total > 0 ? total : null
}
