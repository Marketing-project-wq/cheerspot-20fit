import { useEffect, useRef, useState } from 'react'
import { createLocalMusic, registerMusicSource, setMusicVolume } from '../../lib/ducking.js'
import { createYouTubeSource, parseYouTubeInput } from '../../lib/youtubePlayer.js'
import { Icon, Slider } from './boothParts.jsx'
import { readStored, writeStored } from './boothStorage.js'

const PLAYLIST_KEY = 'cheerspot.booth.playlist'
const VOLUME_KEY = 'cheerspot.booth.musicVolume'
const AUDIO_EXT = /\.(mp3|wav|m4a|aac|ogg|oga|flac|opus|webm)$/i

const EMPTY_LOCAL = { count: 0, index: -1, title: '', shuffle: false, playing: false }
const EMPTY_YT = { kind: null, title: '', index: -1, count: 0, shuffle: false, playing: false, loaded: false }

function Transport({ playing, shuffle, canTrack, hasTrack, onPrevious, onToggle, onNext, onShuffle, shuffleDisabled }) {
  return (
    <div className="booth-transport">
      <button type="button" className="booth-btn booth-btn--icon" onClick={onPrevious} disabled={!canTrack} aria-label="Previous track">
        <Icon name="previous" />
      </button>
      <button
        type="button"
        className="booth-btn booth-btn--primary booth-btn--icon"
        onClick={onToggle}
        disabled={!hasTrack}
        aria-label={playing ? 'Pause music' : 'Play music'}
      >
        <Icon name={playing ? 'pause' : 'play'} size={26} />
      </button>
      <button type="button" className="booth-btn booth-btn--icon" onClick={onNext} disabled={!canTrack} aria-label="Next track">
        <Icon name="next" />
      </button>
      <button
        type="button"
        className="booth-btn booth-btn--icon"
        onClick={onShuffle}
        disabled={shuffleDisabled}
        aria-pressed={shuffle}
        aria-label={shuffle ? 'Shuffle on' : 'Shuffle off'}
      >
        <Icon name="shuffle" />
      </button>
    </div>
  )
}

export default function MusicPlayer({ started, onToast }) {
  const [tab, setTab] = useState('youtube')
  const [url, setUrl] = useState(() => readStored(PLAYLIST_KEY, ''))
  const [urlError, setUrlError] = useState('')
  const [searchText, setSearchText] = useState('')
  const [volume, setVolume] = useState(() => readStored(VOLUME_KEY, 0.8))
  const [ytInfo, setYtInfo] = useState(EMPTY_YT)
  const [localInfo, setLocalInfo] = useState(EMPTY_LOCAL)

  const hostRef = useRef(null)
  const ytRef = useRef(null)
  const localRef = useRef(null)
  const toastRef = useRef(onToast)

  useEffect(() => {
    toastRef.current = onToast
  }, [onToast])

  useEffect(() => {
    setMusicVolume(volume)
    writeStored(VOLUME_KEY, volume)
  }, [volume])

  // Players are created once the session starts (the user gesture). Only one source plays at a time.
  useEffect(() => {
    if (!started || !hostRef.current || !window.YT?.Player) return
    const source = createYouTubeSource(hostRef.current, {
      onChange: setYtInfo,
      onSkip: message => toastRef.current?.(message),
    })
    ytRef.current = source
    registerMusicSource('youtube', source)
    return () => {
      registerMusicSource('youtube', null)
      source.destroy()
      ytRef.current = null
      setYtInfo(EMPTY_YT)
    }
  }, [started])

  useEffect(() => {
    if (!started) return
    const local = createLocalMusic({
      onChange: setLocalInfo,
      onError: () => toastRef.current?.('Track could not be played, skipped'),
    })
    localRef.current = local
    registerMusicSource('local', local.adapter)
    return () => {
      registerMusicSource('local', null)
      local.destroy()
      localRef.current = null
      setLocalInfo(EMPTY_LOCAL)
    }
  }, [started])

  const ytReady = started && !!window.YT?.Player

  const loadPlaylist = event => {
    event.preventDefault()
    const parsed = parseYouTubeInput(url)
    if (!parsed) {
      setUrlError('Paste a YouTube playlist or video link.')
      return
    }
    if (!ytRef.current) {
      setUrlError('YouTube is not available. Local files still work.')
      return
    }
    setUrlError('')
    writeStored(PLAYLIST_KEY, url.trim())
    // Only one music source plays at a time.
    localRef.current?.pause()
    ytRef.current.load(parsed)
  }

  const ytToggle = () => {
    const yt = ytRef.current
    if (!yt) return
    if (ytInfo.playing) {
      yt.pause()
    } else {
      localRef.current?.pause()
      yt.play()
    }
  }

  const onFiles = event => {
    const files = Array.from(event.target.files || []).filter(
      file => file.type.startsWith('audio/') || AUDIO_EXT.test(file.name),
    )
    event.target.value = ''
    if (!files.length) {
      onToast?.('No audio files found in that selection')
      return
    }
    ytRef.current?.pause()
    localRef.current?.setFiles(files)
  }

  const localToggle = () => {
    const local = localRef.current
    if (!local) return
    if (localInfo.playing) {
      local.pause()
    } else {
      ytRef.current?.pause()
      local.play()
    }
  }

  const ytPlaylist = ytInfo.kind === 'playlist'
  const trackNumber = ytInfo.index >= 0 ? ytInfo.index + 1 : 0

  return (
    <section className="booth-panel booth-music" aria-labelledby="booth-music-title">
      <header className="booth-panel__head">
        <h2 id="booth-music-title">Music</h2>
      </header>

      <div className="booth-tabs" role="tablist" aria-label="Music source">
        <button
          type="button"
          role="tab"
          id="tab-youtube"
          aria-selected={tab === 'youtube'}
          aria-controls="panel-youtube"
          className={`booth-tab${tab === 'youtube' ? ' is-active' : ''}`}
          onClick={() => setTab('youtube')}
        >
          YouTube
        </button>
        <button
          type="button"
          role="tab"
          id="tab-local"
          aria-selected={tab === 'local'}
          aria-controls="panel-local"
          className={`booth-tab${tab === 'local' ? ' is-active' : ''}`}
          onClick={() => setTab('local')}
        >
          Local files
        </button>
      </div>

      {/* Always mounted: the YouTube player lives in here, even while the Local files tab is open. */}
      <div ref={hostRef} className="booth-yt-host" aria-hidden="true" />

      {tab === 'youtube' ? (
        <div role="tabpanel" id="panel-youtube" aria-labelledby="tab-youtube" className="booth-music__body">
          <form className="booth-url" onSubmit={loadPlaylist}>
            <label className="booth-field">
              <span className="booth-field__label">Playlist or video link</span>
              <input
                type="text"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                placeholder="https://www.youtube.com/playlist?list=..."
                value={url}
                onChange={event => setUrl(event.target.value)}
              />
            </label>
            <button type="submit" className="booth-btn" disabled={!ytReady}>
              Load
            </button>
          </form>
          {/* Opens YouTube search in a new tab. Copy a video or playlist link from there and paste it above. */}
          <form
            className="booth-url"
            onSubmit={event => {
              event.preventDefault()
              const q = searchText.trim()
              if (!q) return
              window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, '_blank', 'noopener')
            }}
          >
            <label className="booth-field">
              <span className="booth-field__label">Search YouTube</span>
              <input
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder="Artist or song name"
                value={searchText}
                onChange={event => setSearchText(event.target.value)}
              />
            </label>
            <button type="submit" className="booth-btn" disabled={!searchText.trim()}>
              Search
            </button>
          </form>
          {urlError && <p className="booth-error" role="alert">{urlError}</p>}
          {!ytReady && <p className="booth-hint">Start the session to load YouTube.</p>}
          {ytReady && !ytInfo.loaded && <p className="booth-hint">Paste a link and press Load.</p>}
          <Transport
            playing={ytInfo.playing}
            shuffle={ytInfo.shuffle}
            canTrack={ytPlaylist}
            hasTrack={ytInfo.loaded}
            shuffleDisabled={!ytPlaylist}
            onPrevious={() => ytRef.current?.previous()}
            onToggle={ytToggle}
            onNext={() => ytRef.current?.next()}
            onShuffle={() => ytRef.current?.toggleShuffle()}
          />
        </div>
      ) : (
        <div role="tabpanel" id="panel-local" aria-labelledby="tab-local" className="booth-music__body">
          <label className="booth-btn booth-file">
            Choose audio files
            <input type="file" multiple accept="audio/*" onChange={onFiles} disabled={!started} className="booth-file__input" />
          </label>
          <p className="booth-hint">{localInfo.count ? `${localInfo.count} file${localInfo.count === 1 ? '' : 's'} ready` : 'No files selected.'}</p>
          <Transport
            playing={localInfo.playing}
            shuffle={localInfo.shuffle}
            canTrack={localInfo.count > 1}
            hasTrack={localInfo.count > 0}
            shuffleDisabled={localInfo.count < 2}
            onPrevious={() => localRef.current?.previous()}
            onToggle={localToggle}
            onNext={() => localRef.current?.next()}
            onShuffle={() => localRef.current?.toggleShuffle()}
          />
        </div>
      )}

      <div className="booth-now-track" aria-live="polite">
        <span className="booth-now-track__label">Now playing</span>
        <span className="booth-now-track__title">
          {tab === 'youtube'
            ? ytInfo.title || (ytInfo.loaded ? 'Loading track...' : 'Nothing loaded')
            : localInfo.title || 'Nothing playing'}
        </span>
        {tab === 'youtube' && ytPlaylist && ytInfo.count > 0 && (
          <span className="booth-now-track__meta">Track {trackNumber} of {ytInfo.count}</span>
        )}
        {tab === 'local' && localInfo.count > 0 && (
          <span className="booth-now-track__meta">Track {localInfo.index + 1} of {localInfo.count}</span>
        )}
      </div>

      <Slider
        id="music-volume"
        label="Music volume"
        value={Math.round(volume * 100)}
        min={0}
        max={100}
        format={value => `${value}%`}
        onChange={value => setVolume(value / 100)}
      />
    </section>
  )
}
