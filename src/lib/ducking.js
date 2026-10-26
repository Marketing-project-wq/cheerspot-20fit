// Audio engine for the booth: one shared AudioContext, the cheer chain, local-file music,
// and the ducking state machine. Music sources (YouTube, local files) register an adapter with
// { isPlaying(), getLevel(), setLevel(v), rampTo(v, ms) }. Levels are 0..1.

export const DEFAULT_DUCKING = {
  duckLevel: 0.2,
  fadeDownMs: 800,
  fadeUpMs: 1500,
  delayBeforeUpMs: 1000,
}

const TICK_MS = 250

let ctx = null
let cheerInput = null
let cheerGain = null
let tickTimer = null

let settings = { ...DEFAULT_DUCKING }
let master = 1
let musicVolume = 1
const sources = {}
let duckedMusic = null

const pending = []
let running = false
let playback = null
const bufferCache = new Map()
const subscribers = new Set()
const state = { phase: 'idle', ducked: false }
let current = snapshot()

// The shared context. Created on the first user gesture (Start session), never before.
export function getAudioContext() {
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext
    ctx = new Ctor()
    // Compressor keeps loud cheers from clipping and stays under the music.
    const compressor = ctx.createDynamicsCompressor()
    compressor.threshold.value = -24
    compressor.ratio.value = 4
    compressor.knee.value = 10
    cheerGain = ctx.createGain()
    cheerGain.gain.value = master
    compressor.connect(cheerGain)
    cheerGain.connect(ctx.destination)
    cheerInput = compressor
  }
  return ctx
}

// Must run inside the Start session click. Starts the status tick.
export async function startAudio() {
  const context = getAudioContext()
  if (context.state !== 'running') await context.resume()
  if (!tickTimer) tickTimer = setInterval(emit, TICK_MS)
}

// Stops playback and the tick. Called when the booth unmounts.
export function stopAudio() {
  if (tickTimer) clearInterval(tickTimer)
  tickTimer = null
  pending.length = 0
  if (playback) finishPlayback('skipped')
}

export function setDuckingSettings(next) {
  settings = { ...settings, ...next }
}

export function setMasterVolume(value) {
  master = clamp01(value)
  if (cheerGain) cheerGain.gain.setTargetAtTime(master, ctx.currentTime, 0.02)
  applyLevels()
}

export function setMusicVolume(value) {
  musicVolume = clamp01(value)
  applyLevels()
}

// Register a music adapter under a name ('youtube' or 'local'). Pass null to remove it.
export function registerMusicSource(name, adapter) {
  sources[name] = adapter || null
  applyLevels()
  emit()
}

// Queues a cheer. Handlers: onStart (audio begins), onEnd(reason), onError(err).
export function playCheer(cheer, handlers = {}) {
  pending.push({ cheer, handlers })
  emit()
  runQueue().catch(err => console.error('Booth queue failed', err))
}

export function pauseCheer() {
  if (!playback || playback.paused) return
  haltSource(playback)
  playback.paused = true
  emit()
}

export function resumeCheer() {
  if (!playback || !playback.paused) return
  playback.paused = false
  startSource(playback, playback.offset)
  emit()
}

export function skipCheer() {
  if (playback) finishPlayback('skipped')
}

export function restartCheer() {
  if (!playback) return
  haltSource(playback)
  playback.paused = false
  startSource(playback, 0)
  emit()
}

export function subscribeBooth(callback) {
  subscribers.add(callback)
  return () => subscribers.delete(callback)
}

export function getBoothStatus() {
  return current
}

// Local-file music. Owns its own <audio> element, routed through a GainNode the ducker controls.
export function createLocalMusic({ onChange, onError }) {
  const context = getAudioContext()
  const element = new Audio()
  element.preload = 'auto'
  const source = context.createMediaElementSource(element)
  const gain = context.createGain()
  source.connect(gain)
  gain.connect(context.destination)

  let tracks = []
  let order = []
  let position = -1
  let shuffle = false
  let cancelRamp = null

  const info = () => ({
    count: tracks.length,
    index: position,
    title: position >= 0 ? trackTitle(tracks[order[position]]) : '',
    shuffle,
    playing: !element.paused && !element.ended,
  })
  const notify = () => onChange?.(info())

  function trackTitle(track) {
    return track.name.replace(/\.[^.]+$/, '')
  }

  function buildOrder() {
    const indexes = tracks.map((_, i) => i)
    if (!shuffle) return indexes
    const playingTrack = position >= 0 ? order[position] : null
    const rest = shuffleArray(indexes.filter(i => i !== playingTrack))
    return playingTrack === null ? rest : [playingTrack, ...rest]
  }

  function loadPosition(next) {
    position = next
    element.src = tracks[order[position]].url
  }

  async function play() {
    if (!tracks.length) return
    if (position < 0) loadPosition(0)
    try {
      await element.play()
    } catch (err) {
      onError?.(err)
    }
    notify()
  }

  function pause() {
    element.pause()
    notify()
  }

  // Moves to the next or previous track. Going past the last track stops playback.
  function step(delta) {
    if (!tracks.length) return
    const next = position + delta
    if (next < 0 || next >= tracks.length) {
      element.pause()
      position = -1
      element.removeAttribute('src')
      notify()
      return
    }
    loadPosition(next)
    play()
  }

  element.addEventListener('ended', () => step(1))
  element.addEventListener('error', () => {
    onError?.(new Error('Track could not be played'))
    step(1)
  })
  element.addEventListener('play', notify)
  element.addEventListener('pause', notify)

  const adapter = {
    isPlaying: () => !element.paused && !element.ended && !!element.src,
    getLevel: () => gain.gain.value,
    setLevel(value) {
      cancelRamp?.()
      gain.gain.cancelScheduledValues(context.currentTime)
      gain.gain.setValueAtTime(clamp01(value), context.currentTime)
    },
    rampTo(value, ms) {
      cancelRamp?.()
      const now = context.currentTime
      gain.gain.cancelScheduledValues(now)
      gain.gain.setValueAtTime(gain.gain.value, now)
      gain.gain.linearRampToValueAtTime(clamp01(value), now + Math.max(ms, 1) / 1000)
      return new Promise(resolve => {
        const timer = setTimeout(finish, ms)
        function finish() {
          clearTimeout(timer)
          if (cancelRamp === finish) cancelRamp = null
          resolve()
        }
        cancelRamp = finish
      })
    },
  }

  return {
    adapter,
    setFiles(files) {
      element.pause()
      tracks.forEach(track => URL.revokeObjectURL(track.url))
      tracks = files.map(file => ({ name: file.name, url: URL.createObjectURL(file) }))
      shuffle = false
      order = buildOrder()
      position = -1
      element.removeAttribute('src')
      notify()
    },
    play,
    pause,
    next: () => step(1),
    previous: () => step(-1),
    toggleShuffle() {
      // The playing track keeps playing; only its place in the order changes.
      const playingTrack = position >= 0 ? order[position] : -1
      shuffle = !shuffle
      order = buildOrder()
      position = playingTrack >= 0 ? order.indexOf(playingTrack) : -1
      notify()
    },
    info,
    destroy() {
      cancelRamp?.()
      element.pause()
      element.removeAttribute('src')
      source.disconnect()
      gain.disconnect()
      tracks.forEach(track => URL.revokeObjectURL(track.url))
    },
  }
}

// ---- internal: levels ----

function fullLevel() {
  return musicVolume * master
}

function duckedLevel() {
  return settings.duckLevel * fullLevel()
}

function currentMusic() {
  return Object.values(sources).find(source => source && source.isPlaying()) || null
}

// Pushes the right level to every source. A ducked source follows the duck target or the full level.
function applyLevels() {
  for (const source of Object.values(sources)) {
    if (!source) continue
    let level = fullLevel()
    if (state.ducked && source === duckedMusic) {
      level = state.phase === 'restoring' ? fullLevel() : duckedLevel()
    }
    source.setLevel(level)
  }
  emit()
}

async function rampOrSet(music, target, ms) {
  try {
    if (ms <= 0) music.setLevel(target)
    else await music.rampTo(target, ms)
  } catch (err) {
    console.error('Music fade failed', err)
  }
}

// ---- internal: ducking and queue ----

async function runQueue() {
  if (running) return
  running = true
  try {
    for (;;) {
      if (!pending.length) {
        // Nothing waiting. Hold the music down for the delay in case another cheer arrives.
        if (!state.ducked) break
        const more = await waitForPending(settings.delayBeforeUpMs)
        if (!more) {
          await restoreMusic()
          break
        }
      }
      const job = pending.shift()
      emit()
      let buffer
      try {
        buffer = await loadBuffer(job.cheer.audio_url)
      } catch (err) {
        job.handlers.onError?.(err)
        continue
      }
      await duckForCheer()
      const reason = await playCheerAudio(job, buffer)
      job.handlers.onEnd?.(reason)
    }
  } finally {
    running = false
    if (pending.length) runQueue().catch(err => console.error('Booth queue failed', err))
  }
}

function waitForPending(ms) {
  return new Promise(resolve => {
    const end = Date.now() + ms
    const check = () => {
      if (pending.length) return resolve(true)
      if (Date.now() >= end) return resolve(false)
      setTimeout(check, 50)
    }
    check()
  })
}

async function duckForCheer() {
  if (state.ducked) return
  const music = currentMusic()
  // Paused or no music: play the cheer without ducking.
  if (!music) return
  duckedMusic = music
  state.ducked = true
  setPhase('ducking')
  await rampOrSet(music, duckedLevel(), settings.fadeDownMs)
}

async function restoreMusic() {
  const music = duckedMusic
  setPhase('restoring')
  if (music) await rampOrSet(music, fullLevel(), settings.fadeUpMs)
  state.ducked = false
  duckedMusic = null
  setPhase('idle')
}

function playCheerAudio(job, buffer) {
  return new Promise(resolve => {
    playback = { job, buffer, offset: 0, source: null, startAt: 0, paused: false, done: resolve }
    setPhase('cheer')
    job.handlers.onStart?.()
    startSource(playback, 0)
  })
}

function finishPlayback(reason) {
  const finished = playback
  if (!finished) return
  haltSource(finished)
  playback = null
  setPhase(state.ducked ? 'ducked' : 'idle')
  finished.done(reason)
}

function startSource(p, offset) {
  const context = getAudioContext()
  const node = context.createBufferSource()
  node.buffer = p.buffer
  node.connect(cheerInput)
  node.onended = () => {
    if (playback === p && p.source === node) finishPlayback('ended')
  }
  p.source = node
  p.offset = offset
  p.startAt = context.currentTime
  node.start(0, offset)
}

// Stops the current source without ending the cheer. Keeps the position for resume.
function haltSource(p) {
  if (!p.source) return
  p.offset = positionOf(p)
  const node = p.source
  p.source = null
  node.onended = null
  try {
    node.stop()
  } catch {
    // Already stopped.
  }
  node.disconnect()
}

function positionOf(p) {
  if (!p.source) return p.offset
  const elapsed = getAudioContext().currentTime - p.startAt
  return Math.min(p.buffer.duration, p.offset + elapsed)
}

async function loadBuffer(url) {
  if (!bufferCache.has(url)) {
    const promise = fetch(url)
      .then(response => {
        if (!response.ok) throw new Error(`Cheer audio returned ${response.status}`)
        return response.arrayBuffer()
      })
      .then(data => getAudioContext().decodeAudioData(data))
    bufferCache.set(url, promise)
    promise.catch(() => bufferCache.delete(url))
  }
  return bufferCache.get(url)
}

function setPhase(phase) {
  state.phase = phase
  emit()
}

// ---- internal: status ----

function snapshot() {
  const p = playback
  return {
    phase: state.phase,
    ducked: state.ducked,
    musicPlaying: !!currentMusic(),
    cheerId: p ? p.job.cheer.id : null,
    paused: p ? p.paused : false,
    position: p ? positionOf(p) : 0,
    duration: p ? p.buffer.duration : 0,
    queued: pending.map(job => job.cheer.id),
  }
}

// Notifies subscribers only when something visible changed.
function emit() {
  const next = snapshot()
  const changed = Object.keys(next).some(key => {
    const a = next[key]
    const b = current[key]
    if (Array.isArray(a)) return a.join() !== b.join()
    if (key === 'position') return Math.floor(a * 4) !== Math.floor(b * 4)
    return a !== b
  })
  if (!changed) return
  current = next
  subscribers.forEach(callback => callback(current))
}

function clamp01(value) {
  return Math.min(1, Math.max(0, Number(value) || 0))
}

function shuffleArray(list) {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}
