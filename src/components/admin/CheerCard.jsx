import { REASONS, pick, STRINGS } from './strings.js'
import { CheckIcon, Svg } from './icons.jsx'
import { fmt, hm, statusInfo, waveBars } from './data.js'
import { needsReview, scanWords } from './badWords.js'

export default function CheerCard({ x, lang, now, words, settings, focused, playing, pos, picking, actions }) {
  const S = STRINGS[lang] || STRINGS.id
  // High words flag the card red, medium orange; low words are only highlighted.
  const scan = scanWords(x.text, words)
  const marking = settings.autoFlag && !x.transcribing
  const flagged = marking && needsReview(scan)
  const segs = marking ? scan.tokens : [{ t: x.text, level: null }]
  // Yes is held until the transcript is ready when that setting is on.
  const waiting = x.transcribing && settings.needTx
  const isPending = x.status === 'pending'
  const frac = playing && x.dur ? pos / x.dur : 0
  const status = statusInfo(x, lang)
  const mins = (now - x.ts) / 60000
  const ago = mins < 1 ? S.justNow : Math.floor(mins) + S.minAgo
  const canRestore = x.status === 'approved' || x.status === 'rejected'

  const stop = fn => e => {
    e.stopPropagation()
    fn()
  }

  const cls = ['adm-card', flagged && 'is-flagged', flagged && `is-flag-${scan.level}`, focused && 'is-focused', x.isNew && 'is-new']
    .filter(Boolean)
    .join(' ')

  return (
    <article className={cls} onClick={actions.onFocus}>
      {flagged && (
        <div className={`adm-card__flag is-${scan.level}`}>
          <Svg size={14} strokeWidth={2.4} stroke="currentColor">
            <path d="M12 3L2 20h20z" />
            <path d="M12 10v4" />
            <path d="M12 17v.5" />
          </Svg>
          <span>
            {scan.hits.filter(h => h.level !== 'low').length} {scan.level === 'high' ? S.flaggedHigh : S.flagged}
          </span>
        </div>
      )}

      <div className="adm-card__main">
        <div className="adm-card__meta">
          {x.isNew && <span className="adm-badge-new">{S.isNew}</span>}
          <span className="adm-card__time">
            {hm(x.ts)} · {ago}
          </span>
          <span className="adm-card__spacer" />
          <span className="adm-dur">{fmt(x.dur)}</span>
          <button type="button" className="adm-del" aria-label={S.del} title={S.del} onClick={stop(actions.onDelete)}>
            ×
          </button>
        </div>

        <div className="adm-card__people">
          <div>
            <span className="adm-label">{S.sender}</span>
            <span className="adm-card__sender">{x.sender}</span>
          </div>
          <div>
            <span className="adm-label">{S.forAth}</span>
            <span className="adm-card__athlete">{x.athlete}</span>
          </div>
        </div>
      </div>

      <div className="adm-card__body">
        {x.transcribing ? (
          <div className="adm-transcribing">
            <div className="adm-transcribing__label">
              <span className="adm-spin-dark" />
              {S.transcribing}
            </div>
            <div className="adm-shim" style={{ width: '92%' }} />
            <div className="adm-shim" style={{ width: '64%', animationDelay: '.2s' }} />
          </div>
        ) : (
          <p className="adm-card__quote">
            “
            {segs.map((g, i) =>
              g.level ? (
                <mark key={i} className={`adm-mark is-${g.level}`}>
                  {g.t}
                </mark>
              ) : (
                <span key={i}>{g.t}</span>
              ),
            )}
            ”
          </p>
        )}

        <div className="adm-player">
          <button type="button" className="adm-player__btn" aria-label="Dengarkan audio" onClick={stop(actions.onPlay)}>
            {playing ? (
              <Svg size={15} fill="currentColor" stroke="none">
                <rect x="5" y="4" width="5" height="16" rx="1" />
                <rect x="14" y="4" width="5" height="16" rx="1" />
              </Svg>
            ) : (
              <Svg size={16} fill="currentColor" stroke="none">
                <path d="M7 4.5v15l13-7.5z" />
              </Svg>
            )}
          </button>
          <div className="adm-wave">
            {waveBars(x.id).map((h, i) => (
              <div
                key={i}
                className="adm-wave__bar"
                style={{ height: h, background: (i + 0.5) / 56 <= frac ? '#0A0A0A' : '#C4C4BC' }}
              />
            ))}
          </div>
          <span className="adm-player__time">{playing ? fmt(pos) + ' / ' + fmt(x.dur) : fmt(x.dur)}</span>
        </div>
      </div>

      <div className="adm-card__actions">
        {isPending && (
          <>
            <button
              type="button"
              className={`adm-btn-yes${waiting ? ' is-wait' : ''}`}
              disabled={waiting}
              onClick={stop(actions.onApprove)}
            >
              <CheckIcon size={18} strokeWidth={3} />
              Yes
            </button>
            <button type="button" className="adm-btn-no" onClick={stop(actions.onReject)}>
              <Svg size={18} strokeWidth={3}>
                <path d="M6 6l12 12" />
                <path d="M18 6L6 18" />
              </Svg>
              No
            </button>
            {waiting && <div className="adm-card__hint">{S.yesAfter}</div>}
          </>
        )}

        {isPending && picking && (
          <div className="adm-reasons">
            <div className="adm-reasons__head">
              <span>{S.reasonHdr}</span>
              <button type="button" className="adm-btn-cancel" onClick={stop(actions.onCancelPick)}>
                {S.cancel}
              </button>
            </div>
            <div className="adm-reasons__grid">
              {REASONS.map((r, i) => (
                <button
                  key={r.key}
                  type="button"
                  className="adm-reason"
                  onClick={e => {
                    e.stopPropagation()
                    actions.onReason(r.key)
                  }}
                >
                  <span className="adm-reason__key">{i + 1}</span>
                  {pick(r.label, lang)}
                </button>
              ))}
            </div>
          </div>
        )}

        {!isPending && (
          <>
            <div className="adm-status" style={{ background: status.bg, color: status.fg }}>
              <span className="adm-status__dot" />
              <span className="adm-status__label">{status.label}</span>
            </div>
            {canRestore && (
              <button type="button" className="adm-restore" onClick={stop(actions.onRestore)}>
                {S.restore}
              </button>
            )}
          </>
        )}
      </div>
    </article>
  )
}
