// Audio engine for the booth: one shared AudioContext, the cheer chain, the DJ live input, and the
// ducking state machine. Music sources (YouTube, a music folder, live input) register an adapter with
// { isPlaying(), getLevel(), setLevel(v), rampTo(v, ms) }. Levels are 0..1.
// An `external` adapter (the CheerSpot Ducker app on the DJ's laptop) also has hold(level) and
// holdEveryMs: it controls volume outside this page, takes the duck level as is, and is not counted
// as booth music for the status pill.

// Gentle on purpose: the music sinks over 2.5 s, the cheer starts only once it is down, and the music
// comes back slowly after a short pause, so a cheer never jumps in over a loud track.
export const DEFAULT_DUCKING = {
  duckLevel: 0.25,
  fadeDownMs: 2500,
  fadeUpMs: 3500,
  delayBeforeUpMs: 1500,
}

const TICK_MS = 250
// A short breath between the music settling down and the voice starting.
const CHEER_LEAD_MS = 300
// Short fades on the cheer itself, so start, pause and skip never click.
const CHEER_FADE_IN_S = 0.06
const CHEER_FADE_OUT_S = 0.12
// Ducked music never drops below this (6% on YouTube's 0-100 scale), so it never goes silent
// under a cheer, even with a low music volume. Only a volume of 0 means silence.
const DUCK_FLOOR = 0.06
const CURVE_POINTS = 64

let ctx = null
let cheerInput = null
let cheerGain = null
let tickTimer = null

let settings = { ...DEFAULT_DUCKING }
// Cheer volume and music volume are independent: one slider each in the booth.
let cheerVolume = 1
let musicVolume = 1
const sources = {}
// Every source that was playing when the music went down. All of them come back up together.
let duckedSources = []
// Re-sends the duck to external sources while a cheer plays or is paused (see startHold).
let holdTimer = null

const pending = []
let running = false
// The job taken from pending: loading its audio, ducking, then playing. Cleared when it ends.
let activeJob = null
let playback = null
const bufferCache = new Map()
const subscribers = new Set()
const state = { phase: 'idle', ducked: false }
let current = snapshot()

// The shared context, created when the booth starts. It only plays once the browser allows sound.
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
    cheerGain.gain.value = cheerVolume
    compressor.connect(cheerGain)
    cheerGain.connect(ctx.destination)
    cheerInput = compressor
  }
  return ctx
}

// Resumes the shared context and starts the status tick. Returns false when the browser still blocks
// sound: without a click or key press on the site, resume() never settles, so it is given 400 ms.
// resume() runs before the first await, so a call from a click handler counts as that click.
export async function startAudio() {
  const context = getAudioContext()
  if (context.state !== 'running') await Promise.race([context.resume().catch(() => {}), delay(400)])
  if (context.state !== 'running') return false
  if (!tickTimer) tickTimer = setInterval(emit, TICK_MS)
  return true
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

export function getDuckingSettings() {
  return { ...settings }
}

// A source turned its music back up by itself (the Ducker app's fail-safe), or never went down.
// It is no longer counted as ducked: the next cheer ducks it again in full and waits for it, and no
// restore is sent for it. With nothing else down, the booth is no longer ducked either.
export function markSourceRestored(source) {
  if (!source || !duckedSources.includes(source)) return
  duckedSources = duckedSources.filter(item => item !== source)
  if (!duckedSources.length) state.ducked = false
  emit()
}

// Sets the cheer level only; music has its own volume.
export function setCheerVolume(value) {
  cheerVolume = clamp01(value)
  if (cheerGain) cheerGain.gain.setTargetAtTime(cheerVolume, ctx.currentTime, 0.02)
}

export function setMusicVolume(value) {
  musicVolume = clamp01(value)
  applyLevels()
}

// Register a music adapter under a name ('youtube', 'folder' or 'live'). Pass null to remove it.
export function registerMusicSource(name, adapter) {
  sources[name] = adapter || null
  applyLevels()
  emit()
}

// Queues a cheer. The cheer needs an id and either audio_url or getAudioUrl() (for short-lived links).
// Handlers: onStart (audio begins), onEnd(reason), onError(err).
// A cheer that is already waiting, loading or playing is not queued again. Returns false then.
export function playCheer(cheer, handlers = {}) {
  if (activeJob?.cheer.id === cheer.id || pending.some(job => job.cheer.id === cheer.id)) return false
  pending.push({ cheer, handlers })
  emit()
  runQueue().catch(err => console.error('Booth queue failed', err))
  return true
}

// Downloads and decodes a cheer's audio ahead of time, so it starts without a wait. Errors are
// ignored here; playing the cheer retries and reports them.
export function preloadCheer(cheer) {
  loadBuffer(cheer).catch(() => {})
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

// Lists audio inputs (USB audio interface, line in). Labels only appear after mic permission.
export async function listAudioInputs() {
  if (!navigator.mediaDevices?.enumerateDevices) return []
  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices
    .filter(device => device.kind === 'audioinput')
    .map((device, i) => ({ id: device.deviceId, label: device.label || `Audio input ${i + 1}` }))
}

// The DJ mixer's output, coming in through an audio interface. Browser voice processing is off,
// so the music passes through unchanged. Routed through a GainNode the ducker controls.
export async function createLiveInput(deviceId) {
  const context = getAudioContext()
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: deviceId ? { exact: deviceId } : undefined,
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: { ideal: 2 },
      latency: { ideal: 0.01 },
    },
  })
  const source = context.createMediaStreamSource(stream)
  const gain = context.createGain()
  const analyser = context.createAnalyser()
  analyser.fftSize = 1024
  source.connect(analyser)
  source.connect(gain)
  gain.connect(context.destination)
  const track = stream.getAudioTracks()[0]
  const samples = new Float32Array(analyser.fftSize)
  const adapter = createGainAdapter(gain, () => track?.readyState === 'live')

  return {
    adapter,
    label: track?.label || 'Audio input',
    // Signal strength 0..1 before the booth's volume, for the input meter.
    meter() {
      analyser.getFloatTimeDomainData(samples)
      let peak = 0
      for (const value of samples) peak = Math.max(peak, Math.abs(value))
      return peak
    },
    onEnded(callback) {
      track?.addEventListener('ended', callback)
    },
    destroy() {
      adapter.cancel()
      stream.getTracks().forEach(t => t.stop())
      source.disconnect()
      gain.disconnect()
      analyser.disconnect()
    },
  }
}

// Music adapter for a source routed through a GainNode (live input, music folder): the ducker sets
// and fades the gain with an eased curve. cancel() stops a fade that is still running.
export function createGainAdapter(gain, isPlaying) {
  const context = gain.context
  let cancelRamp = null
  return {
    isPlaying,
    getLevel: () => gain.gain.value,
    setLevel(value) {
      cancelRamp?.()
      gain.gain.cancelScheduledValues(context.currentTime)
      gain.gain.setValueAtTime(clamp01(value), context.currentTime)
    },
    rampTo(value, ms) {
      cancelRamp?.()
      const now = context.currentTime
      const from = gain.gain.value
      // Hold the current level, then run the curve just after it (a curve may not overlap another event).
      gain.gain.cancelScheduledValues(now)
      gain.gain.setValueAtTime(from, now)
      gain.gain.setValueCurveAtTime(easedCurve(from, clamp01(value)), now + 0.01, Math.max(ms, 1) / 1000)
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
    cancel: () => cancelRamp?.(),
  }
}

// ---- internal: levels ----

function fullLevel() {
  return musicVolume
}

function duckedLevel() {
  const full = fullLevel()
  return Math.min(full, Math.max(settings.duckLevel * full, DUCK_FLOOR))
}

// Every source that is playing now, booth music and external alike.
function activeSources() {
  return Object.values(sources).filter(source => source && source.isPlaying())
}

// Music the booth itself plays (YouTube, folder, live input). Drives the status pill.
function boothMusicPlaying() {
  return activeSources().some(source => !source.external)
}

// Where a source goes when ducked or restored. External sources take the duck level as is; their
// full level is the app's own normal value, sent as 1. Booth sources follow the music volume.
function duckTarget(source) {
  return source.external ? clamp01(settings.duckLevel) : duckedLevel()
}

function fullTarget(source) {
  return source.external ? 1 : fullLevel()
}

// Pushes the right level to every source. A ducked source follows the duck target or the full level.
function applyLevels() {
  for (const source of Object.values(sources)) {
    if (!source) continue
    let level = fullTarget(source)
    if (state.ducked && duckedSources.includes(source)) {
      level = state.phase === 'restoring' ? fullTarget(source) : duckTarget(source)
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
      activeJob = job
      emit()
      let buffer
      try {
        buffer = await loadBuffer(job.cheer)
      } catch (err) {
        activeJob = null
        emit()
        job.handlers.onError?.(err)
        continue
      }
      // The music fades down fully first, then the cheer starts, so the voice never lands on a loud track.
      // A cheer right after another (music already down) or with no music playing starts at once.
      const wasDucked = state.ducked
      await duckForCheer()
      if (!wasDucked && state.ducked) await delay(CHEER_LEAD_MS)
      const reason = await playCheerAudio(job, buffer)
      activeJob = null
      emit()
      job.handlers.onEnd?.(reason)
    }
  } finally {
    running = false
    if (pending.length) runQueue().catch(err => console.error('Booth queue failed', err))
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
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
  if (state.ducked) {
    // Already down from the cheer before. External sources get a fresh duck so the app's own time
    // limit starts again; nothing waits for it. A source that started playing since then goes down too.
    // A source that is up (started since, or restored itself) is ducked in full and waited for.
    holdExternal()
    const fresh = activeSources().filter(source => !duckedSources.includes(source))
    if (!fresh.length) return
    duckedSources = [...duckedSources, ...fresh]
    await Promise.all(fresh.map(source => rampOrSet(source, duckTarget(source), settings.fadeDownMs)))
    return
  }
  const music = activeSources()
  // Paused or no music: play the cheer without ducking.
  if (!music.length) return
  duckedSources = music
  state.ducked = true
  setPhase('ducking')
  await Promise.all(music.map(source => rampOrSet(source, duckTarget(source), settings.fadeDownMs)))
}

async function restoreMusic() {
  const music = duckedSources
  setPhase('restoring')
  await Promise.all(music.map(source => rampOrSet(source, fullTarget(source), settings.fadeUpMs)))
  state.ducked = false
  duckedSources = []
  setPhase('idle')
}

// Sends the duck again to every ducked external source. Only called while a cheer is about to play,
// playing or paused, so the app's own time limit still restores the music if the booth goes away.
function holdExternal() {
  duckedSources.forEach(source => {
    if (source.external && source.hold) source.hold(duckTarget(source))
  })
}

// Runs only for the life of one cheer's playback: started when it begins, stopped when it ends.
function startHold() {
  stopHold()
  const every = Math.min(...duckedSources.filter(source => source.external && source.holdEveryMs > 0).map(source => source.holdEveryMs))
  if (!Number.isFinite(every)) return
  holdTimer = setInterval(() => {
    if (playback && state.ducked) holdExternal()
    else stopHold()
  }, every)
}

function stopHold() {
  clearInterval(holdTimer)
  holdTimer = null
}

function playCheerAudio(job, buffer) {
  return new Promise(resolve => {
    playback = { job, buffer, offset: 0, source: null, startAt: 0, paused: false, done: resolve }
    setPhase('cheer')
    if (state.ducked) startHold()
    job.handlers.onStart?.()
    startSource(playback, 0)
  })
}

function finishPlayback(reason) {
  const finished = playback
  if (!finished) return
  haltSource(finished)
  playback = null
  stopHold()
  setPhase(state.ducked ? 'ducked' : 'idle')
  finished.done(reason)
}

function startSource(p, offset) {
  const context = getAudioContext()
  const node = context.createBufferSource()
  node.buffer = p.buffer
  const fade = context.createGain()
  fade.gain.setValueAtTime(0, context.currentTime)
  fade.gain.linearRampToValueAtTime(1, context.currentTime + CHEER_FADE_IN_S)
  node.connect(fade)
  fade.connect(cheerInput)
  node.onended = () => {
    if (playback === p && p.source === node) finishPlayback('ended')
  }
  p.source = node
  p.fade = fade
  p.offset = offset
  p.startAt = context.currentTime
  node.start(0, offset)
}

// Stops the current source without ending the cheer. Keeps the position for resume.
function haltSource(p) {
  if (!p.source) return
  p.offset = positionOf(p)
  const node = p.source
  const fade = p.fade
  p.source = null
  p.fade = null
  node.onended = null
  // Fade out briefly, then stop. The old node finishes on its own; a resume uses a new one.
  const context = getAudioContext()
  const now = context.currentTime
  fade.gain.cancelScheduledValues(now)
  fade.gain.setValueAtTime(fade.gain.value, now)
  fade.gain.linearRampToValueAtTime(0, now + CHEER_FADE_OUT_S)
  node.onended = () => {
    node.disconnect()
    fade.disconnect()
  }
  try {
    node.stop(now + CHEER_FADE_OUT_S)
  } catch {
    // Already stopped.
    node.disconnect()
    fade.disconnect()
  }
}

function positionOf(p) {
  if (!p.source) return p.offset
  const elapsed = getAudioContext().currentTime - p.startAt
  return Math.min(p.buffer.duration, p.offset + elapsed)
}

// Cached by cheer id, because signed links change on every request.
async function loadBuffer(cheer) {
  const key = cheer.id
  if (!bufferCache.has(key)) {
    const promise = Promise.resolve(cheer.audio_url || cheer.getAudioUrl())
      .then(url => fetch(url))
      .then(response => {
        if (!response.ok) throw new Error(`Cheer audio returned ${response.status}`)
        return response.arrayBuffer()
      })
      .then(data => getAudioContext().decodeAudioData(data))
    bufferCache.set(key, promise)
    promise.catch(() => bufferCache.delete(key))
  }
  return bufferCache.get(key)
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
    musicPlaying: boothMusicPlaying(),
    cheerId: p ? p.job.cheer.id : null,
    paused: p ? p.paused : false,
    position: p ? positionOf(p) : 0,
    duration: p ? p.buffer.duration : 0,
    // Waiting cheers plus the one loading or ducking, so the AUTO scheduler never picks them twice.
    queued: [...(activeJob && !p ? [activeJob.cheer.id] : []), ...pending.map(job => job.cheer.id)],
    // True from the moment a cheer is taken until it ends, including while its audio loads.
    busy: !!activeJob,
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

// Smoothstep: starts and ends gently, so a fade has no audible corner. Shared with the YouTube fade.
export function ease(t) {
  return t * t * (3 - 2 * t)
}

function easedCurve(from, to) {
  const curve = new Float32Array(CURVE_POINTS)
  for (let i = 0; i < CURVE_POINTS; i += 1) curve[i] = from + (to - from) * ease(i / (CURVE_POINTS - 1))
  return curve
}

function clamp01(value) {
  return Math.min(1, Math.max(0, Number(value) || 0))
}
