import { fmt } from './copy.js'
import { IconPause, IconPlay, IconReplay, IconSkip } from './icons.jsx'

// Decorative bars from the design. The audio is not analysed, so the bars only show progress.
const waveBars = id =>
  Array.from({ length: 60 }, (_, i) =>
    Math.round(12 + 88 * Math.abs(Math.sin(i * 0.77 + id * 1.9) * Math.cos(i * 0.29 + id * 0.6))),
  )

export default function NowPlaying({ c, now, playing, pos, dur, gapLeft, next, loadError, onToggle, onSkip, onReplay }) {
  const isPlaying = Boolean(now) && playing
  const frac = now && dur ? pos / dur : 0
  const bars = waveBars(now ? now.id : 0)

  let label = c.standby
  if (now) label = playing ? c.nowPlaying : c.paused
  else if (gapLeft != null) label = c.next

  return (
    <section className="dj-card dj-now">
      <div className="dj-now__label">
        <div className={isPlaying ? 'dj-eq is-on' : 'dj-eq'} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <span className="dj-now__title">{label}</span>
      </div>

      <div className="dj-stage">
        {now ? (
          <>
            <div className="dj-now__from">
              {c.from} <strong>{now.sender}</strong>
            </div>
            <div className="dj-now__name">{now.athlete}</div>
            {now.text && <p className="dj-now__text">“{now.text}”</p>}
            {loadError && <p className="dj-error">{c.audioError}</p>}
          </>
        ) : (
          <>
            <div className="dj-wait__label">{gapLeft != null ? c.autoIn : next ? c.pressPlay : c.qEmpty}</div>
            <div className="dj-wait__name">{next ? next.athlete : c.waitCheer}</div>
            {gapLeft != null && (
              <div className="dj-wait__gap">
                {gapLeft} {c.sec}
              </div>
            )}
          </>
        )}
      </div>

      <div className="dj-wave-wrap">
        <div className="dj-wave">
          {bars.map((h, i) => (
            <span
              key={i}
              style={{
                height: `${now ? h : Math.round(h * 0.3)}%`,
                background: (i + 0.5) / 60 <= frac ? '#BF0000' : '#33332F',
              }}
            />
          ))}
        </div>
        <div className="dj-times">
          <span>{fmt(pos)}</span>
          <span>{now ? fmt(dur) : '0:00'}</span>
        </div>
      </div>

      <div className="dj-controls">
        <button type="button" className="dj-ctrl" onClick={onReplay}>
          <span className="dj-ctrl__ring">
            <IconReplay />
          </span>
          <span className="dj-ctrl__text">{c.replay}</span>
        </button>
        <button type="button" className="dj-ctrl" onClick={onToggle}>
          <span className="dj-ctrl__disc">{isPlaying ? <IconPause /> : <IconPlay />}</span>
          <span className="dj-ctrl__text">{isPlaying ? c.pause : c.play}</span>
        </button>
        <button type="button" className="dj-ctrl" onClick={onSkip}>
          <span className="dj-ctrl__ring">
            <IconSkip />
          </span>
          <span className="dj-ctrl__text">{c.skip}</span>
        </button>
      </div>
    </section>
  )
}
