import { useCallback, useEffect, useRef, useState } from 'react'
import { MAX_SEC, pickMime, platformOf } from './format.js'
import { submitCheer } from '../../lib/cheers.js'

// Flow states: idle -> recording -> preview -> uploading -> success
// Failures go to error (retry or auto-resume when mic access is granted).
export default function useCheerFlow({ lang = 'id' } = {}) {
  const en = lang === 'en'
  const [s, setS] = useState('idle')
  const [name, setName] = useState('')
  const [athlete, setAthlete] = useState('')
  const [left, setLeft] = useState(MAX_SEC)
  const [dur, setDur] = useState(MAX_SEC)
  const [prog, setProg] = useState(0)
  const [uploadState, setUploadState] = useState('pending')
  const [playing, setPlaying] = useState(false)
  const [pos, setPos] = useState(0)
  const [heard, setHeard] = useState(false)
  const [err, setErr] = useState('')
  const [errKind, setErrKind] = useState('denied')
  const [tries, setTries] = useState(0)
  const [levels, setLevels] = useState(null)
  const [url, setUrl] = useState(null)
  const [micReady, setMicReady] = useState(false)

  // Refs hold media objects and the latest flow state for event listeners
  const sRef = useRef('idle')
  const dead = useRef(false)
  const streamRef = useRef(null)
  const pendingRef = useRef(null)
  const ctxRef = useRef(null)
  const anRef = useRef(null)
  const srcStreamRef = useRef(null)
  const recRef = useRef(null)
  const chunksRef = useRef([])
  const blobRef = useRef(null)
  const urlRef = useRef(null)
  const audioRef = useRef(null)
  const t0Ref = useRef(0)
  const rafRef = useRef(0)
  const busyRef = useRef(false)
  const tapRef = useRef(false)
  const downAtRef = useRef(0)
  const watchRef = useRef(null)

  const go = useCallback((next) => {
    sRef.current = next
    setS(next)
    setPlaying(false)
    setPos(0)
  }, [])

  const teardown = () => {
    cancelAnimationFrame(rafRef.current)
    try {
      if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop()
    } catch (_) {}
  }

  const release = () => {
    teardown()
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop())
    } catch (_) {}
    try {
      if (ctxRef.current && ctxRef.current.state !== 'closed') ctxRef.current.close()
    } catch (_) {}
    streamRef.current = null
    ctxRef.current = null
    anRef.current = null
    srcStreamRef.current = null
  }

  const dropAudio = () => {
    if (audioRef.current) {
      try {
        audioRef.current.pause()
      } catch (_) {}
      audioRef.current = null
    }
    if (urlRef.current) {
      try {
        URL.revokeObjectURL(urlRef.current)
      } catch (_) {}
      urlRef.current = null
    }
  }

  const unwatch = () => {
    const w = watchRef.current
    if (!w) return
    watchRef.current = null
    clearInterval(w.poll)
    document.removeEventListener('visibilitychange', w.onVis)
    window.removeEventListener('focus', w.onVis)
    if (w.permObj) w.permObj.onchange = null
  }

  // Ask for the mic once; reuse the same stream for later recordings
  const acquire = () => {
    const md = navigator.mediaDevices
    const cur = streamRef.current
    if (cur && cur.getAudioTracks().some((t) => t.readyState === 'live')) return Promise.resolve(cur)
    if (pendingRef.current) return pendingRef.current
    pendingRef.current = md
      .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
      .then((stream) => {
        pendingRef.current = null
        if (dead.current) {
          stream.getTracks().forEach((t) => t.stop())
          const e = new Error('unmounted')
          e.name = 'AbortError'
          throw e
        }
        streamRef.current = stream
        setMicReady(true)
        return stream
      })
      .catch((e) => {
        pendingRef.current = null
        throw e
      })
    return pendingRef.current
  }

  // Auto-detect when mic access is granted while on the error screen
  const watch = () => {
    if (watchRef.current) return
    const w = {}
    watchRef.current = w
    const granted = () => {
      if (sRef.current !== 'error') return
      unwatch()
      setMicReady(true)
      setTries(0)
      go('idle')
    }
    const check = () => {
      try {
        if (!navigator.permissions) return
        navigator.permissions
          .query({ name: 'microphone' })
          .then((p) => {
            if (p.state === 'granted') granted()
            if (!w.permObj) {
              w.permObj = p
              p.onchange = () => {
                if (p.state === 'granted') granted()
              }
            }
          })
          .catch(() => {})
      } catch (_) {}
    }
    w.onVis = () => {
      if (document.visibilityState === 'visible') check()
    }
    document.addEventListener('visibilitychange', w.onVis)
    window.addEventListener('focus', w.onVis)
    w.poll = setInterval(check, 2000)
    check()
  }

  const fail = (kind) => {
    release()
    setErrKind(kind)
    if (kind === 'denied') setTries((n) => n + 1)
    go('error')
    // Only a mic permission can be fixed while the page is open, so only watch for that
    if (kind === 'denied') watch()
  }

  const startLevels = (stream) => {
    const ctx = ctxRef.current
    if (!ctx) return
    if (!anRef.current || srcStreamRef.current !== stream) {
      try {
        const src = ctx.createMediaStreamSource(stream)
        const an = ctx.createAnalyser()
        an.fftSize = 256
        an.smoothingTimeConstant = 0.6
        src.connect(an)
        anRef.current = an
        srcStreamRef.current = stream
      } catch (_) {
        return
      }
    }
    const an = anRef.current
    const buf = new Uint8Array(an.frequencyBinCount)
    const hist = new Array(30).fill(0)
    let last = 0
    const loop = (ts) => {
      rafRef.current = requestAnimationFrame(loop)
      if (ts - last < 60) return
      last = ts
      an.getByteTimeDomainData(buf)
      let sum = 0
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128
        sum += v * v
      }
      hist.push(Math.min(1, Math.sqrt(sum / buf.length) * 4))
      hist.shift()
      setLevels(hist.slice())
    }
    rafRef.current = requestAnimationFrame(loop)
  }

  // Must run synchronously inside the tap: iOS needs a user gesture for mic and AudioContext
  const begin = () => {
    if (sRef.current === 'recording' || busyRef.current) return
    unwatch()
    dropAudio()
    // A new take must never send the previous recording.
    blobRef.current = null
    setUrl(null)
    setLevels(null)
    setHeard(false)
    setPos(0)
    setPlaying(false)
    if (window.isSecureContext === false) return fail('insecure')
    const md = navigator.mediaDevices
    if (!md || !md.getUserMedia || typeof MediaRecorder === 'undefined') return fail('unsupported')
    const AC = window.AudioContext || window.webkitAudioContext
    try {
      if (!ctxRef.current || ctxRef.current.state === 'closed') ctxRef.current = AC ? new AC() : null
      if (ctxRef.current && ctxRef.current.resume) ctxRef.current.resume()
    } catch (_) {
      ctxRef.current = null
    }
    busyRef.current = true
    acquire()
      .then((stream) => {
        busyRef.current = false
        if (dead.current) return
        const mime = pickMime()
        let rec
        try {
          rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
        } catch (_) {
          rec = new MediaRecorder(stream)
        }
        recRef.current = rec
        chunksRef.current = []
        rec.ondataavailable = (e) => {
          if (e.data && e.data.size) chunksRef.current.push(e.data)
        }
        rec.onstop = () => {
          const type = rec.mimeType || mime || 'audio/mp4'
          const blob = new Blob(chunksRef.current, { type })
          blobRef.current = blob
          if (dead.current) return
          const next = URL.createObjectURL(blob)
          urlRef.current = next
          setUrl(next)
        }
        rec.start(250)
        t0Ref.current = Date.now()
        startLevels(stream)
        setErr('')
        setLeft(MAX_SEC)
        go('recording')
      })
      .catch((e) => {
        busyRef.current = false
        teardown()
        if (dead.current) return
        const n = e && e.name
        fail(n === 'NotFoundError' ? 'unsupported' : 'denied')
      })
  }

  const stopRec = () => {
    if (sRef.current !== 'recording') return
    const elapsed = Math.round((Date.now() - t0Ref.current) / 1000)
    setDur(Math.max(1, Math.min(MAX_SEC, elapsed)))
    cancelAnimationFrame(rafRef.current)
    try {
      if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop()
    } catch (_) {}
    setLevels(null)
    go('preview')
  }

  // Hold-to-record: press and hold longer than 0.7s, then release, stops. A quick tap keeps recording until STOP.
  const recDown = () => {
    downAtRef.current = Date.now()
    const up = () => {
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      if (sRef.current === 'recording' && t0Ref.current && t0Ref.current < Date.now() - 700 && Date.now() - downAtRef.current > 700) stopRec()
    }
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    tapRef.current = true
    begin()
  }

  const startRec = () => {
    // The pointerdown already started recording; skip the click that follows it
    if (tapRef.current) {
      tapRef.current = false
      return
    }
    begin()
  }

  const togglePlay = () => {
    const u = urlRef.current
    if (!u) return // recording is still being finalised
    if (!audioRef.current) {
      const au = new Audio()
      au.src = u
      au.preload = 'auto'
      au.setAttribute('playsinline', '')
      au.playsInline = true
      if (pos > 0) {
        try {
          au.currentTime = pos
        } catch (_) {}
      }
      au.ontimeupdate = () => {
        const p = au.currentTime
        setPos(p)
        if (p >= dur * 0.85) setHeard(true)
      }
      au.onended = () => {
        setPlaying(false)
        setPos(0)
        setHeard(true)
      }
      au.onerror = () => setPlaying(false)
      audioRef.current = au
    }
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      const p = audioRef.current.play()
      if (p && p.catch) p.catch(() => setPlaying(false))
      setPlaying(true)
    }
  }

  const seek = (frac) => {
    const p = Math.max(0, Math.min(1, frac)) * dur
    if (audioRef.current) {
      try {
        audioRef.current.currentTime = p
      } catch (_) {}
    }
    setPos(p)
  }

  const redo = () => {
    if (audioRef.current) audioRef.current.pause()
    setPlaying(false)
    setPos(0)
    setHeard(false)
    begin()
  }

  // Resolves with the current take's audio, or null if it is not ready within 4 seconds.
  const waitForBlob = () =>
    new Promise(resolve => {
      const until = Date.now() + 4000
      const check = () => {
        if (blobRef.current || Date.now() > until) resolve(blobRef.current)
        else setTimeout(check, 50)
      }
      check()
    })

  const send = () => {
    if (!athlete.trim()) {
      setErr(en ? 'Fill in the athlete name first.' : 'Isi nama atlet dulu, biar DJ tahu cheer ini buat siapa.')
      return
    }
    if (audioRef.current) audioRef.current.pause()
    setProg(0)
    setUploadState('pending')
    go('uploading')
    // Some browsers (Safari) finish the recording a moment after Stop. Wait for this take's audio.
    waitForBlob()
      .then(blob => {
        if (!blob) throw new Error('Recording not ready')
        return submitCheer({ blob, senderName: name, athleteName: athlete, durationSec: dur })
      })
      .then(() => setUploadState('done'))
      .catch(() => setUploadState('error'))
  }

  const again = () => {
    dropAudio()
    blobRef.current = null
    setAthlete('')
    setUrl(null)
    go('idle')
  }

  // Mic is requested on page open. Released when the tab is hidden (not while recording).
  useEffect(() => {
    dead.current = false
    const md = navigator.mediaDevices
    if (md && md.getUserMedia && window.isSecureContext !== false) acquire().catch(() => {})
    const onHide = () => {
      if (document.visibilityState === 'hidden' && sRef.current !== 'recording') release()
    }
    document.addEventListener('visibilitychange', onHide)
    return () => {
      dead.current = true
      document.removeEventListener('visibilitychange', onHide)
      release()
      dropAudio()
      unwatch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Recording countdown: stops on its own at 0
  useEffect(() => {
    if (s !== 'recording') return
    if (left <= 0) {
      stopRec()
      return
    }
    const id = setTimeout(() => setLeft((l) => l - 1), 1000)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, left])

  // Progress runs up to 95% while the upload is in flight, then finishes once it succeeds.
  useEffect(() => {
    if (s !== 'uploading') return
    if (uploadState === 'error') {
      setErr(en ? 'Upload failed. Try sending again.' : 'Upload gagal. Coba kirim lagi ya.')
      go('preview')
      return
    }
    if (prog >= 100 && uploadState === 'done') {
      go('success')
      return
    }
    const cap = uploadState === 'done' ? 100 : 95
    const id = setTimeout(() => setProg((p) => Math.min(cap, p + 3)), 70)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, prog, uploadState])

  return {
    s,
    name,
    setName,
    athlete,
    setAthlete: (v) => {
      setAthlete(v)
      setErr('')
    },
    left,
    dur,
    prog,
    playing,
    pos,
    heard,
    err,
    errKind,
    tries,
    levels,
    micReady,
    platform: platformOf(),
    recDown,
    startRec,
    stopRec,
    togglePlay,
    seek,
    redo,
    send,
    retry: begin,
    again,
  }
}
