// Brand mark and language switch shared by the login and dashboard.
import { LOGO_ALT, LOGO_URL } from '../../lib/brand.js'

export function Logo({ className = '' }) {
  return <img src={LOGO_URL} alt={LOGO_ALT} className={`adm-logo ${className}`} />
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
