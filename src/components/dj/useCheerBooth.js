import { useCallback, useEffect, useRef, useState } from 'react'
import { getQueue, markPlayed, moveDown, moveUp, setOrder, subscribe as subscribeQueue } from '../../lib/cheerQueue.js'
import {
  getBoothStatus,
  pauseCheer,
  playCheer,
  restartCheer,
  resumeCheer,
  setDuckingSettings,
  setMasterVolume,
  skipCheer,
  startAudio,
  stopAudio,
  subscribeBooth,
} from '../../lib/ducking.js'
import { loadYouTubeApi } from '../../lib/youtubePlayer.js'
import { formatTime } from './boothParts.jsx'
import { readStored, writeStored } from './boothStorage.js'

const SETTINGS_KEY = 'cheerspot.booth.settings'
const DEFAULT_SETTINGS = { duckLevel: 0.2, fadeDownMs: 800, fadeUpMs: 1500, delayBeforeUpMs: 1000, gapSec: 90 }

function clampSettings(input) {
  const num = (value, fallback, min, max) => {
    const n = Number(value)
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback
  }
  return {
    duckLevel: num(input.duckLevel, DEFAULT_SETTINGS.duckLevel, 0, 0.5),
    fadeDownMs: num(input.fadeDownMs, DEFAULT_SETTINGS.fadeDownMs, 0, 5000),
    fadeUpMs: num(input.fadeUpMs, DEFAULT_SETTINGS.fadeUpMs, 0, 6000),
    delayBeforeUpMs: num(input.delayBeforeUpMs, DEFAULT_SETTINGS.delayBeforeUpMs, 0, 5000),
    gapSec: num(input.gapSec, DEFAULT_SETTINGS.gapSec, 15, 300),
  }
}

// Owns the booth state: queue, playback status, mode, settings, and the AUTO scheduler.
export default function useCheerBooth() {
  const [started, setStarted] = useState(false)
  const [mode, setMode] = useState('auto')
  const [master, setMaster] = useState(1)
  const [settings, setSettings] = useState(() => clampSettings(readStored(SETTINGS_KEY, {})))
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
  const settingsRef = useRef(settings)
  const toastTimer = useRef(null)

  useEffect(() => {
    modeRef.current = mode
    nextAtRef.current = nextAt
    itemsRef.current = items
    statusRef.current = status
    settingsRef.current = settings
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

  useEffect(() => subscribeQueue(setItems), [])
  useEffect(() => subscribeBooth(setStatus), [])

  useEffect(() => {
    setDuckingSettings({
      duckLevel: settings.duckLevel,
      fadeDownMs: settings.fadeDownMs,
      fadeUpMs: settings.fadeUpMs,
      delayBeforeUpMs: settings.delayBeforeUpMs,
    })
    writeStored(SETTINGS_KEY, settings)
  }, [settings])

  useEffect(() => {
    setMasterVolume(master)
  }, [master])

  // A cheer plays with the handlers below. markPlayed runs when audio starts, so the queue stays accurate.
  const playItem = useCallback(
    item => {
      playCheer(item, {
        onStart: () => {
          markPlayed(item.id)
          setLastPlayedId(item.id)
        },
        onEnd: () => setNextAt(Date.now() + settingsRef.current.gapSec * 1000),
        onError: () => showToast(`Audio for ${item.athlete_name} could not load. Skipped.`),
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
      const next = itemsRef.current.find(item => item.status === 'approved' && !s.queued.includes(item.id))
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
    settings,
    updateSettings: patch => setSettings(prev => clampSettings({ ...prev, ...patch })),
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
