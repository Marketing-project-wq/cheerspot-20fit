// Music folder for the booth: the DJ picks a folder on this laptop and its songs play here, one after
// another, starting again from the first after the last. Nothing is uploaded; the files are read
// straight from the laptop. The audio runs through a GainNode, so cheers duck it like the live input.

import { createGainAdapter, getAudioContext } from './ducking.js'

const AUDIO_EXT = /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|webm|aif|aiff)$/i
// Pressing Previous later than this into a song starts it again instead of going back.
const RESTART_AFTER_S = 3

const EMPTY = { folder: '', tracks: [], current: -1, playing: false, time: 0, duration: 0, shuffle: false }

// Songs from a folder <input>: audio files only (no covers, playlists or hidden files), in the order a
// file browser shows them ("2 ..." before "10 ...").
export function tracksFromFiles(fileList) {
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
  return [...fileList]
    .map(file => ({ file, path: file.webkitRelativePath || file.name }))
    .filter(({ file, path }) => {
      if (path.split('/').some(part => part.startsWith('.'))) return false
      return AUDIO_EXT.test(file.name) || file.type.startsWith('audio/')
    })
    .sort((a, b) => collator.compare(a.path, b.path))
    .map(({ file, path }) => ({ file, path, title: file.name.replace(/\.[^.]+$/, '') }))
}

// The folder's name, from the first file's path ("Music/01 Song.mp3" -> "Music").
export function folderNameOf(tracks) {
  const path = tracks[0]?.path || ''
  return path.includes('/') ? path.split('/')[0] : ''
}

function shuffled(list) {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// Returns the folder source: controls for the panel plus `adapter` for the ducker.
// onChange(info) gets { folder, tracks: [{ title, path }], current, playing, time, duration, shuffle }.
// onError(message) reports a song that could not play (it is skipped).
export function createFolderSource({ onChange, onError } = {}) {
  const context = getAudioContext()
  const audio = new Audio()
  audio.preload = 'auto'
  const node = context.createMediaElementSource(audio)
  const gain = context.createGain()
  node.connect(gain)
  gain.connect(context.destination)
  const adapter = createGainAdapter(gain, () => !audio.paused && !audio.ended)

  let tracks = []
  // Play order as indexes into tracks, and where we are in it.
  let order = []
  let pos = -1
  let shuffle = false
  let url = null
  // Songs in a row that failed to play. When every song fails, playback stops instead of looping.
  let failures = 0
  let destroyed = false
  let info = EMPTY

  const emit = patch => {
    info = { ...info, ...patch }
    if (!destroyed) onChange?.(info)
  }

  const currentIndex = () => (pos >= 0 ? order[pos] : -1)

  const release = () => {
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
    if (url) URL.revokeObjectURL(url)
    url = null
  }

  // Loads the song at `nextPos` in the play order and starts it.
  const playAt = nextPos => {
    if (!order.length) return
    pos = ((nextPos % order.length) + order.length) % order.length
    const track = tracks[order[pos]]
    if (url) URL.revokeObjectURL(url)
    url = URL.createObjectURL(track.file)
    audio.src = url
    emit({ current: order[pos], time: 0, duration: 0 })
    start()
  }

  const start = () => {
    // The booth's sound may still be waiting for a click; this runs from one.
    if (context.state !== 'running') context.resume().catch(() => {})
    audio.play().catch(err => {
      // A newer load or a pause interrupted this play. Not a broken file.
      if (err?.name === 'AbortError') return
      if (err?.name === 'NotAllowedError') onError?.('Click Play again to start the music.')
    })
  }

  audio.addEventListener('play', () => emit({ playing: true }))
  audio.addEventListener('pause', () => emit({ playing: false }))
  audio.addEventListener('playing', () => {
    failures = 0
  })
  audio.addEventListener('loadedmetadata', () => emit({ duration: audio.duration || 0 }))
  audio.addEventListener('timeupdate', () => emit({ time: audio.currentTime }))
  audio.addEventListener('ended', () => playAt(pos + 1))
  audio.addEventListener('error', () => {
    if (!audio.getAttribute('src')) return
    const title = tracks[currentIndex()]?.title || 'This song'
    failures += 1
    if (failures >= tracks.length) {
      release()
      emit({ playing: false })
      onError?.('None of the songs in this folder could be played. Try MP3, M4A or WAV files.')
      return
    }
    onError?.(`Could not play "${title}". Skipped to the next song.`)
    playAt(pos + 1)
  })

  return {
    adapter,
    // Replaces the songs with a newly picked folder. Nothing plays until Play is pressed.
    setTracks(next, folder) {
      release()
      tracks = next
      order = tracks.map((_, i) => i)
      if (shuffle) order = shuffled(order)
      pos = -1
      failures = 0
      emit({ folder, tracks: tracks.map(({ title, path }) => ({ title, path })), current: -1, playing: false, time: 0, duration: 0 })
    },
    playTrack(index) {
      const at = order.indexOf(index)
      if (at >= 0) playAt(at)
    },
    play() {
      if (pos < 0) playAt(0)
      else start()
    },
    pause: () => audio.pause(),
    next() {
      if (order.length) playAt(pos + 1)
    },
    previous() {
      if (!order.length) return
      if (pos >= 0 && audio.currentTime > RESTART_AFTER_S) {
        audio.currentTime = 0
        start()
      } else {
        playAt(pos - 1)
      }
    },
    seek(seconds) {
      if (pos < 0 || !Number.isFinite(audio.duration)) return
      audio.currentTime = Math.min(Math.max(0, seconds), audio.duration)
      emit({ time: audio.currentTime })
    },
    // Shuffle keeps the current song and mixes the rest; turning it off goes back to folder order.
    toggleShuffle() {
      shuffle = !shuffle
      const now = currentIndex()
      const all = tracks.map((_, i) => i)
      if (shuffle) {
        order = now >= 0 ? [now, ...shuffled(all.filter(i => i !== now))] : shuffled(all)
        pos = now >= 0 ? 0 : -1
      } else {
        order = all
        pos = now
      }
      emit({ shuffle })
    },
    isPlaying: adapter.isPlaying,
    destroy() {
      destroyed = true
      adapter.cancel()
      release()
      node.disconnect()
      gain.disconnect()
    },
  }
}
