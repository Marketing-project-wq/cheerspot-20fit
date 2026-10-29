import { useEffect, useMemo, useState } from 'react'
import { getCheerStatus } from '../../lib/cheers.js'
import { COPY, STATUS } from './copy.js'

// Anonymous visitors cannot read cheers, only ask for a status by id, so this polls.
const POLL_MS = 5000
// Nothing changes after these. A deleted cheer comes back as null.
const FINAL = new Set(['played', 'rejected', null])

// Live status of cheers sent from this phone: { id, athlete, ts }[], newest first.
export default function CheerStatus({ lang, cheers: all, limit = all.length, title = true }) {
  const cheers = useMemo(() => all.slice(0, limit), [all, limit])
  const [statuses, setStatuses] = useState({})

  useEffect(() => {
    let alive = true
    const known = {}
    const check = () => {
      if (document.visibilityState === 'hidden') return
      cheers
        .filter(c => !(c.id in known) || !FINAL.has(known[c.id]))
        .forEach(c =>
          getCheerStatus(c.id)
            .then(status => {
              known[c.id] = status ?? null
              if (alive) setStatuses(s => ({ ...s, [c.id]: status ?? null }))
            })
            .catch(() => {}),
        )
    }
    check()
    const timer = setInterval(check, POLL_MS)
    document.addEventListener('visibilitychange', check)
    return () => {
      alive = false
      clearInterval(timer)
      document.removeEventListener('visibilitychange', check)
    }
  }, [cheers])

  if (!cheers.length) return null

  return (
    <section className="cz-status" aria-live="polite">
      {title && <h2 className="cz-field-label">{COPY.statusTitle[lang]}</h2>}
      <ul className="cz-status-list">
        {cheers.map(c => {
          const key = c.id in statuses ? (statuses[c.id] ?? 'missing') : 'checking'
          const label = (STATUS[key] || STATUS.checking)[lang]
          return (
            <li key={c.id} className={`cz-status-row is-${key}`}>
              <span className="cz-status-dot" aria-hidden="true" />
              <span className="cz-status-text">
                <span className="cz-status-for">
                  {COPY.statusFor[lang]} <strong>{c.athlete}</strong>
                </span>
                <span className="cz-status-label">{label}</span>
              </span>
            </li>
          )
        })}
      </ul>
      <p className="cz-status-note">{COPY.statusNote[lang]}</p>
    </section>
  )
}
