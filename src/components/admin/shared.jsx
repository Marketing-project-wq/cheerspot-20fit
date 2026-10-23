// Brand mark and language switch shared by the login and dashboard.

// TODO(asset): the design points at an uploaded logo image that is not in this repo; swap in the real file.
export function Logo({ className = '' }) {
  return (
    <span className={`adm-logo ${className}`} role="img" aria-label="20FIT Event">
      <span className="adm-logo__num">20FIT</span>
      <span className="adm-logo__event">Event</span>
    </span>
  )
}

export function LangSwitch({ lang, onChange }) {
  return (
    <div className="adm-seg">
      {['id', 'en'].map(k => (
        <button
          key={k}
          type="button"
          aria-label={k === 'id' ? 'Bahasa Indonesia' : 'English'}
          aria-pressed={lang === k}
          className={`adm-seg__btn${lang === k ? ' is-on' : ''}`}
          onClick={() => onChange(k)}
        >
          {k.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
