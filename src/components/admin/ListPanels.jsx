import { fmt, hm, pad } from './data.js'
import { STRINGS } from './strings.js'

// Delete button for queue and history rows. Asks first: the voice note is removed for good.
function DeleteButton({ m, x, S }) {
  const onClick = () => {
    if (window.confirm(S.delConfirm.replace('{sender}', x.sender).replace('{athlete}', x.athlete))) m.removeCheer(x.id)
  }
  return (
    <button type="button" className="adm-del" aria-label={S.del} title={S.del} onClick={onClick}>
      ×
    </button>
  )
}

function ListHeader({ title, sub }) {
  return (
    <header className="adm-list__head">
      <h1 className="adm-title">{title}</h1>
      <p className="adm-sub">{sub}</p>
    </header>
  )
}

export function QueuePanel({ m, lang }) {
  const S = STRINGS[lang] || STRINGS.id
  const queue = m.items.filter(x => x.status === 'approved').sort((a, b) => a.ts - b.ts)
  return (
    <div className="adm-page adm-page--list">
      <ListHeader title={`${S.queueTitle} · ${queue.length}`} sub={S.queueSub} />
      <div className="adm-list">
        {queue.map((x, i) => (
          <div key={x.id} className="adm-row">
            <span className="adm-row__index">{pad(i + 1)}</span>
            <div className="adm-row__who">
              <span className="adm-label">{S.forAth}</span>
              <span className="adm-row__athlete">{x.athlete}</span>
              <span className="adm-row__from">
                {S.from} {x.sender}
              </span>
            </div>
            <p className="adm-row__quote">“{x.text}”</p>
            <span className="adm-dur">{fmt(x.dur)}</span>
            <button type="button" className="adm-btn-outline" onClick={() => m.pullBack(x.id)}>
              {S.pullBack}
            </button>
            <DeleteButton m={m} x={x} S={S} />
          </div>
        ))}
        {queue.length === 0 && <p className="adm-list__empty">{S.queueEmpty}</p>}
      </div>
    </div>
  )
}

export function HistoryPanel({ m, lang }) {
  const S = STRINGS[lang] || STRINGS.id
  const played = m.items.filter(x => x.status === 'played')
  return (
    <div className="adm-page adm-page--list">
      <ListHeader title={`${S.histTitle} · ${played.length}`} sub={S.histSub} />
      <div className="adm-list">
        {played.map(x => (
          <div key={x.id} className="adm-row">
            <span className="adm-row__index adm-row__index--time" title={S.sentAt}>{hm(x.ts)}</span>
            <div className="adm-row__who">
              <span className="adm-label">{S.forAth}</span>
              <span className="adm-row__athlete">{x.athlete}</span>
              <span className="adm-row__from">
                {S.from} {x.sender}
              </span>
            </div>
            <p className="adm-row__quote">“{x.text}”</p>
            <button type="button" className="adm-btn-play" onClick={() => m.requeue(x.id)}>
              {S.playAgain}
            </button>
            <DeleteButton m={m} x={x} S={S} />
          </div>
        ))}
        {played.length === 0 && <p className="adm-list__empty">{S.histEmpty}</p>}
      </div>
    </div>
  )
}
