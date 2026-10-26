import { useEffect, useRef, useState } from 'react'
import { fetchRecentCheers, getAudioUrl, updateCheerStatus } from '../../lib/cheers.js'
import { AUTO_MS, EXP_MS, FRESH_MS, GAP_SEC, POLL_MS } from './copy.js'

// Maps a cheerspot_cheers row to the shape the booth uses.
const fromRow = row => ({
  id: row.id,
  ts: Date.parse(row.created_at),
  sender: row.sender_name,
  athlete: row.athlete_name,
  dur: row.duration_sec,
  text: row.transcript || '',
  audioPath: row.audio_path,
  status: row.status,
})

// Queue, history and playback for the DJ booth. The queue is the approved cheers that are not
// playing (oldest first); history is the played ones. A local 'played' mark wins over the server
// copy until its save finishes, so a poll still in flight cannot bring a played cheer back.
export default function useDjBooth() {
  const [cheers, setCheers] = useState([])
  const [marks, setMarks] = useState({})
  const [fresh, setFresh] = useState(() => new Set())
  const [now, setNow] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [pos, setPos] = useState(0)
  const [audioDur, setAudioDur] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [loadKey, setLoadKey] = useState(0)
  const [gapLeft, setGapLeft] = useState(null)
  const [auto, setAuto] = useState(true)
  const [autoUntil, setAutoUntil] = useState(() => Date.now() + AUTO_MS)
  const [autoEnded, setAutoEnded] = useState(false)
  const [vol, setVol] = useState(80)
  const [nowTs, setNowTs] = useState(() => Date.now())
  const [histOpen, setHistOpen] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)

  const audioRef = useRef(null)
  const readyRef = useRef(false)
  const playingRef = useRef(false)
  const volRef = useRef(vol)
  const gapTimer = useRef(null)
  const gapCount = useRef(0)
  const handlers = useRef({})
  const seenQueued = useRef(new Set())
  const loaded = useRef(false)
  const freshTimers = useRef(new Set())

  const nowId = now ? now.id : null
  const rows = cheers.map(c => (marks[c.id] ? { ...c, status: 'played', playedTs: marks[c.id].ts } : c))
  const queue = rows
    .filter(c => c.status === 'approved' && c.id !== nowId && nowTs - c.ts < EXP_MS)
    .sort((a, b) => a.ts - b.ts)
  const history = rows
    .filter(c => c.status === 'played')
    .sort((a, b) => (b.playedTs ?? b.ts) - (a.playedTs ?? a.ts))
  const newCount = queue.filter(q => fresh.has(q.id)).length

  // Poll the last hour of cheers. A cheer approved after the first load is flagged as new for a few seconds.
  useEffect(() => {
    let alive = true
    const load = async () => {
      const data = await fetchRecentCheers()
      if (!alive || !data) return
      const arrived = []
      for (const row of data) {
        if (row.status !== 'approved' || seenQueued.current.has(row.id)) continue
        seenQueued.current.add(row.id)
        if (loaded.current) arrived.push(row.id)
      }
      loaded.current = true
      setCheers(data.map(fromRow))
      if (arrived.length) {
        setFresh(prev => new Set([...prev, ...arrived]))
        arrived.forEach(id => {
          const timer = setTimeout(() => {
            freshTimers.current.delete(timer)
            setFresh(prev => {
              const next = new Set(prev)
              next.delete(id)
              return next
            })
          }, FRESH_MS)
          freshTimers.current.add(timer)
        })
      }
    }
    load()
    const t = setInterval(load, POLL_MS)
    return () => {
      alive = false
      clearInterval(t)
      freshTimers.current.forEach(clearTimeout)
      freshTimers.current.clear()
    }
  }, [])

  useEffect(() => {
    const t = setInterval(() => setNowTs(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!saveFailed) return undefined
    const t = setTimeout(() => setSaveFailed(false), 4500)
    return () => clearTimeout(t)
  }, [saveFailed])

  const stopGap = () => {
    clearInterval(gapTimer.current)
    setGapLeft(null)
  }

  const startGap = () => {
    clearInterval(gapTimer.current)
    gapCount.current = GAP_SEC
    setGapLeft(GAP_SEC)
    gapTimer.current = setInterval(() => {
      gapCount.current -= 1
      if (gapCount.current <= 0) {
        stopGap()
        handlers.current.playNext()
      } else {
        setGapLeft(gapCount.current)
      }
    }, 1000)
  }

  useEffect(() => () => clearInterval(gapTimer.current), [])

  // Saves 'played' right away and keeps the mark until the save finishes. A failed save puts the cheer back.
  const markPlayed = item => {
    if (!item || item.status === 'played' || marks[item.id]) return
    setMarks(m => ({ ...m, [item.id]: { ts: Date.now() } }))
    updateCheerStatus(item.id, 'played').catch(() => {
      setMarks(m => {
        const next = { ...m }
        delete next[item.id]
        return next
      })
      setSaveFailed(true)
    })
  }

  // Browsers block play() until the page has had a user gesture. The DJ's first press counts.
  const playAudio = audio => {
    audio.play().catch(err => {
      if (err?.name === 'AbortError') return
      if (err?.name === 'NotAllowedError') setPlaying(false)
      else handlers.current.onLoadError()
    })
  }

  const onEnded = () => {
    markPlayed(now)
    setNow(null)
    setPlaying(false)
    setPos(0)
  }

  const onLoadError = () => {
    setLoadError(true)
    setPlaying(false)
  }

  const playNext = () => {
    const next = queue[0]
    if (!next) return
    setNow(next)
    setPlaying(true)
    setPos(0)
    setLoadError(false)
  }

  const playItem = item => {
    stopGap()
    if (item.id === nowId) {
      replay()
      return
    }
    // The cheer that was already started goes to history. One that was not started returns to the queue.
    if (now && pos > 0.5) markPlayed(now)
    setNow(item)
    setPos(0)
    setPlaying(true)
    setLoadError(false)
  }

  const retry = () => {
    setLoadError(false)
    setLoadKey(k => k + 1)
    setPlaying(true)
  }

  const replay = () => {
    stopGap()
    if (!now) {
      if (history[0]) playItem(history[0])
      return
    }
    if (loadError) {
      retry()
      return
    }
    setPos(0)
    setPlaying(true)
    const audio = audioRef.current
    if (audio && readyRef.current) {
      audio.currentTime = 0
      playAudio(audio)
    }
  }

  const toggle = () => {
    if (!now) {
      stopGap()
      playNext()
      return
    }
    if (loadError) {
      retry()
      return
    }
    setPlaying(p => !p)
  }

  // Skip counts as done: the cheer goes to history and the next one starts at once.
  const skip = () => {
    stopGap()
    markPlayed(now)
    setNow(null)
    setPos(0)
    setPlaying(false)
    playNext()
  }

  const toggleAuto = () => {
    if (auto) {
      stopGap()
      setAuto(false)
      return
    }
    setAuto(true)
    setAutoUntil(Date.now() + AUTO_MS)
    setAutoEnded(false)
  }

  const dismissEnded = () => setAutoEnded(false)

  // Latest handlers for the audio events and the gap timer, which are set up once per cheer.
  handlers.current = { onEnded, onLoadError, playNext }

  useEffect(() => {
    playingRef.current = playing
  })

  useEffect(() => {
    volRef.current = vol
    if (audioRef.current) audioRef.current.volume = vol / 100
  }, [vol])

  // Loads the audio for the cheer that is up. Only a new cheer or a retry creates a new element.
  useEffect(() => {
    if (!now) return undefined
    let cancelled = false
    const audio = new Audio()
    // Sound goes to the browser's default output. Picking a Bluetooth or sound-card output
    // (setSinkId) is not in the design, so it is not wired up.
    audio.preload = 'auto'
    audio.volume = volRef.current / 100
    audio.ontimeupdate = () => setPos(audio.currentTime)
    audio.onloadedmetadata = () => {
      if (Number.isFinite(audio.duration)) setAudioDur(audio.duration)
    }
    audio.onended = () => handlers.current.onEnded()
    audio.onerror = () => handlers.current.onLoadError()
    audioRef.current = audio
    readyRef.current = false
    setPos(0)
    setAudioDur(null)

    getAudioUrl(now.audioPath)
      .then(url => {
        if (cancelled) return
        audio.src = url
        readyRef.current = true
        if (playingRef.current) playAudio(audio)
      })
      .catch(() => {
        if (!cancelled) handlers.current.onLoadError()
      })

    return () => {
      cancelled = true
      audio.ontimeupdate = null
      audio.onloadedmetadata = null
      audio.onended = null
      audio.onerror = null
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      if (audioRef.current === audio) audioRef.current = null
      readyRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowId, loadKey])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !readyRef.current) return
    if (playing) playAudio(audio)
    else audio.pause()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing])

  // Auto-play: with nothing up and cheers waiting, count down and play the next one.
  useEffect(() => {
    if (auto && !nowId && gapLeft == null && queue.length) startGap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, nowId, gapLeft, queue.length])

  useEffect(() => {
    if (!auto) return undefined
    const t = setInterval(() => {
      if (Date.now() >= autoUntil) {
        stopGap()
        setAuto(false)
        setAutoEnded(true)
      }
    }, 1000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, autoUntil])

  return {
    queue,
    history,
    now,
    playing,
    pos,
    audioDur,
    loadError,
    gapLeft,
    auto,
    autoUntil,
    autoEnded,
    vol,
    setVol,
    nowTs,
    newCount,
    fresh,
    histOpen,
    setHistOpen,
    saveFailed,
    toggle,
    skip,
    replay,
    playItem,
    toggleAuto,
    dismissEnded,
  }
}
