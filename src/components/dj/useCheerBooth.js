import { useCallback, useEffect, useRef, useState } from 'react'
import { getQueue, markPlayed, moveDown, moveUp, setOrder, subscribe as subscribeQueue } from '../../lib/cheerQueue.js'
import {
  getBoothStatus,
  pauseCheer,
  playCheer,
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
      if (s.phase === 'cheer' || t < nextAtRef.current) return
      const next = itemsRef.current.find(
        item => item.status === 'approved' && !s.queued.includes(item.id) && !failedIds.current.has(item.id),
      )
      if (next) playItem(next)
    }, 500)
    return () => clearInterval(timer)
  }, [started, playItem])

  const startSession = useCallback(async () => {
    // startAudio resumes the AudioContext before its first await, so this stays inside the click.
    try {
      await startAudio()
    } catch {
      showToast('Audio could not start. Check the browser sound settings.')
      return
    }
    try {
      await loadYouTubeApi()
    } catch {
      showToast('YouTube did not load. Local files still work.')
    }
    setNextAt(0)
    setStarted(true)
  }, [showToast])

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

  let pill = { label: 'Standby', tone: 'idle' }
  if (status.phase === 'cheer') pill = { label: 'Cheer playing', tone: 'cheer' }
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
    startSession,
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
