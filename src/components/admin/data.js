// Mock data and pure helpers from the superadmin design. Nothing here talks to a backend.
import { pick, REASONS, STRINGS } from './strings.js'

export const HOUR = 3600000
export const MAX_DURS = [15, 30, 45]
export const DEFAULT_SETTINGS = { autoFlag: true, needTx: true, open: true, autoApprove: false }
export const DEFAULT_WORDS = ['bego', 'anjir', 'goblok', 'bangsat']
export const DEFAULT_EVENT = 'HYROX Sportfest Vol.3'

export const pad = n => String(n).padStart(2, '0')

export const hm = ts => {
  const d = new Date(ts)
  return pad(d.getHours()) + ':' + pad(d.getMinutes())
}

export const fmt = s => {
  const v = Math.max(0, Math.floor(s || 0))
  return Math.floor(v / 60) + ':' + pad(v % 60)
}

// Fake waveform bars, one per 56 slots.
export const waveBars = id =>
  Array.from({ length: 56 }, (_, i) =>
    Math.round(4 + 15 * Math.abs(Math.sin(i * 1.31 + id * 2.7) * Math.cos(i * 0.53 + id))),
  )

export const makeItem = (id, minsAgo, extra) => ({
  id,
  ts: Date.now() - minsAgo * 60000,
  status: 'pending',
  transcribing: false,
  isNew: false,
  bib: '',
  ...extra,
})

// Cheers that arrive on the live feed, in order.
export const POOL = [
  { sender: 'Nadia', athlete: 'Fajar Ramadhan', bib: '173', dur: 12, text: 'Fajar! Burpee broad jump-nya tinggal dikit lagi, jangan berhenti! Kamu keren banget hari ini!' },
  { sender: 'Geng Lari Pagi', athlete: 'Maya Sari', bib: '064', dur: 16, text: 'Mayaaa! Kita dari geng lari pagi teriak paling kencang buat kamu! Farmers carry-nya hajar!' },
  { sender: 'Ayah', athlete: 'Kirana Putri', bib: '118', dur: 9, text: 'Kirana, ayah lihat dari tribun. Atur napas, langkah stabil, kamu pasti sampai finish.' },
  { sender: 'Bayu', athlete: 'Teddy Gunawan', bib: '', dur: 11, text: 'Teddy! Lunges terakhir nih, kaki boleh gemeter tapi semangat jangan! Gas!' },
]

// Starts empty: real cheers come from Supabase once it is connected.
export function createInitialItems() {
  return []
}

// Word matching: lowercase, leetspeak to letters, collapse repeated letters (anjirrrr -> anjir).
const norm = s =>
  s
    .toLowerCase()
    .replace(/[4@]/g, 'a')
    .replace(/[1!|]/g, 'i')
    .replace(/3/g, 'e')
    .replace(/0/g, 'o')
    .replace(/5|\$/g, 's')
    .replace(/7/g, 't')
    .replace(/[^a-z]/g, '')
    .replace(/(.)\1+/g, '$1')

const hitWord = (tok, words) => {
  const n = norm(tok)
  if (!n) return null
  return (
    words.find(w => {
      const wn = norm(w)
      return wn && (n === wn || (wn.length >= 4 && n.startsWith(wn)))
    }) || null
  )
}

// Returns the flagged words found in a transcript and the text split into highlight tokens.
export function scanText(text, words) {
  const src = String(text || '')
  const parts = src.split(/(\s+|[.,!?;:"“”()]+)/).filter(p => p !== '')
  const hits = new Set()
  const tokens = parts.map(p => {
    const w = /[\w@$!|]/.test(p) && !/^[.,!?;:"“”()\s]+$/.test(p) ? hitWord(p, words) : null
    if (w) hits.add(w)
    return { t: p, f: !!w }
  })
  // Multi-word phrases from the list.
  const low = ' ' + src.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ') + ' '
  words
    .filter(w => /\s/.test(w))
    .forEach(w => {
      if (low.includes(' ' + w.toLowerCase().trim().replace(/\s+/g, ' ') + ' ')) hits.add(w)
    })
  return { hits: [...hits], tokens }
}

export const visibleItems = (items, tab, q) => {
  const qq = (q || '').trim().toLowerCase()
  return items
    .filter(
      x =>
        (tab === 'all' || x.status === tab) &&
        (!qq ||
          (x.athlete || '').toLowerCase().includes(qq) ||
          (x.bib || '').includes(qq) ||
          (x.sender || '').toLowerCase().includes(qq)),
    )
    .sort((a, b) => b.ts - a.ts)
}

export const focusIdOf = (vis, focus) => (vis.some(x => x.id === focus) ? focus : vis[0] ? vis[0].id : null)

// Label, background and text colour for a card's status pill.
export function statusInfo(x, now, lang) {
  const S = STRINGS[lang] || STRINGS.id
  const base = {
    approved: [S.stApproved, '#DCFCE7', '#0F6B33'],
    rejected: [S.stRejected, '#FFE3E3', '#9E0000'],
    played: [S.stPlayed, '#ECECE6', '#3A3A36'],
  }[x.status]
  if (!base) return { label: '', bg: '', fg: '' }
  const [text, bg, fg] = base
  let label = text
  if (x.status === 'rejected') {
    const r = REASONS.find(z => z.key === x.reason) || REASONS.find(z => z.key === 'spam')
    label = text + ' · ' + pick(r.label, lang)
  } else if (x.status === 'played') {
    label = text + ' · ' + (x.playedAt || '')
  } else if (x.status === 'approved' && now - x.ts >= HOUR) {
    label = S.stExpired
  } else if (x.status === 'approved' && x.autoApproved) {
    label = S.stAuto
  }
  return { label, bg, fg }
}

// 25x25 placeholder QR matrix (true = dark module), as in the design.
// URL-safe form of the event name, e.g. "HYROX Sportfest Vol.3" -> "hyrox-sportfest-vol-3".
export const eventSlug = name =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'event'

// The page spectators open from the QR, tagged with the active event. Uses the current domain,
// so it works on Railway and on cheerspot.20fit.id.
export const cheerUrl = eventName => `${window.location.origin}/cheer?event=${eventSlug(eventName)}`
