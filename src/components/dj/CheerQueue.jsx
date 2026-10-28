import { useState } from 'react'
import { Icon } from './boothParts.jsx'

// Presentational only. The booth hook passes the items and handlers in.
export default function CheerQueue({ items, queuedIds, activeId, onPlayNow, onReplay, onMoveUp, onMoveDown, onReorder, onDelete }) {
  const [dragId, setDragId] = useState(null)
  const [overId, setOverId] = useState(null)

  const approved = items.filter(item => item.status === 'approved')
  const played = items
    .filter(item => item.status === 'played')
    .sort((a, b) => (b.playedAt || 0) - (a.playedAt || 0))

  const reset = () => {
    setDragId(null)
    setOverId(null)
  }

  // Dropping onto a row places the dragged cheer on that row's slot.
  const drop = targetId => {
    if (!dragId || dragId === targetId) return
    const ids = approved.map(item => item.id)
    const from = ids.indexOf(dragId)
    const to = ids.indexOf(targetId)
    ids.splice(from, 1)
    ids.splice(from < to ? to : ids.indexOf(targetId), 0, dragId)
    onReorder(ids)
  }

  return (
    <section className="booth-panel booth-queue-panel" aria-labelledby="booth-queue-title">
      <header className="booth-panel__head">
        <h2 id="booth-queue-title">Queue</h2>
        <span className="booth-count">{approved.length} waiting</span>
      </header>

      {approved.length ? (
        <ol className="booth-queue" aria-label="Approved cheers, in play order">
          {approved.map((item, index) => {
            const queued = queuedIds.includes(item.id)
            const playing = activeId === item.id
            const rowClass = [
              'booth-queue__row',
              overId === item.id && dragId !== item.id ? 'is-drop-target' : '',
              playing ? 'is-playing' : '',
            ].join(' ')
            return (
              <li
                key={item.id}
                className={rowClass}
                onDragOver={event => {
                  event.preventDefault()
                  setOverId(item.id)
                }}
                onDragLeave={() => setOverId(current => (current === item.id ? null : current))}
                onDrop={event => {
                  event.preventDefault()
                  drop(item.id)
                  reset()
                }}
              >
                <span
                  className="booth-drag"
                  draggable="true"
                  title="Drag to reorder"
                  aria-hidden="true"
                  onDragStart={event => {
                    event.dataTransfer.effectAllowed = 'move'
                    event.dataTransfer.setData('text/plain', item.id)
                    setDragId(item.id)
                  }}
                  onDragEnd={reset}
                >
                  <Icon name="drag" size={20} />
                </span>

                <div className="booth-queue__info">
                  <p className="booth-queue__name">
                    <strong>{item.athlete_name}</strong>
                    <span className="booth-queue__meta">{item.athlete_bib ? `Bib ${item.athlete_bib} · ` : 'From '}{item.sender_name}</span>
                  </p>
                  {item.transcript ? (
                    <p className="booth-queue__text">{item.transcript}</p>
                  ) : (
                    <p className="booth-queue__text is-empty">No transcript</p>
                  )}
                  {(playing || queued) && (
                    <span className={`booth-tag${playing ? ' is-live' : ''}`}>{playing ? 'Playing' : 'Queued'}</span>
                  )}
                </div>

                <div className="booth-queue__actions">
                  <button
                    type="button"
                    className="booth-btn booth-btn--icon"
                    onClick={() => onMoveUp(item.id)}
                    disabled={index === 0}
                    aria-label={`Move ${item.athlete_name} up`}
                  >
                    <Icon name="up" />
                  </button>
                  <button
                    type="button"
                    className="booth-btn booth-btn--icon"
                    onClick={() => onMoveDown(item.id)}
                    disabled={index === approved.length - 1}
                    aria-label={`Move ${item.athlete_name} down`}
                  >
                    <Icon name="down" />
                  </button>
                  <button
                    type="button"
                    className="booth-btn"
                    onClick={() => onPlayNow(item)}
                    disabled={queued || playing}
                  >
                    Play now
                  </button>
                  <button
                    type="button"
                    className="booth-btn booth-btn--icon booth-del"
                    onClick={() => onDelete(item)}
                    disabled={queued || playing}
                    aria-label={`Delete the cheer for ${item.athlete_name}`}
                    title="Delete cheer"
                  >
                    ×
                  </button>
                </div>
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="booth-empty">No approved cheers waiting.</p>
      )}

      <section className="booth-history" aria-labelledby="booth-history-title">
        <h3 id="booth-history-title">Played</h3>
        {played.length ? (
          <ol className="booth-history__list">
            {played.map(item => (
              <li key={item.id} className="booth-history__row">
                <div className="booth-queue__info">
                  <p className="booth-queue__name">
                    <strong>{item.athlete_name}</strong>
                    <span className="booth-queue__meta">{item.athlete_bib ? `Bib ${item.athlete_bib} · ` : 'From '}{item.sender_name}</span>
                  </p>
                  {item.transcript && <p className="booth-queue__text booth-history__text">{item.transcript}</p>}
                </div>
                <div className="booth-history__actions">
                  <button type="button" className="booth-btn" onClick={() => onReplay(item)} disabled={item.id === activeId}>
                    Replay
                  </button>
                  <button
                    type="button"
                    className="booth-btn booth-btn--icon booth-del"
                    onClick={() => onDelete(item)}
                    disabled={item.id === activeId}
                    aria-label={`Delete the cheer for ${item.athlete_name}`}
                    title="Delete cheer"
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="booth-empty">Nothing played yet.</p>
        )}
      </section>
    </section>
  )
}
