import { COPY, ERR, PLATFORM_LABEL } from './copy.js'
import { C_REC, C_UP, MAX_SEC, PV_BARS, REC_BARS, fmt } from './format.js'
import { ArrowIcon, MicIcon, MicOffIcon, PauseIcon, PlayIcon, RedoIcon } from './icons.jsx'

// Idle: hold or tap the big button to start recording
export function IdleStage({ lang, micReady, onPointerDown, onClick }) {
  return (
    <div className="cz-idle cz-rise">
      <button
        className="cz-rec-btn"
        aria-label={COPY.ariaRecord[lang]}
        onPointerDown={onPointerDown}
        onClick={onClick}
        onContextMenu={(e) => e.preventDefault()}
      >
        <MicIcon size={56} />
        <span className="cz-rec-label">{COPY.rec[lang]}</span>
      </button>
      {micReady && (
        <div className="cz-mic-ready">
          <span className="cz-dot" />
          {COPY.micOn[lang]}
        </div>
      )}
      <div className="cz-hold">{COPY.hold[lang]}</div>
      <div className="cz-muted">{COPY.max[lang]}</div>
    </div>
  )
}

export function RecordingStage({ lang, left, levels, onStop }) {
  const ringOff = (C_REC * (1 - left / MAX_SEC)).toFixed(1)
  return (
    <div className="cz-rec">
      <div className="cz-rec-head">
        <div className="cz-rec-lbl">
          <span className="cz-rec-dot" />
          {COPY.recLbl[lang]}
        </div>
        <div className="cz-timer">{fmt(left)}</div>
      </div>
      <div className="cz-ring-wrap">
        <div className="cz-pulse" />
        <div className="cz-pulse" style={{ animationDelay: '.8s' }} />
        <svg width="260" height="260" viewBox="0 0 260 260" className="cz-ring-svg" aria-hidden="true">
          <circle cx="130" cy="130" r="124" style={{ fill: 'none', stroke: '#262624', strokeWidth: 6 }} />
          <circle
            cx="130"
            cy="130"
            r="124"
            style={{
              fill: 'none',
              stroke: '#BF0000',
              strokeWidth: 6,
              strokeLinecap: 'round',
              strokeDasharray: C_REC,
              strokeDashoffset: ringOff,
              transition: 'stroke-dashoffset 1s linear',
            }}
          />
        </svg>
        <button className="cz-stop" onClick={onStop} aria-label={COPY.ariaStop[lang]}>
          <span className="cz-stop-square" />
          <span className="cz-stop-label">STOP</span>
        </button>
      </div>
      <div className="cz-bars" aria-hidden="true">
        {levels
          ? levels.map((v, i) => (
              <div key={i} className="cz-bar" style={{ height: Math.round(6 + 50 * v), animation: 'none' }} />
            ))
          : REC_BARS.map((b, i) => (
              <div
                key={i}
                className="cz-bar"
                style={{ height: b.h, animation: 'cz-wave .9s ease-in-out infinite', animationDelay: b.d }}
              />
            ))}
      </div>
      <div className="cz-muted" style={{ fontSize: 15 }}>{COPY.shout[lang]}</div>
    </div>
  )
}

export function PreviewStage({ lang, dur, pos, playing, heard, err, onToggle, onSeek, onRedo, onSend }) {
  const frac = dur ? pos / dur : 0
  const label = playing ? COPY.pvPlaying[lang] : heard ? COPY.pvAgain[lang] : COPY.pvListen[lang]
  const time = playing || pos > 0 ? fmt(pos) + ' / ' + fmt(dur) : fmt(dur)
  return (
    <div className="cz-preview cz-rise">
      <div className="cz-pv-card">
        <div className="cz-pv-top">
          <span className="cz-pv-label" style={{ color: heard ? '#FFFFFF' : '#A3A39B' }}>{label}</span>
          <span className="cz-pv-time">{time}</span>
        </div>
        <div className="cz-pv-row">
          <button className="cz-play" onClick={onToggle} aria-label={COPY.ariaPlay[lang]}>
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>
          <div
            className="cz-wave"
            onPointerDown={(e) => {
              const b = e.currentTarget.getBoundingClientRect()
              onSeek((e.clientX - b.left) / b.width)
            }}
          >
            {PV_BARS.map((h, i) => (
              <div
                key={i}
                className="cz-wave-bar"
                style={{
                  height: h,
                  background: (i + 0.5) / PV_BARS.length <= frac ? '#BF0000' : '#55554F',
                }}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="cz-actions">
        <button className="cz-redo" onClick={onRedo}>
          <RedoIcon />
          {COPY.redo[lang]}
        </button>
        <button className="cz-send" onClick={onSend}>
          {COPY.send[lang]}
          <ArrowIcon />
        </button>
      </div>
      {err && <div className="cz-inline-err">{err}</div>}
    </div>
  )
}

export function UploadingStage({ lang, prog }) {
  const upOff = (C_UP * (1 - prog / 100)).toFixed(1)
  return (
    <div className="cz-upload">
      <div className="cz-up-ring">
        <svg width="204" height="204" viewBox="0 0 204 204" className="cz-ring-svg" aria-hidden="true">
          <circle cx="102" cy="102" r="92" style={{ fill: 'none', stroke: '#262624', strokeWidth: 10 }} />
          <circle
            cx="102"
            cy="102"
            r="92"
            style={{ fill: 'none', stroke: '#BF0000', strokeWidth: 10, strokeLinecap: 'round', strokeDasharray: C_UP, strokeDashoffset: upOff }}
          />
        </svg>
        <div className="cz-up-pct">{prog + '%'}</div>
      </div>
      <div className="cz-up-text">
        <div style={{ fontSize: 18, fontWeight: 700 }}>{COPY.sending[lang]}</div>
        <div className="cz-muted">{COPY.dontClose[lang]}</div>
      </div>
    </div>
  )
}

// Microphone or browser problem. Auto-resumes when permission is granted.
export function ErrorStage({ lang, errKind, tries, platform, onRetry }) {
  const [title, sub] = (ERR[errKind] || ERR.denied)[lang]
  const showSteps = errKind === 'denied' && tries >= 2
  const steps = {
    ios: [COPY.ios1[lang], COPY.ios2[lang]],
    android: [COPY.and1[lang], COPY.and2[lang]],
    other: [COPY.oth1[lang], COPY.oth2[lang]],
  }[platform]
  return (
    <div className="cz-err">
      <div className="cz-err-head">
        <div className="cz-err-icon">
          <MicOffIcon />
        </div>
        <div className="cz-err-text">
          <div className="cz-err-title">{title}</div>
          <div className="cz-err-sub">{sub}</div>
        </div>
      </div>
      <button className="cz-btn-red" onClick={onRetry}>{COPY.allow[lang]}</button>
      <div className="cz-watch">
        <span className="cz-watch-dot" />
        <span>{errKind === 'denied' ? COPY.watchDenied[lang] : COPY.watchOther[lang]}</span>
      </div>
      {showSteps && (
        <div className="cz-steps">
          <div className="cz-steps-title">
            {COPY.still[lang]} · {PLATFORM_LABEL[platform][lang]}
          </div>
          {steps.map((text, i) => (
            <div key={i} className="cz-step">
              <span className="cz-step-num">{i + 1}</span>
              <span className="cz-step-text">{text}</span>
            </div>
          ))}
          <div className="cz-step">
            <span className="cz-step-num">3</span>
            <span className="cz-step-text">{COPY.step3[lang]}</span>
          </div>
        </div>
      )}
    </div>
  )
}
