import { NAVS, pick, STRINGS } from './strings.js'
import { LogoutIcon, Svg } from './icons.jsx'
import { LangSwitch, Logo } from './shared.jsx'

function initialsOf(name) {
  return name
    .split(/\s+/)
    .map(w => (w.match(/[A-Za-zÀ-ÿ]/) || [''])[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function ShortcutRow({ label, keyLabel }) {
  return (
    <div className="adm-shortcuts__row">
      <span>{label}</span>
      <span className="adm-kbd">{keyLabel}</span>
    </div>
  )
}

export default function Sidebar({ wide, showShortcuts, lang, setLang, page, setPage, counts, adminName, onLogout }) {
  const S = STRINGS[lang] || STRINGS.id
  const name = adminName || 'Admin 20FIT'
  const avatar = (
    <span className="adm-avatar" title={`${name} · ${S.role}`}>
      {initialsOf(name)}
    </span>
  )

  return (
    <aside className={`adm-aside${wide ? ' is-wide' : ' is-narrow'}`}>
      <div className="adm-brand">
        <Logo className={wide ? 'adm-logo--side-wide' : 'adm-logo--side'} />
        {!wide && (
          <div className="adm-brand__me">
            {avatar}
            <LangSwitch lang={lang} onChange={setLang} />
            <button type="button" className="adm-logout" aria-label={S.logout} title={S.logout} onClick={onLogout}>
              <LogoutIcon />
            </button>
          </div>
        )}
      </div>

      <nav className="adm-nav" aria-label={name}>
        {NAVS.map(n => {
          const on = page === n.key
          const count = counts[n.key]
          return (
            <button
              key={n.key}
              type="button"
              className={`adm-nav__item${on ? ' is-on' : ''}`}
              aria-current={on ? 'page' : undefined}
              onClick={() => setPage(n.key)}
            >
              <Svg size={20}>
                <path d={n.icon} />
              </Svg>
              <span className="adm-nav__label">{pick(n.label, lang)}</span>
              {count != null && <span className="adm-nav__count">{count}</span>}
            </button>
          )
        })}
      </nav>

      {wide && <div className="adm-aside__spacer" />}

      {showShortcuts && (
        <div className="adm-shortcuts">
          <div className="adm-shortcuts__title">{S.shortcuts}</div>
          <ShortcutRow label={S.scSelect} keyLabel="J/K" />
          <ShortcutRow label={S.scListen} keyLabel={S.space} />
          <ShortcutRow label={S.scYes} keyLabel="A" />
          <ShortcutRow label={S.scNo} keyLabel="R" />
          <ShortcutRow label={S.undo} keyLabel="Z" />
        </div>
      )}

      {wide && (
        <div className="adm-footer">
          <div className="adm-me">
            {avatar}
            <div className="adm-me__text">
              <span className="adm-me__name">{name}</span>
              <span className="adm-me__role">{S.role}</span>
            </div>
            <button type="button" className="adm-logout" aria-label={S.logout} title={S.logout} onClick={onLogout}>
              <LogoutIcon />
            </button>
          </div>
          <LangSwitch lang={lang} onChange={setLang} />
        </div>
      )}
    </aside>
  )
}
