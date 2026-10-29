import { useEffect, useMemo, useRef, useState } from 'react'
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
import { keepValue, readKept, readSaved, saveValue } from './storage.js'
import { DEFAULT_WORD_LEVELS, LEVELS, applyWordChanges, isWordChanges, needsReview, scanWords } from './badWords.js'
import { fetchRecentCheers, getAudioUrl, updateCheerStatus } from '../../lib/cheers.js'
import { deleteCheer } from '../../lib/staff.js'
import { AUTO_GAP_KEY, BAD_WORDS_KEY, DEFAULT_AUTO_GAP, EVENTS_KEY, readSetting, saveSetting } from '../../lib/settings.js'
import { watchTables } from '../../lib/realtime.js'

// New cheers, transcripts and status changes from the booth are pushed by Realtime and show up
// right away. The poll is a safety net: slow while Realtime is connected, fast while it is down.
const LIVE_POLL_MS = 15000
const POLL_MS = 3000
// While a cheer waits for its transcript and Realtime is down, poll faster so the text shows soon.
const FAST_POLL_MS = 1000
const NEW_MARK_MS = 9000
// Transcription runs right after a cheer is sent. Without a transcript after this long it most
// likely failed; the cheer can then be judged by listening.
const TRANSCRIBE_WAIT_MS = 2 * 60 * 1000

// Turns a cheerspot_cheers row into the shape the moderation UI uses.
const fromRow = row => {
  const ts = Date.parse(row.created_at)
  return {
    id: row.id,
    ts,
    sender: row.sender_name,
    athlete: row.athlete_name,
    dur: row.duration_sec,
    text: row.transcript || '',
    audioPath: row.audio_path,
    status: row.status,
    reason: row.reason ?? null,
    transcribing: !row.transcript && row.status === 'pending' && Date.now() - ts < TRANSCRIBE_WAIT_MS,
    isNew: false,
    bib: '',
  }
}

const PAGES = ['mod', 'queue', 'hist', 'qr', 'dj', 'set']
// Set once this browser's own events have been merged into the shared list.
const EVENTS_SYNCED_KEY = 'cz-admin-events-synced'
const isEventsValue = value =>
  !!value &&
  Array.isArray(value.list) &&
  value.list.every(e => typeof e === 'string') &&
  typeof value.active === 'string'

// Local moderation state for the superadmin dashboard. The TODO(supabase) marks where the
// cheer feed, moderation writes and DJ queue would come from the database.
export default function useModeration({ lang, liveFeed }) {
  const [items, setItems] = useState(createInitialItems)
  // These switches are kept in this browser (localStorage).
  const [settings, setSettings] = useState(() => ({ ...DEFAULT_SETTINGS, ...readKept('cz-admin-settings', {}) }))
  useEffect(() => {
    keepValue('cz-admin-settings', settings)
  }, [settings])
  // Events the admin has entered. At most one is active: it drives the QR link. '' means none.
  // Saved in cheerspot_settings for every admin device; this browser keeps a copy (localStorage)
  // so the list shows before the first read.
  const [events, setEvents] = useState(() => {
    const saved = readKept('cz-admin-events', null) ?? readSaved('cz-admin-events', null)
    return Array.isArray(saved) && saved.length ? saved : [DEFAULT_EVENT]
  })
  const [eventName, setEventName] = useState(() => {
    const saved = readKept('cz-admin-event', null) ?? readSaved('cz-admin-event', DEFAULT_EVENT)
    if (saved === '') return ''
    return events.includes(saved) ? saved : events[0]
  })
  const [eventIn, setEventIn] = useState('')
  useEffect(() => {
    keepValue('cz-admin-events', events)
    keepValue('cz-admin-event', eventName)
  }, [events, eventName])
  // Moderation words by level ({ high, medium, low }): the default list plus the superadmin's changes.
  // The changes live in cheerspot_settings, shared by every admin device; this browser keeps a copy
  // (localStorage) so the list shows before the first read.
  const [wordChanges, setWordChanges] = useState(() => {
    const kept = readKept('cz-admin-word-changes', null)
    if (kept && typeof kept === 'object') return kept
    // Earlier versions kept the whole list per tab. Carry over words added there.
    const old = readSaved('cz-admin-words', null)
    const changes = {}
    if (old && LEVELS.every(l => Array.isArray(old[l]))) {
      const base = applyWordChanges(DEFAULT_WORD_LEVELS, {})
      for (const l of LEVELS) for (const w of old[l]) if (!base[l].includes(w)) changes[w] = l
    }
    return changes
  })
  useEffect(() => {
    keepValue('cz-admin-word-changes', wordChanges)
  }, [wordChanges])
  const words = useMemo(() => applyWordChanges(DEFAULT_WORD_LEVELS, wordChanges), [wordChanges])
  const [wordIn, setWordIn] = useState('')
  const [wordLevel, setWordLevel] = useState('high')
  const [page, setPage] = useState(() => {
    const saved = readSaved('cz-admin-page', 'mod')
    return PAGES.includes(saved) ? saved : 'mod'
  })
  useEffect(() => {
    saveValue('cz-admin-page', page)
  }, [page])

  // Cheers deleted here (or being deleted). Polls leave them out.
  const deleting = useRef(new Set())
  // Status writes still in flight. Until one settles, a poll keeps the local status, not the server's.
  const saving = useRef(new Map())
  // When each cheer's status was last changed here. A poll sent before that time carries an older
  // copy, so it must not overwrite the change, even if the save has finished by the time it lands.
  const changedAt = useRef(new Map())
  const saveStatus = (id, status, reason = null) => {
    saving.current.set(id, (saving.current.get(id) || 0) + 1)
    changedAt.current.set(id, Date.now())
    return updateCheerStatus(id, status, reason).finally(() => {
      const left = saving.current.get(id) - 1
      if (left > 0) saving.current.set(id, left)
      else saving.current.delete(id)
      changedAt.current.set(id, Date.now())
    })
  }
  // Auto-send judges each cheer once, when its transcript first arrives. A cheer the admin moves
  // back to pending is not sent again.
  const autoChecked = useRef(new Set())

  // Pull all cheers from Supabase every few seconds and when the tab comes back into view.
  // The server copy wins, except for cheers with a status write in flight. Cheers that were not
  // on screen before are marked new for a few seconds.
  const loadedOnce = useRef(false)
  useEffect(() => {
    let alive = true
    // Reads can overlap (Realtime, poll, tab focus). Only a read newer than the last applied one counts.
    let sent = 0
    let applied = 0
    let isLive = false
    const load = async () => {
      const sentAt = Date.now()
      const n = ++sent
      const rows = await fetchRecentCheers()
      if (!alive || !rows || n < applied) return
      applied = n
      const stale = id => saving.current.has(id) || (changedAt.current.get(id) || 0) >= sentAt
      const known = new Set(live.current.items.map(x => x.id))
      const arrived = loadedOnce.current ? rows.filter(row => !known.has(row.id)).map(row => row.id) : []
      loadedOnce.current = true
      setItems(prev => {
        const local = new Map(prev.map(x => [x.id, x]))
        return rows.filter(row => !deleting.current.has(row.id)).map(row => {
          const item = fromRow(row)
          const kept = local.get(item.id)
          if (!kept) return arrived.includes(item.id) ? { ...item, isNew: true } : item
          const merged = { ...item, isNew: kept.isNew, playedAt: kept.playedAt, autoApproved: kept.autoApproved }
          return stale(item.id) ? { ...merged, status: kept.status, reason: kept.reason } : merged
        })
      })
      arrived.forEach(id => later(() => patch(id, { isNew: false }), NEW_MARK_MS))
      const { settings: st, words: w } = live.current
      const fresh = rows.filter(
        row => row.status === 'pending' && row.transcript && !stale(row.id) && !autoChecked.current.has(row.id),
      )
      fresh.forEach(row => autoChecked.current.add(row.id))
      if (st.autoApprove) fresh.filter(row => !needsReview(scanWords(row.transcript, w))).forEach(row => autoApprove(row.id))
    }
    let t = null
    // tick restarts the loop. Only the latest call schedules the next one, so restarts never stack.
    let loop = 0
    const tick = async () => {
      clearTimeout(t)
      const mine = ++loop
      await load().catch(() => {})
      if (!alive || mine !== loop) return
      const waiting = live.current.items?.some(x => x.transcribing)
      t = setTimeout(tick, isLive ? LIVE_POLL_MS : waiting ? FAST_POLL_MS : POLL_MS)
    }
    tick()
    const onVisible = () => {
      if (document.visibilityState === 'visible') load().catch(() => {})
    }
    document.addEventListener('visibilitychange', onVisible)
    const unwatch = watchTables(
      ['cheerspot_cheers', 'cheerspot_settings'],
      table => {
        if (table === 'cheerspot_settings') loadShared()
        else load().catch(() => {})
      },
      next => {
        if (next === isLive) return
        isLive = next
        // Back online: changes made while the channel was down were not pushed.
        if (next) loadShared()
        tick()
      },
    )
    return () => {
      alive = false
      clearTimeout(t)
      document.removeEventListener('visibilitychange', onVisible)
      unwatch()
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
    live.current = { items, settings, words, wordChanges, events, eventName, page, tab, q, focus, picking, playId, toast, lang }
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
      .forEach(x => {
        autoChecked.current.add(x.id)
        autoApprove(x.id)
      })
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
      setToast({ id, prev: null, msg: pick(['Gagal menyimpan. Coba lagi.', 'Could not save. Try again.'], L.lang), color: '#BF0000' })
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
    // Error toasts have nothing to undo.
    if (!t.prev) {
      setToast(null)
      return
    }
    patch(t.id, { status: t.prev, reason: null })
    saveStatus(t.id, t.prev).catch(() => {})
    setToast(null)
    setFocus(t.id)
  }

  // Gap between AUTO cheers in the booth, stored in the database so the booth on another device follows.
  const [autoGap, setAutoGapState] = useState(DEFAULT_AUTO_GAP)
  // Word list saves in flight, and when the list was last changed here. Like status writes: a read
  // sent before a change must not undo it.
  const wordSaving = useRef(0)
  const wordChangedAt = useRef(0)
  const wordsSynced = useRef(false)
  const eventSaving = useRef(0)
  const eventChangedAt = useRef(0)
  // Reads the shared settings (gap and word list). Runs on open and whenever Realtime reports a change.
  const loadShared = () => {
    readSetting(AUTO_GAP_KEY, DEFAULT_AUTO_GAP)
      .then(v => setAutoGapState(Number(v) || DEFAULT_AUTO_GAP))
      .catch(() => {})
    const sentAt = Date.now()
    readSetting(BAD_WORDS_KEY, null)
      .then(saved => {
        if (wordSaving.current || wordChangedAt.current >= sentAt) return
        const first = !wordsSynced.current
        wordsSynced.current = true
        if (isWordChanges(saved)) {
          setWordChanges(saved)
          return
        }
        // No shared list yet: the first admin to open this version carries over this browser's changes.
        const local = live.current.wordChanges
        if (first && local && Object.keys(local).length) commitWords(local, null)
      })
      .catch(() => {})
    readSetting(EVENTS_KEY, null)
      .then(saved => {
        if (eventSaving.current || eventChangedAt.current >= sentAt) return
        // Events this browser kept before they were shared (read once, then never again here), so
        // an event added on this device before the move is not lost.
        let local = []
        if (!readKept(EVENTS_SYNCED_KEY, false)) {
          const kept = readKept('cz-admin-events', null)
          local = Array.isArray(kept) ? kept.filter(e => typeof e === 'string' && e.trim()) : []
        }
        const shared = isEventsValue(saved) ? saved : null
        const list = [...(shared ? shared.list : []), ...local.filter(e => !shared?.list.includes(e))]
        const active = shared ? shared.active : readKept('cz-admin-event', '') || ''
        const next = { list, active: list.includes(active) ? active : '' }
        const merged = !shared || list.length !== shared.list.length
        if (!merged) {
          setEvents(next.list)
          setEventName(next.active)
          keepValue(EVENTS_SYNCED_KEY, true)
        } else if (list.length) {
          // Marked done only once saved, so a failed save is retried on the next read.
          commitEvents(next, null).then(ok => ok && keepValue(EVENTS_SYNCED_KEY, true))
        }
      })
      .catch(() => {})
  }
  useEffect(() => {
    loadShared()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const setAutoGap = sec => {
    const before = autoGap
    setAutoGapState(sec)
    saveSetting(AUTO_GAP_KEY, sec).catch(() => {
      setAutoGapState(before)
      setToast({ id: null, prev: null, msg: pick(['Gagal menyimpan jeda. Coba lagi.', 'Could not save the gap. Try again.'], live.current.lang), color: '#BF0000' })
    })
  }

  // Saves the word list for every admin device. A failed save puts the earlier list back and says so.
  const commitWords = (next, before = live.current.wordChanges) => {
    setWordChanges(next)
    wordSaving.current += 1
    wordChangedAt.current = Date.now()
    saveSetting(BAD_WORDS_KEY, next)
      .catch(() => {
        if (before) setWordChanges(before)
        setToast({ id: null, prev: null, msg: pick(['Gagal menyimpan daftar kata. Coba lagi.', 'Could not save the word list. Try again.'], live.current.lang), color: '#BF0000' })
      })
      .finally(() => {
        wordSaving.current -= 1
        wordChangedAt.current = Date.now()
      })
  }

  // Saves the events for every admin device. A failed save puts the earlier events back and says so.
  const commitEvents = (next, before = { list: live.current.events, active: live.current.eventName }) => {
    setEvents(next.list)
    setEventName(next.active)
    eventSaving.current += 1
    eventChangedAt.current = Date.now()
    return saveSetting(EVENTS_KEY, next)
      .then(() => true)
      .catch(() => {
        if (before) {
          setEvents(before.list)
          setEventName(before.active)
        }
        setToast({ id: null, prev: null, msg: pick(['Gagal menyimpan event. Coba lagi.', 'Could not save the event. Try again.'], live.current.lang), color: '#BF0000' })
        return false
      })
      .finally(() => {
        eventSaving.current -= 1
        eventChangedAt.current = Date.now()
      })
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
    commitWords({ ...live.current.wordChanges, [w]: wordLevel })
    setWordIn('')
  }

  const removeWord = (_level, w) => commitWords({ ...live.current.wordChanges, [w]: 'off' })

  const resetWords = () => commitWords({})

  // Adds the typed event to the list and makes it the active one, which updates the QR.
  // A new event becomes active only when no event is active yet.
  const addEvent = () => {
    const name = eventIn.trim()
    if (!name) return
    const { events: list, eventName: active } = live.current
    commitEvents({ list: list.includes(name) ? list : [...list, name], active: active || name })
    setEventIn('')
  }

  // Turning an event on makes it the only active one; turning the active one off leaves none.
  const toggleEvent = name => {
    const { events: list, eventName: active } = live.current
    commitEvents({ list, active: active === name ? '' : name })
  }

  const removeEvent = name => {
    const { events: list, eventName: active } = live.current
    commitEvents({ list: list.filter(x => x !== name), active: active === name ? '' : active })
  }

  const copyLink = () => {
    try {
      navigator.clipboard?.writeText(cheerUrl(eventName))?.catch(() => {})
    } catch {
      // Clipboard can be blocked; the label still confirms the click.
    }
    setCopied(true)
  }

  // Status moves from the queue, history and cards are saved like Yes and No. A failed save puts
  // the old status back and says so.
  const move = (id, status, extra = {}) => {
    const it = live.current.items.find(x => x.id === id)
    if (!it) return
    const before = { status: it.status, reason: it.reason ?? null }
    patch(id, { status, reason: null, ...extra })
    saveStatus(id, status).catch(() => {
      patch(id, before)
      setToast({ id, prev: null, msg: pick(['Gagal menyimpan. Coba lagi.', 'Could not save. Try again.'], live.current.lang), color: '#BF0000' })
    })
  }
  const pullBack = id => move(id, 'pending')
  const requeue = id => move(id, 'approved')
  const restore = id => move(id, 'pending')

  // Deletes a cheer and its voice note for good. It leaves the screen right away and comes back
  // with the next poll only if the delete fails.
  const removeCheer = id => {
    const L = live.current
    if (L.playId === id) stopPlay()
    deleting.current.add(id)
    setItems(prev => prev.filter(x => x.id !== id))
    if (L.focus === id) setFocus(null)
    // On success the id stays in deleting: a poll sent before the delete must not bring it back.
    deleteCheer(id).catch(() => {
      deleting.current.delete(id)
      setToast({ id, prev: null, msg: pick(['Gagal menghapus. Coba lagi.', 'Could not delete. Try again.'], L.lang), color: '#BF0000' })
    })
  }

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
    toggleEvent,
    removeEvent,
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
    autoGap,
    setAutoGap,
    pullBack,
    removeCheer,
    requeue,
    restore,
  }
}
