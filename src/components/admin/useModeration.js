import { useEffect, useRef, useState } from 'react'
import { pick, REASONS, STRINGS } from './strings.js'
import {
  DEFAULT_EVENT,
  DEFAULT_SETTINGS,
  POOL,
  createInitialItems,
  focusIdOf,
  cheerUrl,
  makeItem,
  visibleItems,
} from './data.js'
import { readSaved, saveValue } from './storage.js'
import { DEFAULT_WORD_LEVELS, LEVELS, needsReview, scanWords } from './badWords.js'
import { fetchRecentCheers, getAudioUrl, updateCheerStatus } from '../../lib/cheers.js'

// New cheers and status changes from the booth show up within a few seconds, without a refresh.
const POLL_MS = 3000
const NEW_MARK_MS = 9000

// Turns a cheerspot_cheers row into the shape the moderation UI uses.
const fromRow = row => ({
  id: row.id,
  ts: Date.parse(row.created_at),
  sender: row.sender_name,
  athlete: row.athlete_name,
  dur: row.duration_sec,
  text: row.transcript || '',
  audioPath: row.audio_path,
  status: row.status,
  transcribing: false,
  isNew: false,
  bib: '',
})

const PAGES = ['mod', 'queue', 'hist', 'qr', 'dj', 'set']

// Local moderation state for the superadmin dashboard. The TODO(supabase) marks where the
// cheer feed, moderation writes and DJ queue would come from the database.
export default function useModeration({ lang, liveFeed }) {
  const [items, setItems] = useState(createInitialItems)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  // Events the admin has entered. The active one drives the QR link. Kept per tab across refresh.
  const [events, setEvents] = useState(() => {
    const saved = readSaved('cz-admin-events', null)
    return Array.isArray(saved) && saved.length ? saved : [DEFAULT_EVENT]
  })
  const [eventName, setEventName] = useState(() => {
    const saved = readSaved('cz-admin-event', DEFAULT_EVENT)
    return events.includes(saved) ? saved : events[0]
  })
  const [eventIn, setEventIn] = useState('')
  useEffect(() => {
    saveValue('cz-admin-events', events)
    saveValue('cz-admin-event', eventName)
  }, [events, eventName])
  const [maxDur, setMaxDur] = useState(30)
  // Moderation words by level ({ high, medium, low }), kept in this browser across refresh.
  const [words, setWords] = useState(() => {
    const saved = readSaved('cz-admin-words', null)
    return saved && LEVELS.every(l => Array.isArray(saved[l])) ? saved : DEFAULT_WORD_LEVELS
  })
  useEffect(() => {
    saveValue('cz-admin-words', words)
  }, [words])
  const [wordIn, setWordIn] = useState('')
  const [wordLevel, setWordLevel] = useState('high')
  const [page, setPage] = useState(() => {
    const saved = readSaved('cz-admin-page', 'mod')
    return PAGES.includes(saved) ? saved : 'mod'
  })
  useEffect(() => {
    saveValue('cz-admin-page', page)
  }, [page])

  // Status writes still in flight. Until one settles, a poll keeps the local status, not the server's.
  const saving = useRef(new Map())
  const saveStatus = (id, status, reason = null) => {
    saving.current.set(id, (saving.current.get(id) || 0) + 1)
    return updateCheerStatus(id, status, reason).finally(() => {
      const left = saving.current.get(id) - 1
      if (left > 0) saving.current.set(id, left)
      else saving.current.delete(id)
    })
  }

  // Pull all cheers from Supabase every few seconds and when the tab comes back into view.
  // The server copy wins, except for cheers with a status write in flight. Cheers that were not
  // on screen before are marked new for a few seconds.
  const loadedOnce = useRef(false)
  useEffect(() => {
    let alive = true
    const load = async () => {
      const rows = await fetchRecentCheers()
      if (!alive || !rows) return
      const known = new Set(live.current.items.map(x => x.id))
      const arrived = loadedOnce.current ? rows.filter(row => !known.has(row.id)).map(row => row.id) : []
      loadedOnce.current = true
      setItems(prev => {
        const local = new Map(prev.map(x => [x.id, x]))
        return rows.map(row => {
          const item = fromRow(row)
          const kept = local.get(item.id)
          if (!kept) return arrived.includes(item.id) ? { ...item, isNew: true } : item
          const merged = { ...item, isNew: kept.isNew, playedAt: kept.playedAt, autoApproved: kept.autoApproved }
          return saving.current.has(item.id) ? { ...merged, status: kept.status, reason: kept.reason } : merged
        })
      })
      arrived.forEach(id => later(() => patch(id, { isNew: false }), NEW_MARK_MS))
      const { settings: st, words: w } = live.current
      if (st.autoApprove) {
        rows
          .filter(row => row.status === 'pending' && row.transcript && !saving.current.has(row.id))
          .filter(row => !needsReview(scanWords(row.transcript, w)))
          .forEach(row => autoApprove(row.id))
      }
    }
    load()
    const t = setInterval(load, POLL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      alive = false
      clearInterval(t)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
  const [tab, setTab] = useState('pending')
  const [q, setQ] = useState('')
  const [focus, setFocus] = useState(null)
  const [picking, setPicking] = useState(null)
  const [ddOpen, setDdOpen] = useState(false)
  const [playId, setPlayId] = useState(null)
  const [pos, setPos] = useState(0)
  const [toast, setToast] = useState(null)
  const [now, setNow] = useState(() => Date.now())
  const [copied, setCopied] = useState(false)

  // Latest committed state, read by timers and the key handler so they never use a stale closure.
  const live = useRef({})
  useEffect(() => {
    live.current = { items, settings, words, page, tab, q, focus, picking, playId, toast, lang }
  })

  const nextId = useRef(100)
  const poolIdx = useRef(0)
  const handles = useRef(new Set())

  const patch = (id, o) => setItems(prev => prev.map(x => (x.id === id ? { ...x, ...o } : x)))

  const later = (fn, ms) => {
    const h = setTimeout(() => {
      handles.current.delete(h)
      fn()
    }, ms)
    handles.current.add(h)
  }

  // Transcription finished: auto-send to the DJ queue when the setting allows it and the text is clean.
  const finishTx = id => {
    const { settings: st, words: w } = live.current
    setItems(prev =>
      prev.map(x => {
        if (x.id !== id) return x
        if (x.status === 'pending' && st.autoApprove && !needsReview(scanWords(x.text, w))) {
          return { ...x, transcribing: false, status: 'approved', autoApproved: true }
        }
        return { ...x, transcribing: false }
      }),
    )
  }

  // Auto-approve is saved like a manual Yes; a failed save puts the cheer back to pending.
  const autoApprove = id => {
    patch(id, { status: 'approved', autoApproved: true })
    saveStatus(id, 'approved').catch(() => patch(id, { status: 'pending', autoApproved: false }))
  }

  const applyAuto = () => {
    const w = live.current.words
    live.current.items
      .filter(x => x.status === 'pending' && !x.transcribing && x.text && !needsReview(scanWords(x.text, w)))
      .forEach(x => autoApprove(x.id))
  }

  // TODO(supabase): replace the mock feed with a realtime subscription to incoming cheers.
  const arrive = () => {
    if (!live.current.settings.open) return
    const p = POOL[poolIdx.current++ % POOL.length]
    const id = nextId.current++
    setItems(prev => [makeItem(id, 0, { ...p, transcribing: true, isNew: true }), ...prev])
    later(() => finishTx(id), 4000)
    later(() => patch(id, { isNew: false }), 9000)
  }

  useEffect(() => {
    const set = handles.current
    set.add(setInterval(() => setNow(Date.now()), 30000))
    if (liveFeed) set.add(setInterval(() => arrive(), 14000))
    return () => {
      set.forEach(h => {
        clearTimeout(h)
        clearInterval(h)
      })
      set.clear()
    }
  }, [liveFeed])

  const stopPlay = () => {
    setPlayId(null)
    setPos(0)
  }

  const play = id => {
    if (live.current.playId === id) {
      stopPlay()
      return
    }
    setPlayId(id)
    setPos(0)
    setFocus(id)
  }

  useEffect(() => {
    if (playId == null) return undefined
    const t = setInterval(() => setPos(p => Math.round((p + 0.1) * 10) / 10), 100)
    return () => clearInterval(t)
  }, [playId])

  // Plays the real voice note through a short-lived link. The timer above keeps the progress bar moving.
  const audioRef = useRef(null)
  useEffect(() => {
    if (playId == null) return undefined
    const it = items.find(x => x.id === playId)
    if (!it || !it.audioPath) return undefined
    let cancelled = false
    getAudioUrl(it.audioPath)
      .then(url => {
        if (cancelled) return
        const audio = new Audio(url)
        audioRef.current = audio
        audio.play().catch(() => {})
      })
      .catch(() => {})
    return () => {
      cancelled = true
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
    // Only a new play target should restart audio; list updates must not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playId])

  useEffect(() => {
    if (playId == null) return
    const it = items.find(x => x.id === playId)
    if (!it || pos >= it.dur) stopPlay()
  }, [pos, playId, items])

  useEffect(() => {
    if (!toast) return undefined
    const t = setTimeout(() => setToast(null), 4500)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (!copied) return undefined
    const t = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(t)
  }, [copied])

  const decide = (id, status, reason) => {
    const L = live.current
    const it = L.items.find(x => x.id === id)
    if (!it || it.status !== 'pending') return
    if (status === 'approved' && it.transcribing && L.settings.needTx) return
    const vis = visibleItems(L.items, L.tab, L.q)
    const i = vis.findIndex(x => x.id === id)
    const nxt = vis[i + 1] || vis[i - 1]
    if (L.playId === id) stopPlay()
    patch(id, { status, reason: reason || null })
    saveStatus(id, status, reason || null).catch(() => {
      patch(id, { status: 'pending', reason: null })
      setToast({ id, prev: 'pending', msg: pick(['Gagal menyimpan. Coba lagi.', 'Could not save. Try again.'], L.lang), color: '#BF0000' })
    })
    setPicking(null)
    const S = STRINGS[L.lang] || STRINGS.id
    let msg
    if (status === 'approved') {
      msg = S.toastApproved(it.athlete)
    } else {
      const r = REASONS.find(z => z.key === reason)
      msg = S.toastRejected(it.sender, r ? pick(r.label, L.lang) : S.noReason)
    }
    setFocus(nxt ? nxt.id : null)
    setToast({ id, prev: 'pending', msg, color: status === 'approved' ? '#22C55E' : '#BF0000' })
  }

  const undo = () => {
    const t = live.current.toast
    if (!t) return
    patch(t.id, { status: t.prev, reason: null })
    saveStatus(t.id, t.prev).catch(() => {})
    setToast(null)
    setFocus(t.id)
  }

  const toggleSetting = k => {
    const v = !live.current.settings[k]
    setSettings(s => ({ ...s, [k]: v }))
    if (k === 'autoApprove' && v) applyAuto()
  }

  // A word lives in one level only: adding it to another level moves it there.
  const addWord = () => {
    const w = wordIn.trim().toLowerCase().replace(/\s+/g, ' ')
    if (!w) return
    setWords(all => {
      const next = {}
      for (const l of LEVELS) next[l] = all[l].filter(x => x !== w)
      next[wordLevel] = [...next[wordLevel], w]
      return next
    })
    setWordIn('')
  }

  const removeWord = (level, w) => setWords(all => ({ ...all, [level]: all[level].filter(x => x !== w) }))

  const resetWords = () => setWords(DEFAULT_WORD_LEVELS)

  // Adds the typed event to the list and makes it the active one, which updates the QR.
  const addEvent = () => {
    const name = eventIn.trim()
    if (!name) return
    setEvents(list => (list.includes(name) ? list : [...list, name]))
    setEventName(name)
    setEventIn('')
  }

  const copyLink = () => {
    try {
      navigator.clipboard?.writeText(cheerUrl(eventName))?.catch(() => {})
    } catch {
      // Clipboard can be blocked; the label still confirms the click.
    }
    setCopied(true)
  }

  const pullBack = id => patch(id, { status: 'pending' })
  const requeue = id => patch(id, { status: 'approved', ts: Date.now() })
  const restore = id => patch(id, { status: 'pending', reason: null })

  // Keyboard shortcuts, active on the moderation page only.
  useEffect(() => {
    const onKey = e => {
      const L = live.current
      if (L.page !== 'mod') return
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = (e.key || '').toLowerCase()
      const vis = visibleItems(L.items, L.tab, L.q)
      const fid = focusIdOf(vis, L.focus)
      const i = vis.findIndex(x => x.id === fid)
      if (k === 'j' || k === 'arrowdown') {
        e.preventDefault()
        const n = vis[Math.min(vis.length - 1, i + 1)]
        if (n) setFocus(n.id)
      } else if (k === 'k' || k === 'arrowup') {
        e.preventDefault()
        const n = vis[Math.max(0, i - 1)]
        if (n) setFocus(n.id)
      } else if (k === 'a' && fid != null) {
        decide(fid, 'approved')
      } else if (k === 'r' && fid != null) {
        const it = L.items.find(x => x.id === fid)
        if (it && it.status === 'pending') setPicking(fid)
      } else if (L.picking != null && /^[1-4]$/.test(k)) {
        decide(L.picking, 'rejected', REASONS[Number(k) - 1].key)
      } else if (k === 'escape') {
        setPicking(null)
        setDdOpen(false)
      } else if (k === ' ' && fid != null) {
        e.preventDefault()
        play(fid)
      } else if (k === 'z') {
        undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return {
    items,
    settings,
    events,
    eventName,
    setEventName,
    eventIn,
    setEventIn,
    addEvent,
    maxDur,
    setMaxDur,
    words,
    wordIn,
    setWordIn,
    wordLevel,
    setWordLevel,
    addWord,
    removeWord,
    resetWords,
    page,
    setPage,
    tab,
    setTab,
    q,
    setQ,
    focus,
    setFocus,
    picking,
    setPicking,
    ddOpen,
    setDdOpen,
    playId,
    pos,
    play,
    toast,
    undo,
    decide,
    now,
    copied,
    copyLink,
    toggleSetting,
    pullBack,
    requeue,
    restore,
  }
}
