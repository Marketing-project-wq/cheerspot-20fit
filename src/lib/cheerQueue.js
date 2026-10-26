// The only data layer for the booth queue. Components import this file and nothing else.
// Reads approved and played cheers from Supabase. The table is not in the realtime publication,
// so the queue polls while the booth is open. The operator's order lives in memory only.
import { getAudioUrl } from './cheers.js'
import { supabase } from './supabase.js'

const POLL_MS = 5000
const HISTORY_LIMIT = 20
const COLUMNS = 'id, created_at, sender_name, athlete_name, duration_sec, audio_path, status, transcript'

let items = []
let order = []
// Cheers marked played here. A poll that lands before the update saves must not bring them back.
const playedLocally = new Map()
const listeners = new Set()
const errorListeners = new Set()
let timer = null
let loading = null

function toItem(row) {
  const playedAt = playedLocally.get(row.id)
  return {
    ...row,
    status: playedAt ? 'played' : row.status,
    playedAt: playedAt || (row.status === 'played' ? Date.parse(row.created_at) : null),
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
  const played = next.filter(item => item.status === 'played')
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
  return rows.map(toItem)
}

// Fetches now. Overlapping calls share one request. Errors go to the error listeners.
export function refresh() {
  if (!loading) {
    loading = fetchCheers()
      .then(next => {
        items = applyOrder(next)
        emit()
      })
      .catch(err => errorListeners.forEach(callback => callback(err)))
      .finally(() => {
        loading = null
      })
  }
  return loading
}

function startPolling() {
  if (timer) return
  refresh()
  timer = setInterval(refresh, POLL_MS)
  window.addEventListener('focus', refresh)
}

function stopPolling() {
  clearInterval(timer)
  timer = null
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
  const playedAt = Date.now()
  playedLocally.set(id, playedAt)
  items = applyOrder(items.map(item => (item.id === id ? { ...item, status: 'played', playedAt } : item)))
  emit()
  // DJ accounts cannot update rows directly; this function only moves approved to played.
  const { error } = await supabase.rpc('cheerspot_mark_played', { p_id: id })
  if (error) throw error
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
