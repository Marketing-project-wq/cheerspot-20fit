// The only data layer for the booth queue. Components import this file and nothing else.
// The items below are mock data. Replace the in-memory store with Supabase realtime later:
// keep the same exports so the booth does not need to change.

const MOCK_ITEMS = [
  {
    id: 'c1',
    sender_name: 'Rina',
    athlete_name: 'Dimas Pratama',
    athlete_bib: '117',
    transcript: 'Ayo Dimas, tinggal satu putaran lagi. Kamu pasti bisa!',
    audio_url: '/samples/cheer-1.wav',
    status: 'approved',
  },
  {
    id: 'c2',
    sender_name: 'Bayu',
    athlete_name: 'Sari Lestari',
    athlete_bib: '042',
    transcript: 'Sari, napasnya atur pelan-pelan. Kami semua di sini!',
    audio_url: '/samples/cheer-2.wav',
    status: 'approved',
  },
  {
    id: 'c3',
    sender_name: 'Mega',
    athlete_name: 'Arif Hidayat',
    athlete_bib: '205',
    transcript: 'Arif, sedikit lagi finish. Angkat kepalamu dan terus maju!',
    audio_url: '/samples/cheer-3.wav',
    status: 'approved',
  },
  {
    id: 'c4',
    sender_name: 'Tomi',
    athlete_name: 'Nadia Putri',
    athlete_bib: '031',
    transcript: 'Nadia, kamu hebat banget hari ini. Terus semangat!',
    audio_url: '/samples/cheer-4.wav',
    status: 'approved',
  },
]

// Approved items keep the operator's order. Played items are kept with playedAt for the history list.
let items = MOCK_ITEMS.map(item => ({ ...item }))
const listeners = new Set()

function snapshot() {
  return items.map(item => ({ ...item }))
}

function emit() {
  const next = snapshot()
  listeners.forEach(callback => callback(next))
}

export function getQueue() {
  return snapshot()
}

// Calls back with the full queue on every change. Returns an unsubscribe function.
export function subscribe(callback) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

export function markPlayed(id) {
  const target = items.find(item => item.id === id)
  if (!target) return
  // Played items move to the top of the history list. Approved order is untouched.
  items = items.map(item => (item.id === id ? { ...item, status: 'played', playedAt: Date.now() } : item))
  emit()
}

// Replaces the order of approved items. Played items keep their slots.
export function setOrder(ids) {
  const byId = new Map(items.map(item => [item.id, item]))
  const approvedIds = items.filter(item => item.status === 'approved').map(item => item.id)
  const nextIds = ids.filter(id => approvedIds.includes(id))
  if (nextIds.length !== approvedIds.length) return
  let k = 0
  items = items.map(item => (item.status === 'approved' ? byId.get(nextIds[k++]) : item))
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
