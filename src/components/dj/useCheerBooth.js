import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getQueue,
  markPlayed,
  moveDown,
  moveUp,
  removeCheer,
  setOrder,
  subscribe as subscribeQueue,
} from '../../lib/cheerQueue.js'
import {
  getBoothStatus,
  pauseCheer,
  playCheer,
  preloadCheer,
  restartCheer,
  resumeCheer,
  setCheerVolume as applyCheerVolume,
  setMusicVolume as applyMusicVolume,
  skipCheer,
  startAudio,
  stopAudio,
  subscribeBooth,
} from '../../lib/ducking.js'
import { loadYouTubeApi } from '../../lib/youtubePlayer.js'
import { formatTime } from './boothParts.jsx'
import { readStored, writeStored } from './boothStorage.js'
import { AUTO_GAP_KEY, DEFAULT_AUTO_GAP, readSetting } from '../../lib/settings.js'

const MUSIC_VOLUME_KEY = 'cheerspot.booth.musicVolume'
const CHEER_VOLUME_KEY = 'cheerspot.booth.cheerVolume'

// The gap between AUTO cheers is set by the superadmin (cheerspot_settings) and read every few
// seconds, so a change reaches an open booth without a refresh. Fade timings are in ducking.js.
const SETTINGS_POLL_MS = 5000

// Owns the booth state: queue, playback status, mode, and the AUTO scheduler.
export default function useCheerBooth() {
  const [started, setStarted] = useState(false)
  const [mode, setMode] = useState('auto')
  const [cheerVolume, setCheerVolume] = useState(() => readStored(CHEER_VOLUME_KEY, 1))
  // Both volumes are kept in this browser, so the DJ's levels survive a refresh.
  const [musicVolume, setMusicVolume] = useState(() => readStored(MUSIC_VOLUME_KEY, 0.8))
  const [items, setItems] = useState(() => getQueue())
  const [status, setStatus] = useState(getBoothStatus)
  const [lastPlayedId, setLastPlayedId] = useState(null)
  const [nextAt, setNextAt] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const [toast, setToast] = useState(null)

  const modeRef = useRef(mode)
  const nextAtRef = useRef(nextAt)
  const gapRef = useRef(DEFAULT_AUTO_GAP)
  // When the last cheer ended. A new gap from the admin also moves the running countdown.
  const lastEndRef = useRef(0)
  const itemsRef = useRef(items)
  const statusRef = useRef(status)
  const toastTimer = useRef(null)
  // Cheers whose audio failed to load. AUTO skips them so one bad file does not repeat forever.
  const failedIds = useRef(new Set())

  useEffect(() => {
    modeRef.current = mode
    nextAtRef.current = nextAt
    itemsRef.current = items
    statusRef.current = status
  })

  const showToast = useCallback(text => {
    setToast({ id: Date.now(), text })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3500)
  }, [])

  useEffect(() => {
    const timer = toastTimer
    return () => {
      clearTimeout(timer.current)
      stopAudio()
    }
  }, [])

  // A failed poll keeps the last queue on screen. Warn once, then again only after a good poll.
  useEffect(() => {
    let warned = false
    return subscribeQueue(
      next => {
        warned = false
        setItems(next)
      },
      () => {
        if (warned) return
        warned = true
        showToast('Could not refresh the cheer queue. Retrying.')
      },
    )
  }, [showToast])
  useEffect(() => subscribeBooth(setStatus), [])

  // Keeps the AUTO gap in step with the admin setting. A failed read keeps the last value.
  useEffect(() => {
    let alive = true
    const load = () =>
      readSetting(AUTO_GAP_KEY, DEFAULT_AUTO_GAP)
        .then(value => {
          const sec = Number(value)
          if (!alive || !Number.isFinite(sec) || sec < 5 || sec > 600 || sec === gapRef.current) return
          gapRef.current = sec
          if (lastEndRef.current) setNextAt(lastEndRef.current + sec * 1000)
        })
        .catch(() => {})
    load()
    const timer = setInterval(load, SETTINGS_POLL_MS)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [])


  useEffect(() => {
    applyCheerVolume(cheerVolume)
    writeStored(CHEER_VOLUME_KEY, cheerVolume)
  }, [cheerVolume])

  useEffect(() => {
    applyMusicVolume(musicVolume)
    writeStored(MUSIC_VOLUME_KEY, musicVolume)
  }, [musicVolume])

  // A cheer plays with the handlers below. markPlayed runs when audio starts, so the queue stays accurate.
  const playItem = useCallback(
    item => {
      playCheer(item, {
        onStart: () => {
          // If the save fails the cheer shows as approved again; AUTO must not play it a second time.
          markPlayed(item.id).catch(() => {
            failedIds.current.add(item.id)
            showToast(`${item.athlete_name} played, but the status was not saved.`)
          })
          setLastPlayedId(item.id)
        },
        onEnd: () => {
          lastEndRef.current = Date.now()
          setNextAt(lastEndRef.current + gapRef.current * 1000)
        },
        onError: () => {
          failedIds.current.add(item.id)
          showToast(`Audio for ${item.athlete_name} could not load. Skipped.`)
        },
      })
    },
    [showToast],
  )

  // AUTO: when the gap has passed and nothing is playing, play the next approved cheer that is not already queued.
  useEffect(() => {
    if (!started) return undefined
    const timer = setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (modeRef.current !== 'auto') return
      const s = statusRef.current
      // busy covers the seconds while a cheer's audio loads, so it is never picked twice.
      if (s.phase === 'cheer' || s.busy || t < nextAtRef.current) return
      const next = itemsRef.current.find(
        item => item.status === 'approved' && !s.queued.includes(item.id) && !failedIds.current.has(item.id),
      )
      if (next) playItem(next)
    }, 500)
    return () => clearInterval(timer)
  }, [started, playItem])

  // The booth starts by itself. Signing in on /dj is a click, so the browser allows sound right away.
  // A remembered session opens without one: then sound starts on the first click or key press anywhere,
  // without a note on screen.
  const startingRef = useRef(false)
  const [needsTap, setNeedsTap] = useState(false)

  const startSession = useCallback(async () => {
    if (startingRef.current) return
    startingRef.current = true
    let ok = false
    try {
      ok = await startAudio()
    } catch {
      ok = false
    }
    if (!ok) {
      startingRef.current = false
      setNeedsTap(true)
      return
    }
    setNeedsTap(false)
    try {
      await loadYouTubeApi()
    } catch {
      showToast('YouTube did not load. Live input still works.')
    }
    setNextAt(0)
    setStarted(true)
  }, [showToast])

  useEffect(() => {
    startSession()
  }, [startSession])

  useEffect(() => {
    if (!needsTap) return undefined
    const onGesture = () => startSession()
    window.addEventListener('pointerdown', onGesture, true)
    window.addEventListener('keydown', onGesture, true)
    return () => {
      window.removeEventListener('pointerdown', onGesture, true)
      window.removeEventListener('keydown', onGesture, true)
    }
  }, [needsTap, startSession])

  const approved = items.filter(item => item.status === 'approved')
  const focusItem =
    items.find(item => item.id === status.cheerId) ||
    items.find(item => item.id === lastPlayedId) ||
    approved[0] ||
    null

  const focusLabel = !focusItem
    ? ''
    : status.cheerId === focusItem.id
      ? status.paused
        ? 'Paused'
        : 'Now playing'
      : focusItem.status === 'played'
        ? 'Last played'
        : 'Up next'

  let countdown = null
  if (mode === 'auto') {
    if (!approved.length) countdown = 'Queue is empty'
    else if (!status.cheerId) {
      const left = Math.ceil((nextAt - now) / 1000)
      countdown = left > 0 ? `Next cheer in ${formatTime(left)}` : 'Next cheer starting'
    }
  } else if (!status.cheerId) {
    countdown = 'Manual mode: press Play to start a cheer'
  }

  // Fetch the next two cheers' audio in the background, so they start without a wait.
  useEffect(() => {
    if (!started) return
    items
      .filter(item => item.status === 'approved' && !failedIds.current.has(item.id))
      .slice(0, 2)
      .forEach(preloadCheer)
  }, [started, items])

  let pill = { label: 'Standby', tone: 'idle' }
  if (status.phase === 'cheer') pill = status.paused ? { label: 'Cheer paused', tone: 'duck' } : { label: 'Cheer playing', tone: 'cheer' }
  else if (status.busy && !status.ducked) pill = { label: 'Loading cheer', tone: 'duck' }
  else if (status.ducked) pill = { label: 'Ducking', tone: 'duck' }
  else if (status.musicPlaying) pill = { label: 'Music', tone: 'music' }

  const togglePlayPause = () => {
    if (status.cheerId) {
      if (status.paused) resumeCheer()
      else pauseCheer()
      return
    }
    if (focusItem) playItem(focusItem)
  }

  // Deleting asks first: the voice note is removed for good, also for the superadmin.
  const deleteItem = item => {
    if (!window.confirm(`Delete the cheer for ${item.athlete_name} from ${item.sender_name}? The voice note is removed for good.`)) return
    removeCheer(item.id).catch(() => showToast(`Could not delete the cheer for ${item.athlete_name}. Try again.`))
  }

  const replayFocus = () => {
    if (!focusItem) return
    if (status.cheerId === focusItem.id) restartCheer()
    else playItem(focusItem)
  }

  return {
    started,
    mode,
    setMode,
    cheerVolume,
    setCheerVolume,
    musicVolume,
    setMusicVolume,
    items,
    approved,
    queuedIds: status.queued,
    status,
    pill,
    focusItem,
    focusLabel,
    countdown,
    toast,
    showToast,
    playItem,
    togglePlayPause,
    replayFocus,
    skip: skipCheer,
    deleteItem,
    moveUp,
    moveDown,
    reorder: setOrder,
  }
}
