// Link from the booth to the CheerSpot Ducker app on the DJ's MacBook, over a Supabase Realtime
// Broadcast channel named after the app's pairing code. The app turns rekordbox's Master Level down
// when the booth sends `duck` and back up on `restore`; the app's own fail-safe restores the music if
// the booth goes quiet. Nothing here may block a cheer: every wait has a time limit, and while the
// app is offline the booth simply plays cheers as before.
//
// Contract: every payload is { v: 1, from, type, id?, ... }. Booth -> app: hello, duck, restore, ping,
// test, restore_now, config, send_value. App -> booth: welcome, ducked, restored, status, error.

import { DUCKER_DEFAULTS as D } from './duckerConfig.js'
import { getDuckingSettings, markSourceRestored, registerMusicSource } from './ducking.js'
import { supabase } from './supabase.js'

const log = (...args) => console.log('[ducker]', ...args)
const warn = (...args) => console.warn('[ducker]', ...args)

let channel = null
let pairCode = ''
let channelStatus = 'closed'
let lastStatus = null
let lastStatusAt = 0
let lastError = null
// The app's last fail-safe restore, shown briefly in the panel: { text, reason, at }.
let notice = null
let appVersion = ''
let pingTimer = null
let seq = 0
// Replies awaited by id: { resolve, timer }.
const waiters = new Map()
const listeners = new Set()

// ---- pairing code ----

// Upper case, spaces removed. The app shows 8 characters from DUCKER_DEFAULTS.pairAlphabet.
export function normalizePairCode(text) {
  return String(text || '')
    .toUpperCase()
    .replace(/\s+/g, '')
}

export function isValidPairCode(text) {
  return D.pairCodePattern.test(normalizePairCode(text))
}

function readStorage(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key, value) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Storage blocked: the booth still connects, a refresh just will not reconnect by itself.
  }
}

export function savedPairCode() {
  return normalizePairCode(readStorage(D.storageKeys.pairCode))
}

// ---- state for the panel ----

function isOnline(now = Date.now()) {
  return !!channel && channelStatus === 'SUBSCRIBED' && !!lastStatus && now - lastStatusAt <= D.offlineAfterMs
}

// Ready = online and the app says MIDI is ready. Only then does the booth wait for it.
function isReady(now = Date.now()) {
  return isOnline(now) && lastStatus?.ready === true
}

function snapshot() {
  return {
    pairCode,
    connected: !!channel,
    channelStatus,
    status: lastStatus,
    statusAt: lastStatusAt,
    online: isOnline(),
    ready: isReady(),
    appVersion: lastStatus?.appVersion || appVersion,
    lastError,
    notice,
  }
}

function emit() {
  const next = snapshot()
  listeners.forEach(callback => callback(next))
}

export function getDuckerState() {
  return snapshot()
}

export function subscribeDucker(callback) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

// ---- sending ----

function nextId(type) {
  seq += 1
  return `${type}-${Date.now().toString(36)}-${seq}`
}

// Sends one message. Returns false when the channel is not joined (the message is dropped).
function send(type, fields = {}) {
  const payload = { v: D.protocolVersion, from: D.fromBooth, type, ...fields }
  if (!channel || channelStatus !== 'SUBSCRIBED') {
    log('not sent, channel not joined:', payload)
    return false
  }
  log('→', payload)
  channel.send({ type: 'broadcast', event: D.event, payload }).catch(err => warn('send failed', type, err))
  return true
}

// Sends a message and waits for the reply with the same id, or resolves after timeoutMs with
// { skipped: true, reason: 'timeout' }. Never rejects.
function request(type, fields, timeoutMs) {
  const id = nextId(type)
  return new Promise(resolve => {
    const finish = reply => {
      const waiter = waiters.get(id)
      if (!waiter) return
      clearTimeout(waiter.timer)
      waiters.delete(id)
      resolve(reply)
    }
    const timer = setTimeout(() => {
      warn(`no reply to ${type} ${id} within ${timeoutMs} ms, going on`)
      finish({ id, skipped: true, reason: 'timeout' })
    }, timeoutMs)
    waiters.set(id, { resolve: finish, timer })
    if (!send(type, { id, ...fields })) finish({ id, skipped: true, reason: 'offline' })
  })
}

function settleAllWaiters(reason) {
  for (const [id, waiter] of [...waiters]) waiter.resolve({ id, skipped: true, reason })
}

// ---- receiving ----

function handle(payload) {
  if (!payload || payload.from !== D.fromDucker) {
    log('ignored (not from ducker):', payload)
    return
  }
  log('←', payload)
  switch (payload.type) {
    case 'status':
      lastStatus = payload
      lastStatusAt = Date.now()
      break
    case 'welcome':
      if (payload.appVersion) appVersion = payload.appVersion
      break
    case 'ducked':
    case 'restored': {
      // A restore the booth did not ask for (no id, or a fail-safe reason): the app brought the music back.
      const failsafe =
        payload.type === 'restored' && (!payload.id || String(payload.reason || '').startsWith(D.failsafePrefix))
      if (failsafe) appRestored(payload.reason)
      else if (payload.skipped && payload.reason === D.midiNotReadyCode) markMidiNotReady()
      if (payload.id) waiters.get(payload.id)?.resolve(payload)
      break
    }
    case 'error':
      lastError = { code: payload.code, message: payload.message, at: Date.now() }
      warn('app error', payload.code, payload.message)
      // MIDI not ready: stop waiting for the app now, so the cheer plays straight away.
      if (payload.code === D.midiNotReadyCode) {
        markMidiNotReady()
        settleAllWaiters(D.midiNotReadyCode)
      }
      break
    default:
      break
  }
  emit()
}

// The app restored the music by itself (its fail-safe). The booth stops counting it as ducked, so the
// next cheer ducks it in full and waits for the reply instead of only re-sending a hold.
function appRestored(reason) {
  const label = D.failsafeReasons[reason] || reason || 'tanpa alasan'
  log(`app restored the music by itself (${reason || 'no reason'})`)
  level = 1
  markSourceRestored(adapter)
  notice = { text: `Ducker menaikkan musik otomatis (${label})`, reason, at: Date.now() }
}

// MIDI is not ready on the app: treat it as not ready until its next status says otherwise. The chip
// turns yellow and cheers play without waiting for it.
function markMidiNotReady() {
  if (!lastStatus) return
  if (lastStatus.ready !== false || lastStatus.midiReady !== false) log('MIDI not ready on the app, not waiting for it')
  lastStatus = { ...lastStatus, ready: false, midiReady: false }
}

// What a reply means for the booth. Skipped with an ok reason (already_ducked, in_progress) = done.
// Skipped for a reason of the booth's own (no reply in time) = unknown, nothing changes. Any other
// skipped duck = the music did not go down, so it is not counted as ducked.
function settleReply(type, reply) {
  if (!reply?.skipped) return
  const reason = reply.reason || ''
  if (D.okSkipReasons.includes(reason)) {
    log(`${type} skipped (${reason}), counted as done`)
    return
  }
  if (D.localSkipReasons.includes(reason)) return
  warn(`${type} skipped (${reason || 'no reason'})`)
  if (type === 'duck') {
    level = 1
    markSourceRestored(adapter)
  }
}

// ---- music adapter for ducking.js ----

// The app's volume as the booth last asked for it: 1 = the app's normal value.
let level = 1

const adapter = {
  external: true,
  holdEveryMs: D.holdEveryMs,
  isPlaying: () => isReady(),
  getLevel: () => level,
  // The app owns the rekordbox level; the booth's music volume slider does not reach it.
  setLevel() {},
  // level < 1 -> duck, otherwise restore. Resolves on the app's reply or after the fade plus a grace
  // period, so a slow or missing reply never holds a cheer back.
  rampTo(target, ms) {
    level = target
    const fadeMs = Math.max(0, Math.round(ms))
    const wait = fadeMs + D.replyGraceMs
    const type = target < 1 ? 'duck' : 'restore'
    const fields = type === 'duck' ? { level: target, fadeMs } : { fadeMs }
    return request(type, fields, wait).then(reply => {
      settleReply(type, reply)
      return reply
    })
  },
  // Already ducked: send the duck again without waiting, so the app's time limit starts over.
  hold(target) {
    level = target
    send('duck', { id: nextId('duck'), level: target, fadeMs: 0 })
  },
}

// ---- connect / disconnect ----

function restoreFadeMs() {
  return Math.max(0, Math.round(getDuckingSettings().fadeUpMs))
}

// Joins the app's channel. Returns { ok, error? }. A refresh reconnects by itself until disconnect().
export function connectDucker(code) {
  const next = normalizePairCode(code)
  if (!isValidPairCode(next)) return { ok: false, error: 'invalid-code' }
  if (!supabase) {
    warn('Supabase is not configured, cannot connect')
    return { ok: false, error: 'no-supabase' }
  }
  if (channel && pairCode === next) return { ok: true }
  if (channel) leave({ forget: false })

  pairCode = next
  lastStatus = null
  lastStatusAt = 0
  lastError = null
  notice = null
  appVersion = ''
  writeStorage(D.storageKeys.pairCode, pairCode)
  writeStorage(D.storageKeys.autoConnect, '1')

  const joined = supabase.channel(D.channelPrefix + pairCode, { config: { broadcast: { self: false } } })
  channel = joined
  channelStatus = 'joining'
  joined.on('broadcast', { event: D.event }, ({ payload }) => {
    if (channel === joined) handle(payload)
  })
  joined.subscribe((status, err) => {
    if (channel !== joined) return
    channelStatus = status
    log('channel', D.channelPrefix + pairCode, status, err ? err.message : '')
    // Every (re)join says hello, so the app sends its status straight away.
    if (status === 'SUBSCRIBED') send('hello', { clientVersion: D.clientVersion })
    emit()
  })
  clearInterval(pingTimer)
  pingTimer = setInterval(() => {
    if (channelStatus === 'SUBSCRIBED') send('ping')
    // Also re-checks offline: the app may have gone quiet.
    emit()
  }, D.pingMs)

  registerMusicSource('external', adapter)
  emit()
  return { ok: true }
}

// Leaves the channel. Sends a restore first (best effort). forget: false keeps the code and the
// reconnect flag, for when the booth closes (log out) rather than the operator pressing Disconnect.
function leave({ forget }) {
  const closing = channel
  if (!closing) return
  if (channelStatus === 'SUBSCRIBED') send('restore', { id: nextId('restore'), fadeMs: restoreFadeMs() })
  registerMusicSource('external', null)
  clearInterval(pingTimer)
  pingTimer = null
  channel = null
  channelStatus = 'closed'
  lastStatus = null
  lastStatusAt = 0
  level = 1
  settleAllWaiters('disconnected')
  if (forget) writeStorage(D.storageKeys.autoConnect, null)
  // Give the restore a moment to go out before the socket leaves the channel.
  setTimeout(() => supabase?.removeChannel(closing), D.leaveFlushMs)
  log('left channel', D.channelPrefix + pairCode, forget ? '(disconnected)' : '(booth closed)')
  emit()
}

export function disconnectDucker() {
  leave({ forget: true })
}

// Called when the booth closes: leaves the channel but reconnects on the next booth start.
export function closeDucker() {
  leave({ forget: false })
}

// Reconnects with the saved code if the operator was connected before a refresh or log out.
export function autoConnectDucker() {
  if (readStorage(D.storageKeys.autoConnect) !== '1') return
  const code = savedPairCode()
  if (isValidPairCode(code)) connectDucker(code)
}

// ---- operator actions ----

export function testDucker() {
  return send('test', { id: nextId('test') })
}

export function restoreNow() {
  return send('restore_now', { id: nextId('restore_now') })
}

export function sendConfig(config) {
  return send('config', config)
}

export function sendValue(value) {
  return send('send_value', { value })
}

// Closing the tab or browser: ask for a restore (best effort). The app's own fail-safe is the real guard.
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    if (channel && channelStatus === 'SUBSCRIBED') send('restore', { id: nextId('restore'), fadeMs: restoreFadeMs() })
  })
}
