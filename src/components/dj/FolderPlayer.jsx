import { useRef } from 'react'
import { formatTime, Icon } from './boothParts.jsx'

// Music folder: the DJ picks a folder of songs on this laptop and plays it here.
// MusicPlayer owns the player (so only one music source plays at a time); this panel shows the folder,
// the deck and the song list.
export default function FolderPlayer({ info, onPick, onPlayTrack, onToggle, onPrevious, onNext, onShuffle, onSeek }) {
  const inputRef = useRef(null)
  const { folder, tracks, current, playing, time, duration, shuffle } = info
  const hasTracks = tracks.length > 0
  const track = current >= 0 ? tracks[current] : null

  const pick = event => {
    const files = event.target.files
    if (files?.length) onPick(files)
    // Lets the same folder be picked again after a refresh of its contents.
    event.target.value = ''
  }

  return (
    <div className="booth-folder">
      <input
        ref={inputRef}
        type="file"
        className="booth-folder__input"
        // Picks a whole folder (all browsers on a laptop). Its songs are read here, never uploaded.
        webkitdirectory=""
        directory=""
        multiple
        onChange={pick}
        tabIndex={-1}
        aria-hidden="true"
      />

      <div className="booth-folder__pick">
        <button
          type="button"
          className={`booth-btn${hasTracks ? '' : ' booth-btn--primary'}`}
          onClick={() => inputRef.current?.click()}
        >
          {hasTracks ? 'Change folder' : 'Choose music folder'}
        </button>
        {hasTracks && (
          <span className="booth-folder__name">
            {folder || 'Music folder'} · {tracks.length} {tracks.length === 1 ? 'song' : 'songs'}
          </span>
        )}
      </div>

      {!hasTracks && (
        <p className="booth-hint">
          Pick the folder with the event&apos;s music on this laptop. Every song in it plays in order, then starts again
          from the top. Songs stay on this laptop and are not uploaded. After a page refresh, pick the folder again.
        </p>
      )}

      {hasTracks && (
        <>
          <div className="booth-deck">
            <div className="booth-now-track" aria-live="polite">
              <span className="booth-now-track__label">Now playing</span>
              <span className="booth-now-track__title">{track ? track.title : 'Press Play to start the folder'}</span>
              {track && (
                <span className="booth-now-track__meta">
                  Song {current + 1} of {tracks.length}
                </span>
              )}
            </div>

            <label className="booth-folder__progress">
              <span className="booth-folder__time">{formatTime(time)}</span>
              <input
                type="range"
                min={0}
                max={Math.max(1, Math.floor(duration))}
                step={1}
                value={Math.min(Math.floor(time), Math.max(1, Math.floor(duration)))}
                onChange={event => onSeek(Number(event.target.value))}
                disabled={!track || !duration}
                aria-label="Position in song"
              />
              <span className="booth-folder__time">{formatTime(duration)}</span>
            </label>

            <div className="booth-transport">
              <button type="button" className="booth-btn booth-btn--icon" onClick={onPrevious} aria-label="Previous song">
                <Icon name="previous" />
              </button>
              <button
                type="button"
                className="booth-btn booth-btn--primary booth-btn--icon"
                onClick={onToggle}
                aria-label={playing ? 'Pause music' : 'Play music'}
              >
                <Icon name={playing ? 'pause' : 'play'} size={26} />
              </button>
              <button type="button" className="booth-btn booth-btn--icon" onClick={onNext} aria-label="Next song">
                <Icon name="next" />
              </button>
              <button
                type="button"
                className="booth-btn booth-btn--icon"
                onClick={onShuffle}
                aria-pressed={shuffle}
                aria-label={shuffle ? 'Shuffle on' : 'Shuffle off'}
              >
                <Icon name="shuffle" />
              </button>
            </div>
          </div>

          <ol className="booth-folder__list" aria-label="Songs in the folder">
            {tracks.map((item, i) => {
              const isCurrent = i === current
              return (
                <li key={item.path}>
                  <button
                    type="button"
                    className={`booth-folder__song${isCurrent ? ' is-current' : ''}`}
                    onClick={() => onPlayTrack(i)}
                    aria-current={isCurrent || undefined}
                    aria-label={`Play ${item.title}`}
                  >
                    <span className="booth-folder__num" aria-hidden="true">
                      {isCurrent && playing ? <Icon name="volume" size={16} /> : i + 1}
                    </span>
                    <span className="booth-folder__title">{item.title}</span>
                  </button>
                </li>
              )
            })}
          </ol>
        </>
      )}
    </div>
  )
}
