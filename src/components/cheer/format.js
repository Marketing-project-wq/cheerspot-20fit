export const MAX_SEC = 30
// Stroke-dash lengths for the recording ring (r=124) and upload ring (r=92)
export const C_REC = 779.1
export const C_UP = 578.1

export const fmt = (s) => {
  s = Math.max(0, Math.round(s))
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')
}

// Deterministic pseudo-random values so the idle bars look the same on every render
const sd = (i, k) => Math.abs(Math.sin(i * 1.73 + k) * Math.cos(i * 0.41 + k * 0.7))

export const REC_BARS = Array.from({ length: 30 }, (_, i) => ({
  h: Math.round(16 + 40 * sd(i, 1)),
  d: '-' + ((i * 0.13) % 0.9).toFixed(2) + 's',
}))

export const PV_BARS = Array.from({ length: 44 }, (_, i) => Math.round(8 + 38 * sd(i, 2.4)))

export function pickMime() {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return ''
  const types = ['audio/mp4', 'audio/mp4;codecs=mp4a.40.2', 'audio/aac', 'audio/webm;codecs=opus', 'audio/webm']
  return types.find((t) => {
    try {
      return MediaRecorder.isTypeSupported(t)
    } catch (_) {
      return false
    }
  }) || ''
}

export function platformOf() {
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || ''
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'other'
}
