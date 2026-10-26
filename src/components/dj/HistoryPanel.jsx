import { hm } from './copy.js'
import { IconChevron, IconReplay } from './icons.jsx'

export default function HistoryPanel({ c, history, open, setOpen, onReplay }) {
  return (
    <section className="dj-card dj-hist">
      <button type="button" className="dj-hist__toggle" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="dj-hist__title">{c.played}</span>
        <span className="dj-count is-muted">{history.length}</span>
        <span className="dj-grow" />
        <span className={open ? 'dj-chev is-open' : 'dj-chev'}>
          <IconChevron />
        </span>
      </button>
      {open && (
        <div className="dj-hist__list">
          {history.map(h => (
            <div key={h.id} className="dj-h">
              {/* Time is when the DJ marked it played this session, otherwise when it was sent.
                  The table does not store a played time. */}
              <span className="dj-h__time">{hm(h.playedTs ?? h.ts)}</span>
              <div className="dj-h__body">
                <span className="dj-h__name">{h.athlete}</span>
                <span className="dj-h__meta">
                  {c.from} {h.sender}
                </span>
              </div>
              <button type="button" className="dj-h__replay" onClick={() => onReplay(h)} aria-label={c.ariaReplay}>
                <IconReplay size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
