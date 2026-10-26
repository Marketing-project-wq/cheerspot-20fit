import { EXP_MS, EXPIRY_SOON_MS, fmt, pad } from './copy.js'
import { IconPlay } from './icons.jsx'

export default function QueuePanel({ c, queue, fresh, nowTs, onPlay }) {
  return (
    <section className="dj-card dj-queue">
      <div className="dj-queue__head">
        <span className="dj-queue__title">{c.next}</span>
        <span className="dj-count">{queue.length}</span>
        <span className="dj-queue__note">{c.expNote}</span>
      </div>
      <div className="dj-queue__list">
        {queue.map((q, i) => {
          const left = EXP_MS - (nowTs - q.ts)
          const isNew = fresh.has(q.id)
          const classes = ['dj-q', i === 0 && 'is-next', isNew && 'is-new'].filter(Boolean).join(' ')
          return (
            <div key={q.id} className={classes}>
              <span className="dj-q__n">{pad(i + 1)}</span>
              <div className="dj-q__body">
                {isNew && <span className="dj-badge">{c.new}</span>}
                <div className="dj-q__name">{q.athlete}</div>
                <div className="dj-q__meta">
                  {c.from} {q.sender} · {fmt(q.dur)}
                  {left < EXPIRY_SOON_MS && (
                    <span className="dj-q__exp"> · {c.expIn(Math.max(1, Math.ceil(left / 60000)))}</span>
                  )}
                </div>
              </div>
              <button type="button" className="dj-q__play" onClick={() => onPlay(q)} aria-label={c.ariaPlayNow}>
                <IconPlay size={20} />
              </button>
            </div>
          )
        })}
        {queue.length === 0 && <div className="dj-empty">{c.empty}</div>}
      </div>
    </section>
  )
}
