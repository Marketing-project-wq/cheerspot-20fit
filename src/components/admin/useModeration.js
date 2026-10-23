import { useEffect, useRef, useState } from 'react'
import { pick, REASONS, STRINGS } from './strings.js'
import {
  DEFAULT_EVENT,
  DEFAULT_SETTINGS,
  DEFAULT_WORDS,
  POOL,
  createInitialItems,
  focusIdOf,
  cheerUrl,
  makeItem,
  scanText,
  visibleItems,
} from './data.js'
import { readSaved, saveValue } from './storage.js'

const PAGES = ['mod', 'queue', 'hist', 'qr', 'set']

// Local moderation state for the superadmin dashboard. The TODO(supabase) marks where the
// cheer feed, moderation writes and DJ queue would come from the database.
export default function useModeration({ lang, liveFeed }) {
  const [items, setItems] = useState(createInitialItems)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [eventName, setEventName] = useState(DEFAULT_EVENT)
  const [maxDur, setMaxDur] = useState(30)
  const [words, setWords] = useState(DEFAULT_WORDS)
  const [wordIn, setWordIn] = useState('')
  const [page, setPage] = useState(() => {
    const saved = readSaved('cz-admin-page', 'mod')
    return PAGES.includes(saved) ? saved : 'mod'
  })
  useEffect(() => {
    saveValue('cz-admin-page', page)
  }, [page])
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
        if (x.status === 'pending' && st.autoApprove && scanText(x.text, w).hits.length === 0) {
          return { ...x, transcribing: false, status: 'approved', autoApproved: true }
        }
        return { ...x, transcribing: false }
      }),
    )
  }

  const applyAuto = () => {
    const w = live.current.words
    setItems(prev =>
      prev.map(x =>
        x.status === 'pending' && !x.transcribing && scanText(x.text, w).hits.length === 0
          ? { ...x, status: 'approved', autoApproved: true }
          : x,
      ),
    )
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
    setToast(null)
    setFocus(t.id)
  }

  const toggleSetting = k => {
    const v = !live.current.settings[k]
    setSettings(s => ({ ...s, [k]: v }))
    if (k === 'autoApprove' && v) applyAuto()
  }

  const addWord = () => {
    const w = wordIn.trim().toLowerCase()
    if (!w || live.current.words.includes(w)) return
    setWords(list => [...list, w])
    setWordIn('')
  }

  const removeWord = w => setWords(list => list.filter(x => x !== w))

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
    eventName,
    setEventName,
    maxDur,
    setMaxDur,
    words,
    wordIn,
    setWordIn,
    addWord,
    removeWord,
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
