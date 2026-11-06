import { BOOTH_REMOTE as R } from '../../lib/boothRemoteConfig.js'
import { AUTO_GAP_CHOICES } from '../../lib/settings.js'
import { fmt, hm } from './data.js'
import { STRINGS } from './strings.js'
import useBoothControl from './useBoothControl.js'

const C = R.commands

// Outcome of a command for the log: done, no effect, not found, expired, waiting, or never picked up.
function outcome(row, sentAt, now, S) {
  if (row.result === R.results.ok) return { text: S.boothResOk, tone: 'ok' }
  if (row.result === R.results.noop) return { text: S.boothResNoop, tone: 'muted' }
  if (row.result === R.results.notFound) return { text: S.boothResNotFound, tone: 'warn' }
  if (row.result === R.results.stale) return { text: S.boothResStale, tone: 'warn' }
  const at = sentAt ?? Date.parse(row.created_at)
  return now - at > R.resultWaitMs ? { text: S.boothResLost, tone: 'warn' } : { text: S.boothResWaiting, tone: 'muted' }
}

function commandLabel(row, S, nameOf) {
  const base = S[`boothCmd_${row.type}`] || row.type
  if (row.type === C.setMode) return `${base}: ${String(row.payload?.mode || '').toUpperCase()}`
  if (row.type === C.replay) return `${base}: ${nameOf(row.payload?.cheerId) || '–'}`
  return base
}

// Booth control for the superadmin, made for one hand on a phone: status on top, big buttons below.
export default function BoothControlPanel({ m, lang }) {
  const S = STRINGS[lang] || STRINGS.id
  const b = useBoothControl()
  const booth = b.online[0] || null
  const st = booth?.status || null
  const isOnline = !!booth
  const many = b.online.length > 1

  const byId = new Map(m.items.map(x => [x.id, x]))
  const nameOf = id => byId.get(id)?.athlete || ''
  const current = st?.cheerId ? byId.get(st.cheerId) : null

  // Time left, counted on from the last status while the cheer plays.
  let left = 0
  if (st?.cheerId && st.duration) {
    const moved = st.paused || st.phase !== 'cheer' ? 0 : (b.now - booth.seenAt) / 1000
    left = Math.max(0, st.duration - st.position - moved)
  }

  const busy = !!b.sending
  const can = isOnline && !busy
  const manual = st?.mode === 'manual'
  const played = m.items
    .filter(x => x.status === 'played')
    .sort((a, c) => c.ts - a.ts)
    .slice(0, R.playedLimit)

  const ducker = st?.ducker
  let duckerText = S.boothDuckerOff
  if (ducker?.online) {
    duckerText = ducker.ready ? S.boothDuckerOn : S.boothDuckerNotReady
    if (ducker.ducked != null) duckerText += ` · ${ducker.ducked ? S.boothMusicDucked : S.boothMusicNormal}`
  }

  const lastRow = b.last?.id ? b.history.find(x => x.id === b.last.id) : null
  let lastText = null
  if (b.last?.error) lastText = { text: S.boothSendFailed.replace('{e}', b.last.error), tone: 'warn' }
  else if (b.last?.id) {
    const res = lastRow ? outcome(lastRow, b.last.at, b.now, S) : { text: S.boothSent, tone: 'muted' }
    lastText = { text: `${S[`boothCmd_${b.last.type}`] || b.last.type}: ${res.text}`, tone: res.tone }
  }

  return (
    <div className="adm-page adm-booth">
      <header className="adm-list__head">
        <h1 className="adm-title">{S.boothTitle}</h1>
        <p className="adm-sub">{S.boothSub}</p>
      </header>

      {/* Status first: what the booth is doing right now. */}
      <section className={`adm-booth__status${isOnline ? ' is-online' : ''}`} aria-live="polite">
        <div className="adm-booth__line">
          <span className={`adm-booth__dot${isOnline ? ' is-on' : ''}`} />
          <strong>{isOnline ? S.boothOnline : S.boothOffline}</strong>
          {!isOnline && b.latest && (
            <span className="adm-booth__muted">
              · {S.boothLastSeen.replace('{s}', Math.round((b.now - b.latest.seenAt) / 1000))}
            </span>
          )}
        </div>
        {!isOnline && !b.latest && <p className="adm-booth__muted">{S.boothNever}</p>}
        {many && <p className="adm-booth__alert">{S.boothMany.replace('{n}', b.online.length)}</p>}
        {isOnline && st.needsTap && <p className="adm-booth__alert">{S.boothNeedsTap}</p>}

        {isOnline && (
          <>
            <div className="adm-booth__now">
              <span className="adm-label">{S.boothNow}</span>
              {st.cheerId ? (
                <>
                  <span className="adm-booth__athlete">
                    {current?.athlete || '–'}
                    {st.paused && <span className="adm-booth__tag">{S.boothPausedTag}</span>}
                  </span>
                  {current && (
                    <span className="adm-booth__muted">
                      {S.from} {current.sender}
                    </span>
                  )}
                  <span className="adm-booth__time">{S.boothLeft.replace('{t}', fmt(left))}</span>
                </>
              ) : (
                <span className="adm-booth__muted">{st.busy ? S.boothLoading : S.boothNothing}</span>
              )}
            </div>
            <div className="adm-booth__facts">
              <span>
                <span className="adm-label">{S.boothQueue}</span> <strong>{st.queueCount}</strong>
              </span>
              <span>
                <span className="adm-label">{S.boothDucker}</span> {duckerText}
              </span>
            </div>
          </>
        )}
      </section>

      {/* Mode */}
      <section className="adm-booth__block">
        <span className="adm-label">{S.boothMode}</span>
        <div className="adm-booth__seg" role="group" aria-label={S.boothMode}>
          {R.modes.map(mode => {
            const on = st?.mode === mode
            return (
              <button
                key={mode}
                type="button"
                aria-pressed={on}
                className={`adm-booth__segbtn${on ? ' is-on' : ''}`}
                disabled={!can || on}
                onClick={() => b.send(C.setMode, { mode })}
              >
                {mode.toUpperCase()}
              </button>
            )
          })}
        </div>
      </section>

      {/* Playback */}
      <section className="adm-booth__block">
        <div className="adm-booth__grid">
          <button
            type="button"
            className="adm-booth__btn is-primary is-wide"
            disabled={!can || !st?.queueCount}
            onClick={() => b.send(C.playNext)}
          >
            {manual ? S.boothPlayNext : S.boothPlayNextNow}
          </button>
          <button
            type="button"
            className="adm-booth__btn"
            disabled={!can || !st?.cheerId}
            onClick={() => b.send(st?.paused ? C.resume : C.pause)}
          >
            {st?.paused ? S.boothResume : S.boothPause}
          </button>
          <button type="button" className="adm-booth__btn" disabled={!can || !st?.cheerId} onClick={() => b.send(C.skip)}>
            {S.boothSkip}
          </button>
          <button
            type="button"
            className="adm-booth__btn is-danger is-wide"
            disabled={!can || !(st?.cheerId || st?.busy)}
            onClick={() => b.send(C.stop)}
          >
            {S.boothStop}
          </button>
        </div>
        <p className="adm-booth__hint">{S.boothStopHint}</p>
        {lastText && <p className={`adm-booth__result is-${lastText.tone}`}>{lastText.text}</p>}
      </section>

      {/* Ducker, through the booth */}
      <section className="adm-booth__block">
        <div className="adm-booth__grid">
          <button type="button" className="adm-booth__btn" disabled={!can || !ducker?.online} onClick={() => b.send(C.duckerTest)}>
            {S.boothDuckerTest}
          </button>
          <button
            type="button"
            className="adm-booth__btn"
            disabled={!can || !ducker?.connected}
            onClick={() => b.send(C.duckerRestoreNow)}
          >
            {S.boothDuckerRestore}
          </button>
        </div>
      </section>

      {/* AUTO gap: the same shared setting as on the Settings page. */}
      <section className="adm-booth__block">
        <span className="adm-settings__title">{S.gapTitle}</span>
        <span className="adm-settings__sub">{S.gapSub}</span>
        <div className="adm-booth__gaps">
          {AUTO_GAP_CHOICES.map(sec => {
            const on = m.autoGap === sec
            return (
              <button
                key={sec}
                type="button"
                aria-pressed={on}
                className={`adm-booth__gap${on ? ' is-on' : ''}`}
                onClick={() => m.setAutoGap(sec)}
              >
                {sec + S.durUnit}
              </button>
            )
          })}
        </div>
      </section>

      {/* Replay */}
      <section className="adm-booth__block">
        <span className="adm-label">{S.boothPlayed}</span>
        {played.length === 0 && <p className="adm-booth__muted">{S.histEmpty}</p>}
        <ul className="adm-booth__list">
          {played.map(x => (
            <li key={x.id} className="adm-booth__row">
              <div className="adm-booth__who">
                <span className="adm-booth__name">{x.athlete}</span>
                <span className="adm-booth__muted">
                  {S.from} {x.sender}
                </span>
              </div>
              <button type="button" className="adm-booth__btn is-small" disabled={!can} onClick={() => b.send(C.replay, { cheerId: x.id })}>
                {S.boothReplay}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Command log (audit) */}
      <section className="adm-booth__block">
        <span className="adm-label">{S.boothHistory}</span>
        {b.history.length === 0 && <p className="adm-booth__muted">{S.boothHistoryEmpty}</p>}
        <ul className="adm-booth__list">
          {b.history.map(row => {
            const res = outcome(row, b.last?.id === row.id ? b.last.at : null, b.now, S)
            return (
              <li key={row.id} className="adm-booth__row">
                <div className="adm-booth__who">
                  <span className="adm-booth__name">{commandLabel(row, S, nameOf)}</span>
                  <span className="adm-booth__muted">
                    {hm(Date.parse(row.created_at))} · {row.created_by_email || '–'}
                  </span>
                </div>
                <span className={`adm-booth__badge is-${res.tone}`}>{res.text}</span>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
