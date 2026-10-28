// Audio engine for the booth: one shared AudioContext, the cheer chain, the DJ live input, and the
// ducking state machine. Music sources (YouTube, live input) register an adapter with
// { isPlaying(), getLevel(), setLevel(v), rampTo(v, ms) }. Levels are 0..1.

export const DEFAULT_DUCKING = {
  duckLevel: 0.3,
  fadeDownMs: 1000,
  fadeUpMs: 2500,
  delayBeforeUpMs: 1200,
}

const TICK_MS = 250
// The cheer starts once the music is this far into its fade down, so there is no silent gap.
const CHEER_OVERLAP = 0.6
// Short fades on the cheer itself, so start, pause and skip never click.
const CHEER_FADE_IN_S = 0.06
const CHEER_FADE_OUT_S = 0.12
// Ducked music never drops below this (6% on YouTube's 0-100 scale), so it never goes silent
// under a cheer, even with low music or master volume. Only a volume of 0 means silence.
const DUCK_FLOOR = 0.06
const CURVE_POINTS = 64

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
    cheerGain.gain.value = master
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

export function setMasterVolume(value) {
  master = clamp01(value)
  if (cheerGain) cheerGain.gain.setTargetAtTime(master, ctx.currentTime, 0.02)
  applyLevels()
}

export function setMusicVolume(value) {
  musicVolume = clamp01(value)
  applyLevels()
}

// Register a music adapter under a name ('youtube' or 'live'). Pass null to remove it.
export function registerMusicSource(name, adapter) {
  sources[name] = adapter || null
  applyLevels()
  emit()
}

// Queues a cheer. The cheer needs an id and either audio_url or getAudioUrl() (for short-lived links).
// Handlers: onStart (audio begins), onEnd(reason), onError(err).
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
  let cancelRamp = null

  const adapter = {
    isPlaying: () => track?.readyState === 'live',
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
  }

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
      cancelRamp?.()
      stream.getTracks().forEach(t => t.stop())
      source.disconnect()
      gain.disconnect()
      analyser.disconnect()
    },
  }
}

// ---- internal: levels ----

function fullLevel() {
  return musicVolume * master
}

function duckedLevel() {
  const full = fullLevel()
  return Math.min(full, Math.max(settings.duckLevel * full, DUCK_FLOOR))
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
        buffer = await loadBuffer(job.cheer)
      } catch (err) {
        job.handlers.onError?.(err)
        continue
      }
      // Start the cheer while the music is still fading down. The fade finishes underneath it.
      const ducking = duckForCheer()
      await Promise.race([ducking, delay(settings.fadeDownMs * CHEER_OVERLAP)])
      const reason = await playCheerAudio(job, buffer)
      await ducking
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
