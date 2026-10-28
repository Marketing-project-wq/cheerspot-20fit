// YouTube IFrame Player wrapper for the booth. YouTube has no gain node, so fades step setVolume().

import { ease } from './ducking.js'

const API_URL = 'https://www.youtube.com/iframe_api'
const FADE_STEP_MS = 50
const SKIP_CODES = [100, 101, 150]

let apiPromise = null

// Loads the IFrame API script once per page. Resolves with window.YT.
export function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (!apiPromise) {
    apiPromise = new Promise((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        previous?.()
        resolve(window.YT)
      }
      const script = document.createElement('script')
      script.src = API_URL
      script.async = true
      script.onerror = () => {
        apiPromise = null
        script.remove()
        reject(new Error('YouTube API failed to load'))
      }
      document.head.appendChild(script)
    })
  }
  return apiPromise
}

// Accepts a pasted playlist or video link. Returns { kind: 'playlist' | 'video', id } or null.
export function parseYouTubeInput(text) {
  const value = String(text || '').trim()
  if (!value) return null
  let url
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
  } catch {
    return null
  }
  const host = url.hostname.replace(/^(www|m)\./, '')
  if (host !== 'youtube.com' && host !== 'youtu.be') return null

  const list = url.searchParams.get('list')
  if (list && /^[\w-]{8,64}$/.test(list)) return { kind: 'playlist', id: list }

  let videoId = url.searchParams.get('v')
  if (!videoId && host === 'youtu.be') videoId = url.pathname.slice(1)
  if (!videoId) videoId = url.pathname.match(/\/(?:embed|shorts|live)\/([\w-]{11})/)?.[1]
  if (videoId && /^[\w-]{11}$/.test(videoId)) return { kind: 'video', id: videoId }
  return null
}

// Creates a player inside `container` (React owns the container, so the player mounts a child node).
// Requires the API to be loaded. Returns a source adapter for the booth.
export function createYouTubeSource(container, { onChange, onSkip } = {}) {
  const YT = window.YT
  const mount = document.createElement('div')
  container.appendChild(mount)

  let info = { kind: null, title: '', index: -1, count: 0, shuffle: false, playing: false, loaded: false }
  let wantShuffle = false
  let shuffleApplied = false
  let cancelRamp = null
  let destroyed = false
  let ready = false
  let pendingLoad = null

  const emit = patch => {
    info = { ...info, ...patch }
    if (!destroyed) onChange?.(info)
  }

  // Player calls can throw before the player is ready or after destroy. Treat those as no-ops.
  const call = (method, ...args) => {
    try {
      return player[method]?.(...args)
    } catch {
      return undefined
    }
  }

  const refresh = () => {
    const data = call('getVideoData') || {}
    const list = call('getPlaylist')
    const index = call('getPlaylistIndex')
    emit({
      title: data.title || '',
      index: typeof index === 'number' ? index : -1,
      count: Array.isArray(list) ? list.length : 0,
    })
  }

  const readVolume = () => {
    const level = call('getVolume')
    return typeof level === 'number' ? level / 100 : 1
  }

  const writeVolume = value => {
    call('setVolume', Math.round(Math.min(1, Math.max(0, value)) * 100))
  }

  const handleState = state => {
    const playing = state === YT.PlayerState.PLAYING || state === YT.PlayerState.BUFFERING
    if (state !== YT.PlayerState.UNSTARTED) {
      if (info.kind === 'playlist' && wantShuffle && !shuffleApplied && call('getPlaylist')?.length) {
        call('setShuffle', true)
        shuffleApplied = true
      }
      refresh()
    }
    // Stay loaded through UNSTARTED: loadVideoById reports it first, and a blocked autoplay stays there.
    emit({ playing })
  }

  const startLoad = parsed => {
    if (parsed.kind === 'playlist') {
      call('loadPlaylist', { list: parsed.id, listType: 'playlist', index: 0 })
    } else {
      call('loadVideoById', parsed.id)
    }
  }

  const handleError = code => {
    if (SKIP_CODES.includes(code) && info.kind === 'playlist') {
      call('nextVideo')
      onSkip?.('Track unavailable, skipped to the next one')
      return
    }
    onSkip?.(SKIP_CODES.includes(code) ? 'Track unavailable' : 'YouTube playback error')
  }

  const player = new YT.Player(mount, {
    height: '100%',
    width: '100%',
    playerVars: { playsinline: 1, rel: 0, origin: window.location.origin },
    events: {
      // Player methods only exist after onReady. A load requested earlier waits here.
      onReady: () => {
        ready = true
        if (pendingLoad) startLoad(pendingLoad)
        pendingLoad = null
      },
      onStateChange: event => handleState(event.data),
      onError: event => handleError(event.data),
    },
  })

  return {
    load(parsed) {
      shuffleApplied = false
      if (ready) startLoad(parsed)
      else pendingLoad = parsed
      emit({ kind: parsed.kind, title: '', loaded: true })
    },
    play: () => call('playVideo'),
    pause: () => call('pauseVideo'),
    togglePlay() {
      if (info.playing) call('pauseVideo')
      else call('playVideo')
    },
    next() {
      if (info.kind === 'playlist') call('nextVideo')
    },
    previous() {
      if (info.kind === 'playlist') call('previousVideo')
    },
    toggleShuffle() {
      wantShuffle = !wantShuffle
      if (info.kind === 'playlist') {
        call('setShuffle', wantShuffle)
        shuffleApplied = true
      }
      emit({ shuffle: wantShuffle })
    },
    getInfo: () => info,
    isPlaying: () => info.playing,
    getLevel: readVolume,
    setLevel(value) {
      cancelRamp?.()
      writeVolume(value)
    },
    // Steps the volume every FADE_STEP_MS along an eased curve. A new ramp or setLevel cancels this one.
    rampTo(target, ms) {
      cancelRamp?.()
      const start = readVolume()
      const steps = Math.max(1, Math.round(ms / FADE_STEP_MS))
      let step = 0
      return new Promise(resolve => {
        const timer = setInterval(() => {
          step += 1
          writeVolume(start + (target - start) * ease(step / steps))
          if (step >= steps) finish()
        }, FADE_STEP_MS)
        function finish() {
          clearInterval(timer)
          if (cancelRamp === finish) cancelRamp = null
          resolve()
        }
        cancelRamp = finish
      })
    },
    destroy() {
      destroyed = true
      cancelRamp?.()
      call('destroy')
      mount.remove()
    },
  }
}
