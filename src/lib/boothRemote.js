// Remote control of the DJ booth. Booth side: receive admin commands, claim them, broadcast status.
// Admin side: send commands, read their outcome, listen to booth status.
//
// Commands are rows in cheerspot_booth_commands. Only a signed-in superadmin may insert (RLS); the
// booth claims each row through cheerspot_booth_claim_command, which runs it at most once across all
// booths and refuses commands older than BOOTH_REMOTE.maxAgeSec by the server clock. Nothing here may
// stop the booth: every failure is logged and the booth keeps running in its current mode.

import { BOOTH_REMOTE as R } from './boothRemoteConfig.js'
import { watchTables } from './realtime.js'
import { supabase } from './supabase.js'

const log = (...args) => console.log('[booth-remote]', ...args)
const warn = (...args) => console.warn('[booth-remote]', ...args)

// ---- booth identity ----

// One id per /dj tab. Kept in sessionStorage, so a refresh of the same tab keeps it.
export function boothId() {
  try {
    const saved = sessionStorage.getItem(R.boothIdKey)
    if (saved) return saved
    const id = `booth-${crypto.randomUUID().slice(0, 8)}`
    sessionStorage.setItem(R.boothIdKey, id)
    return id
  } catch {
    return `booth-${Math.random().toString(36).slice(2, 10)}`
  }
}

// ---- booth: commands ----

// Calls onCommand(row) once for every new, unhandled command: pushed by Realtime, and found by a
// poll as a safety net. Returns a stop function.
export function watchCommands(onCommand) {
  if (!supabase) return () => {}
  const seen = new Set()
  const handle = row => {
    if (!row?.id || row.executed_at || row.result || seen.has(row.id)) return
    seen.add(row.id)
    if (seen.size > R.seenLimit) seen.delete(seen.values().next().value)
    onCommand(row)
  }
  const poll = async () => {
    const { data, error } = await supabase
      .from(R.table)
      .select('id, type, payload, created_at, executed_at, result')
      .is('executed_at', null)
      .is('result', null)
      .order('created_at', { ascending: false })
      .limit(R.pollLimit)
    if (error) {
      warn('poll failed', error.message)
      return
    }
    // Oldest first, as they were sent. Old ones are refused as stale by the server when claimed.
    ;[...data].reverse().forEach(handle)
  }
  const unwatch = watchTables([R.table], (_table, payload) => {
    if (payload.eventType === 'INSERT') handle(payload.new)
  })
  poll()
  const timer = setInterval(poll, R.pollMs)
  return () => {
    clearInterval(timer)
    unwatch()
  }
}

// Claims a command before running it. Returns 'claimed' (run it), 'stale', 'taken', 'missing' or
// 'error' (do not run it).
export async function claimCommand(id, result, booth) {
  if (!supabase) return 'error'
  const { data, error } = await supabase.rpc(R.claimRpc, {
    p_id: id,
    p_booth_id: booth,
    p_result: result,
    p_max_age_sec: R.maxAgeSec,
  })
  if (error) {
    warn('claim failed', id, error.message)
    return 'error'
  }
  return data
}

// ---- booth: status ----

// Broadcasts getStatus() every statusEveryMs on the public status channel. Returns { stop, sendNow }.
export function startStatusBroadcast(getStatus) {
  if (!supabase) return { stop() {}, sendNow() {} }
  const channel = supabase.channel(R.statusChannel, { config: { broadcast: { self: false } } })
  let joined = false
  channel.subscribe(status => {
    joined = status === 'SUBSCRIBED'
    if (joined) sendNow()
  })
  function sendNow() {
    if (!joined) return
    let payload
    try {
      payload = { v: R.statusVersion, at: Date.now(), ...getStatus() }
    } catch (err) {
      warn('status failed', err)
      return
    }
    channel.send({ type: 'broadcast', event: R.statusEvent, payload }).catch(err => warn('status send failed', err))
  }
  const timer = setInterval(sendNow, R.statusEveryMs)
  return {
    sendNow,
    stop() {
      clearInterval(timer)
      supabase.removeChannel(channel)
    },
  }
}

// ---- admin ----

// Listens to every booth's status. Calls onStatus(payload) for each message. Returns a stop function.
export function watchBoothStatus(onStatus) {
  if (!supabase) return () => {}
  const channel = supabase.channel(R.statusChannel, { config: { broadcast: { self: false } } })
  channel.on('broadcast', { event: R.statusEvent }, ({ payload }) => {
    if (payload && payload.v === R.statusVersion && typeof payload.boothId === 'string') onStatus(payload)
  })
  channel.subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}

// Inserts a command. Resolves with the new row; rejects if RLS or the network refuses it.
export async function sendCommand(type, payload = {}) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data, error } = await supabase
    .from(R.table)
    .insert({ type, payload })
    .select('id, type, payload, created_at, created_by_email, executed_at, executed_by, result')
    .single()
  if (error) throw error
  log('sent', type, payload, data.id)
  return data
}

// The latest commands with their outcome (the audit log), newest first.
export async function fetchRecentCommands() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from(R.table)
    .select('id, type, payload, created_at, created_by_email, executed_at, executed_by, result')
    .order('created_at', { ascending: false })
    .limit(R.historyLimit)
  if (error) throw error
  return data
}

// Calls onChange() whenever a command row is added or updated. Returns a stop function.
export function watchCommandChanges(onChange) {
  return watchTables([R.table], () => onChange())
}
