import { useCallback, useEffect, useRef, useState } from 'react'
import { getQueue, markPlayed, moveDown, moveUp, setOrder, subscribe as subscribeQueue } from '../../lib/cheerQueue.js'
import {
  getBoothStatus,
  pauseCheer,
  playCheer,
  preloadCheer,
  restartCheer,
  resumeCheer,
  setMasterVolume,
  skipCheer,
  startAudio,
  stopAudio,
  subscribeBooth,
} from '../../lib/ducking.js'
import { loadYouTubeApi } from '../../lib/youtubePlayer.js'
import { formatTime } from './boothParts.jsx'

// Fixed gap between AUTO cheers. Fade timings are the defaults in ducking.js.
const GAP_SEC = 90

// Owns the booth state: queue, playback status, mode, and the AUTO scheduler.
export default function useCheerBooth() {
  const [started, setStarted] = useState(false)
  const [mode, setMode] = useState('auto')
  const [master, setMaster] = useState(1)
  const [items, setItems] = useState(() => getQueue())
  const [status, setStatus] = useState(getBoothStatus)
  const [lastPlayedId, setLastPlayedId] = useState(null)
  const [nextAt, setNextAt] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const [toast, setToast] = useState(null)

  const modeRef = useRef(mode)
  const nextAtRef = useRef(nextAt)
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


  useEffect(() => {
    setMasterVolume(master)
  }, [master])

  // A cheer plays with the handlers below. markPlayed runs when audio starts, so the queue stays accurate.
  const playItem = useCallback(
    item => {
      playCheer(item, {
        onStart: () => {
          markPlayed(item.id).catch(() => showToast(`${item.athlete_name} played, but the status was not saved.`))
          setLastPlayedId(item.id)
        },
        onEnd: () => setNextAt(Date.now() + GAP_SEC * 1000),
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
  // A remembered session opens without one: then sound waits for the first click or key press anywhere.
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

  const replayFocus = () => {
    if (!focusItem) return
    if (status.cheerId === focusItem.id) restartCheer()
    else playItem(focusItem)
  }

  return {
    started,
    needsTap,
    mode,
    setMode,
    master,
    setMaster,
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
    moveUp,
    moveDown,
    reorder: setOrder,
  }
}
