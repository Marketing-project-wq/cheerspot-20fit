import { hm } from './copy.js'
import { IconSpeaker } from './icons.jsx'

export default function DjHeader({ c, auto, autoLeft, toggleAuto, newCount, vol, setVol, nowTs }) {
  return (
    <header className="dj-header">
      <img src="/assets/hero.png" alt={c.logoAlt} className="dj-logo" />
      <span className="dj-tag">ADMIN</span>
      <div className={newCount ? 'dj-live is-new' : 'dj-live'}>
        <span className="dj-live__dot" />
        <span>{newCount ? `+${newCount} ${c.newCheer}` : c.live}</span>
      </div>
      <div className="dj-spacer" />
      <button type="button" className="dj-auto" onClick={toggleAuto} aria-label={c.ariaAuto} aria-pressed={auto}>
        <span className={auto ? 'dj-switch is-on' : 'dj-switch'}>
          <span className="dj-switch__knob" />
        </span>
        <span className="dj-auto__label">AUTO-PLAY</span>
        {auto && <span className="dj-auto__time">{autoLeft}</span>}
      </button>
      {/* The slider sets this page's audio level only. Choosing a Bluetooth or sound-card output
          is not in the design and the browser does not offer it here. */}
      <div className="dj-vol">
        <IconSpeaker />
        <input
          type="range"
          min="0"
          max="100"
          value={vol}
          onChange={e => setVol(Number(e.target.value))}
          aria-label={c.ariaVolume}
          className="dj-vol__range"
        />
        <span className="dj-vol__txt">{vol}%</span>
      </div>
      <span className="dj-clock">{hm(nowTs)}</span>
      <div className="dj-user">
        <span className="dj-avatar">AD</span>
        <div className="dj-user__text">
          <span className="dj-user__name">Admin</span>
          <span className="dj-user__role">ADMIN</span>
        </div>
      </div>
    </header>
  )
}
