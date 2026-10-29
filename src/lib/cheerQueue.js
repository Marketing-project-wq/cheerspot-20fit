// The only data layer for the booth queue. Components import this file and nothing else.
// Reads approved and played cheers from Supabase. Realtime pushes each change, which triggers a
// fresh read; a slow poll covers missed events, and a fast one runs while Realtime is down.
// The operator's order lives in memory only.
import { getAudioUrl } from './cheers.js'
import { watchTables } from './realtime.js'
import { deleteCheer } from './staff.js'
import { supabase } from './supabase.js'

const POLL_MS = 3000
const LIVE_POLL_MS = 15000
const HISTORY_LIMIT = 50
const COLUMNS = 'id, created_at, sender_name, athlete_name, duration_sec, audio_path, status, transcript'

let items = []
let order = []
// Cheers marked played here whose save the server has not shown yet. Until a poll returns them as
// something other than approved, they stay played on screen, so AUTO never plays them twice. A
// failed save or a later "Play again" from the superadmin is then followed as the server says.
const playedPending = new Set()
// When each cheer was played in this booth session. Only orders the played list; never forces a status.
const playedAt = new Map()
// Cheers deleted from the booth. Polls leave them out, so they never flash back.
const deleted = new Set()
const listeners = new Set()
const errorListeners = new Set()
let timer = null
let loading = null
// A change arrived while a read was in flight. That read may predate it, so read once more after.
let again = false
let unwatch = null
let live = false

function toItem(row) {
  if (playedPending.has(row.id) && row.status !== 'approved') playedPending.delete(row.id)
  const status = playedPending.has(row.id) ? 'played' : row.status
  return {
    ...row,
    status,
    playedAt: status === 'played' ? playedAt.get(row.id) || Date.parse(row.created_at) : null,
    getAudioUrl: () => getAudioUrl(row.audio_path),
  }
}

function snapshot() {
  return items.map(item => ({ ...item }))
}

function emit() {
  const next = snapshot()
  listeners.forEach(callback => callback(next))
}

// Approved cheers keep the operator's order. New ones join the end, oldest first.
function applyOrder(next) {
  const approvedIds = new Set(next.filter(item => item.status === 'approved').map(item => item.id))
  order = order.filter(id => approvedIds.has(id))
  next.forEach(item => {
    if (item.status === 'approved' && !order.includes(item.id)) order.push(item.id)
  })
  const byId = new Map(next.map(item => [item.id, item]))
  const approved = order.map(id => byId.get(id))
  // Played list: most recently played first (this session), then the rest by when they were sent.
  const played = next.filter(item => item.status === 'played').sort((a, b) => b.playedAt - a.playedAt)
  return [...approved, ...played]
}

async function fetchCheers() {
  if (!supabase) throw new Error('Supabase is not configured')
  const [approvedRes, playedRes] = await Promise.all([
    supabase.from('cheerspot_cheers').select(COLUMNS).eq('status', 'approved').order('created_at', { ascending: true }),
    supabase
      .from('cheerspot_cheers')
      .select(COLUMNS)
      .eq('status', 'played')
      .order('created_at', { ascending: false })
      .limit(HISTORY_LIMIT),
  ])
  if (approvedRes.error) throw approvedRes.error
  if (playedRes.error) throw playedRes.error
  const rows = [...approvedRes.data, ...playedRes.data.filter(row => !approvedRes.data.some(a => a.id === row.id))]
  return rows.filter(row => !deleted.has(row.id)).map(toItem)
}

// Fetches now. Overlapping calls share one request. Errors go to the error listeners.
export function refresh() {
  if (loading) {
    again = true
    return loading
  }
  loading = fetchCheers()
    .then(next => {
      items = applyOrder(next)
      emit()
    })
    .catch(err => errorListeners.forEach(callback => callback(err)))
    .finally(() => {
      loading = null
      if (again) {
        again = false
        refresh()
      }
    })
  return loading
}

function schedule() {
  clearInterval(timer)
  timer = setInterval(refresh, live ? LIVE_POLL_MS : POLL_MS)
}

function startPolling() {
  if (timer) return
  refresh()
  schedule()
  window.addEventListener('focus', refresh)
  unwatch = watchTables(
    ['cheerspot_cheers'],
    () => refresh(),
    isLive => {
      if (isLive === live || !timer) return
      live = isLive
      schedule()
      // Back online: changes made while the channel was down were not pushed.
      if (isLive) refresh()
    },
  )
}

function stopPolling() {
  clearInterval(timer)
  timer = null
  live = false
  unwatch?.()
  unwatch = null
  window.removeEventListener('focus', refresh)
}

export function getQueue() {
  return snapshot()
}

// Calls back with the full queue on every change. Polling runs while anyone is subscribed.
// Returns an unsubscribe function.
export function subscribe(callback, onError) {
  listeners.add(callback)
  if (onError) errorListeners.add(onError)
  startPolling()
  return () => {
    listeners.delete(callback)
    if (onError) errorListeners.delete(onError)
    if (!listeners.size) stopPolling()
  }
}

// Marks the cheer played right away, then saves it. Rejects if the save fails.
export async function markPlayed(id) {
  if (!items.some(item => item.id === id)) return
  const now = Date.now()
  playedPending.add(id)
  playedAt.set(id, now)
  items = applyOrder(items.map(item => (item.id === id ? { ...item, status: 'played', playedAt: now } : item)))
  emit()
  // DJ accounts cannot update rows directly; this function only moves approved to played.
  const { error } = await supabase.rpc('cheerspot_mark_played', { p_id: id })
  if (error) {
    // Not saved: follow the server again, which still has it approved.
    playedPending.delete(id)
    throw error
  }
}

// Deletes a cheer and its voice note for good. It leaves the booth right away and comes back only
// if the delete fails (the promise then rejects).
export async function removeCheer(id) {
  deleted.add(id)
  items = items.filter(item => item.id !== id)
  emit()
  try {
    await deleteCheer(id)
  } catch (err) {
    deleted.delete(id)
    refresh()
    throw err
  }
}

// Replaces the order of approved items.
export function setOrder(ids) {
  const approvedIds = items.filter(item => item.status === 'approved').map(item => item.id)
  const nextIds = ids.filter(id => approvedIds.includes(id))
  if (nextIds.length !== approvedIds.length) return
  order = nextIds
  items = applyOrder(items)
  emit()
}

export function moveUp(id) {
  const ids = items.filter(item => item.status === 'approved').map(item => item.id)
  const index = ids.indexOf(id)
  if (index <= 0) return
  ;[ids[index - 1], ids[index]] = [ids[index], ids[index - 1]]
  setOrder(ids)
}

export function moveDown(id) {
  const ids = items.filter(item => item.status === 'approved').map(item => item.id)
  const index = ids.indexOf(id)
  if (index === -1 || index >= ids.length - 1) return
  ;[ids[index + 1], ids[index]] = [ids[index], ids[index + 1]]
  setOrder(ids)
}
