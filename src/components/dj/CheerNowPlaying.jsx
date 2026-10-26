import { formatTime, Icon } from './boothParts.jsx'

export default function CheerNowPlaying({ item, label, status, countdown, onPlayPause, onSkip, onReplay }) {
  if (!item) {
    return (
      <section className="booth-panel booth-now" aria-label="Now playing">
        <p className="booth-empty">No approved cheers in the queue.</p>
      </section>
    )
  }

  const active = status.cheerId === item.id
  const playing = active && !status.paused
  const paused = active && status.paused
  const position = active ? status.position : 0
  const duration = active ? status.duration : 0
  const progress = duration > 0 ? Math.min(100, (position / duration) * 100) : 0
  const playLabel = playing ? 'Pause' : paused ? 'Resume' : 'Play'

  return (
    <section className="booth-panel booth-now" aria-label="Now playing">
      <p className="booth-now__label">{label}</p>
      <h2 className="booth-now__athlete">{item.athlete_name}</h2>
      <p className="booth-now__bib">Bib {item.athlete_bib}</p>
      <p className="booth-now__sender">From {item.sender_name}</p>
      <blockquote className="booth-now__transcript">{item.transcript}</blockquote>

      <div
        className="booth-progress"
        role="progressbar"
        aria-label="Cheer progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
      >
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="booth-progress__times">
        <span>{formatTime(position)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      <div className="booth-now__controls">
        <button type="button" className="booth-btn booth-btn--primary booth-btn--xl" onClick={onPlayPause}>
          <Icon name={playing ? 'pause' : 'play'} size={26} />
          {playLabel}
        </button>
        <button type="button" className="booth-btn booth-btn--xl" onClick={onSkip} disabled={!active}>
          <Icon name="skip" size={22} />
          Skip
        </button>
        <button type="button" className="booth-btn booth-btn--xl" onClick={onReplay}>
          <Icon name="replay" size={22} />
          Replay
        </button>
      </div>

      {countdown && <p className="booth-countdown" aria-live="polite">{countdown}</p>}
    </section>
  )
}
