import { createClient } from 'npm:@supabase/supabase-js@2'

// Searches YouTube for the booth. The API key stays on the server; only signed-in staff can call this.
const STAFF_ROLES = ['superadmin', 'admin']
const MAX_QUERY = 100
const MAX_RESULTS = 12

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

  const input = await req.json().catch(() => ({}))
  const apiKey = Deno.env.get('YOUTUBE_API_KEY')
  if (!apiKey) return new Response('YouTube key is not set', { status: 500 })

  // { chart: 'music' } returns popular music videos in Indonesia (1 quota unit), for the booth's start grid.
  if (input?.chart === 'music') {
    const videos = await fetchVideos(apiKey, {
      chart: 'mostPopular',
      videoCategoryId: '10',
      regionCode: 'ID',
      maxResults: String(MAX_RESULTS),
    })
    if (!videos) return new Response('YouTube search failed', { status: 502 })
    return Response.json({ items: videos })
  }

  const query = typeof input?.q === 'string' ? input.q.trim().slice(0, MAX_QUERY) : ''
  if (!query) return new Response('Type what to search for', { status: 400 })

  const params = new URLSearchParams({
    part: 'id',
    type: 'video',
    videoEmbeddable: 'true',
    safeSearch: 'moderate',
    maxResults: String(MAX_RESULTS),
    q: query,
    key: apiKey,
  })
  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`)
  if (!res.ok) return new Response('YouTube search failed', { status: 502 })

  const body = await res.json()
  const ids = (body.items ?? []).map((item: any) => item.id?.videoId).filter(Boolean)
  if (!ids.length) return Response.json({ items: [] })

  // Details (title, duration, live, embeddable) come from videos.list, 1 more quota unit. Search order is kept.
  const videos = await fetchVideos(apiKey, { id: ids.join(',') })
  if (!videos) return new Response('YouTube search failed', { status: 502 })
  const byId = new Map(videos.map(video => [video.id, video]))
  return Response.json({ items: ids.map((id: string) => byId.get(id)).filter(Boolean) })
}

type Video = { id: string; title: string; channel: string; thumb: string; live: boolean; durationSec: number | null }

// Calls videos.list and keeps only videos the booth can play: embeddable and not an upcoming stream.
async function fetchVideos(apiKey: string, query: Record<string, string>): Promise<Video[] | null> {
  const params = new URLSearchParams({ part: 'snippet,contentDetails,status', ...query, key: apiKey })
  const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`).catch(() => null)
  if (!res?.ok) return null
  const body = await res.json()
  return (body.items ?? [])
    .filter((v: any) => v.status?.embeddable !== false && v.snippet?.liveBroadcastContent !== 'upcoming')
    .map((v: any) => ({
      id: v.id,
      title: v.snippet?.title ?? '',
      channel: v.snippet?.channelTitle ?? '',
      thumb: v.snippet?.thumbnails?.medium?.url ?? v.snippet?.thumbnails?.default?.url ?? '',
      live: v.snippet?.liveBroadcastContent === 'live',
      durationSec: parseDuration(v.contentDetails?.duration),
    }))
}

// ISO 8601 duration such as PT1H29M22S. Live streams report P0D, which becomes null.
function parseDuration(value: unknown): number | null {
  const m = typeof value === 'string' ? value.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/) : null
  if (!m) return null
  const [, d, h, min, sec] = m.map(part => Number(part) || 0)
  const total = d * 86400 + h * 3600 + min * 60 + sec
  return total > 0 ? total : null
}
