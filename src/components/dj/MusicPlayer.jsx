import { useEffect, useRef, useState } from 'react'
import { registerMusicSource, setMusicVolume } from '../../lib/ducking.js'
import { createYouTubeSource, parseYouTubeInput } from '../../lib/youtubePlayer.js'
import { fetchTopMusic, searchYouTube } from '../../lib/youtubeSearch.js'
import { formatTime, Icon, Slider } from './boothParts.jsx'
import { readStored, writeStored } from './boothStorage.js'

const PLAYLIST_KEY = 'cheerspot.booth.playlist'
const VOLUME_KEY = 'cheerspot.booth.musicVolume'

// Chips above the grid, like YouTube's topic row. Each one runs a search; Trending loads the music chart.
const CHIPS = [
  { key: 'trending', label: 'Trending' },
  { key: 'hyrox', label: 'HYROX', q: 'hyrox workout music mix' },
  { key: 'workout', label: 'Workout mix', q: 'workout music mix' },
  { key: 'hiphop', label: 'Hip hop', q: 'hip hop workout mix' },
  { key: 'edm', label: 'EDM', q: 'edm workout mix' },
  { key: 'running', label: 'Running', q: 'running music 170 bpm' },
  { key: 'jersey', label: 'Jersey club', q: 'jersey club mix' },
]

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
  const [url, setUrl] = useState(() => readStored(PLAYLIST_KEY, ''))
  const [urlError, setUrlError] = useState('')
  const [searchText, setSearchText] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [playingResult, setPlayingResult] = useState(null)
  const [chip, setChip] = useState(null)
  const [volume, setVolume] = useState(() => readStored(VOLUME_KEY, 0.8))
  const [ytInfo, setYtInfo] = useState(EMPTY_YT)

  const hostRef = useRef(null)
  const ytRef = useRef(null)
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

  const ytReady = started && !!window.YT?.Player

  const loadResults = async (load, chipKey) => {
    setSearching(true)
    setSearchError('')
    setChip(chipKey)
    try {
      setResults(await load())
    } catch {
      setResults([])
      setSearchError('YouTube is not available right now. Paste a link below instead.')
    } finally {
      setSearching(false)
    }
  }

  const runSearch = event => {
    event.preventDefault()
    const q = searchText.trim()
    if (!q || searching) return
    loadResults(() => searchYouTube(q), null)
  }

  const pickChip = item => {
    if (searching) return
    loadResults(item.q ? () => searchYouTube(item.q) : fetchTopMusic, item.key)
  }

  // Like YouTube's home page: show videos as soon as the session starts, before any search.
  const startGridLoaded = useRef(false)
  useEffect(() => {
    if (!started || startGridLoaded.current) return
    startGridLoaded.current = true
    loadResults(fetchTopMusic, 'trending')
  }, [started])

  // Play a search result through the same path as a pasted link.
  const playResult = item => {
    const parsed = parseYouTubeInput(`https://www.youtube.com/watch?v=${item.id}`)
    if (!parsed || !ytRef.current) return
    setUrlError('')
    ytRef.current.load(parsed)
    setPlayingResult(item)
  }

  const loadPlaylist = event => {
    event.preventDefault()
    const parsed = parseYouTubeInput(url)
    if (!parsed) {
      setUrlError('Paste a YouTube playlist or video link.')
      return
    }
    if (!ytRef.current) {
      setUrlError('YouTube is not available right now.')
      return
    }
    setUrlError('')
    writeStored(PLAYLIST_KEY, url.trim())
    ytRef.current.load(parsed)
    setPlayingResult(null)
  }

  const ytToggle = () => {
    const yt = ytRef.current
    if (!yt) return
    if (ytInfo.playing) {
      yt.pause()
    } else {
      yt.play()
    }
  }

  const ytPlaylist = ytInfo.kind === 'playlist'
  const trackNumber = ytInfo.index >= 0 ? ytInfo.index + 1 : 0
  // Once a video plays, the panel switches from YouTube's home grid to its watch page layout.
  const watching = ytInfo.loaded

  return (
    <section className="booth-panel booth-music" aria-labelledby="booth-music-title">
      <header className="booth-panel__head">
        <h2 id="booth-music-title">Music</h2>
      </header>

      {/* Laid out like YouTube: search on top, then the home grid, or the watch page once a video plays. */}
      <form className="booth-ytsearch" role="search" onSubmit={runSearch}>
        <input
          type="search"
          autoComplete="off"
          spellCheck={false}
          placeholder="Search YouTube"
          aria-label="Search YouTube"
          value={searchText}
          onChange={event => setSearchText(event.target.value)}
        />
        <button type="submit" disabled={!searchText.trim() || searching || !started} aria-label="Search">
          {searching ? <span className="booth-ytsearch__spin" aria-hidden="true" /> : <Icon name="search" />}
        </button>
      </form>

      {/* The wrapper is always rendered so the player node never remounts (that would stop the music). */}
      <div className={`booth-ytlayout${watching ? ' is-watching' : ''}`}>
        <div className="booth-ytlayout__main">
          {/* YouTube will not play in a hidden or tiny player, so it shows once a link is loaded. */}
          <div
            ref={hostRef}
            className={`booth-yt-host${ytInfo.loaded ? ' is-visible' : ''}`}
            aria-hidden={!ytInfo.loaded}
          />

          {/* Deck: what is playing and its controls, right under the video. */}
          <div className="booth-deck">
            <div className="booth-now-track" aria-live="polite">
              <span className="booth-now-track__label">Now playing</span>
              <span className="booth-now-track__title">
                {ytInfo.title || (ytInfo.loaded ? 'Loading track...' : 'Nothing loaded')}
              </span>
              {watching && playingResult?.channel && (
                <span className="booth-now-track__channel">{playingResult.channel}</span>
              )}
              {ytPlaylist && ytInfo.count > 0 && (
                <span className="booth-now-track__meta">Track {trackNumber} of {ytInfo.count}</span>
              )}
            </div>
            <div className="booth-deck__controls">
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
              <Slider
                id="music-volume"
                label="Music volume"
                value={Math.round(volume * 100)}
                min={0}
                max={100}
                format={value => `${value}%`}
                onChange={value => setVolume(value / 100)}
              />
            </div>
          </div>
        </div>

        <div className="booth-ytlayout__side">
          <div className="booth-ytchips" role="group" aria-label="Topics">
            {CHIPS.map(item => (
              <button
                key={item.key}
                type="button"
                className={`booth-ytchip${chip === item.key ? ' is-on' : ''}`}
                aria-pressed={chip === item.key}
                onClick={() => pickChip(item)}
                disabled={!started}
              >
                {item.label}
              </button>
            ))}
          </div>
          {searchError && <p className="booth-error" role="alert">{searchError}</p>}
          {searching && !results.length && <p className="booth-hint">Loading videos...</p>}
          {results.length > 0 && (
            <ul className="booth-ytgrid" aria-label="YouTube results">
              {results.map(item => {
                const current = item.id === playingResult?.id && ytInfo.loaded
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`booth-ytcard${current ? ' is-current' : ''}`}
                      onClick={() => playResult(item)}
                      disabled={!ytReady}
                      aria-label={`Play ${item.title}`}
                      aria-current={current || undefined}
                    >
                      <span className="booth-ytcard__thumb">
                        {item.thumb && <img src={item.thumb} alt="" loading="lazy" />}
                        <span className="booth-ytcard__overlay" aria-hidden="true">
                          <Icon name={current && ytInfo.playing ? 'pause' : 'play'} size={30} />
                        </span>
                        {current && <span className="booth-ytcard__badge">Now playing</span>}
                        {item.live ? (
                          <span className="booth-ytcard__time is-live">LIVE</span>
                        ) : (
                          item.durationSec > 0 && <span className="booth-ytcard__time">{formatTime(item.durationSec)}</span>
                        )}
                      </span>
                      <span className="booth-ytcard__text">
                        <span className="booth-ytcard__title">{item.title}</span>
                        <span className="booth-ytcard__channel">{item.channel}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="booth-music__body">
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
        {urlError && <p className="booth-error" role="alert">{urlError}</p>}
        {!ytReady && <p className="booth-hint">Start the session to load YouTube.</p>}
        {ytReady && !ytInfo.loaded && <p className="booth-hint">Pick a video above, or paste a link and press Load.</p>}
      </div>
    </section>
  )
}
