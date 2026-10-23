import { MAX_DURS } from './data.js'
import { pick, STRINGS, TOGGLES } from './strings.js'

export default function SettingsPanel({ m, lang }) {
  const S = STRINGS[lang] || STRINGS.id
  return (
    <div className="adm-page adm-page--list">
      <header className="adm-list__head">
        <h1 className="adm-title">{S.settings}</h1>
        <p className="adm-sub">{S.setSub}</p>
      </header>

      <div className="adm-settings">
        <div className="adm-card-plain">
          <div className="adm-settings__text">
            <span className="adm-settings__title">{S.evName}</span>
            <span className="adm-settings__sub">{S.evSub}</span>
          </div>
          <div className="adm-event-pick">
            <select
              className="adm-input-plain"
              aria-label={S.evName}
              value={m.eventName}
              onChange={e => m.setEventName(e.target.value)}
            >
              {m.events.map(name => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <div className="adm-add">
              <input
                type="text"
                className="adm-input-plain"
                aria-label={S.evAdd}
                value={m.eventIn}
                placeholder={S.evPh}
                onChange={e => m.setEventIn(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') m.addEvent()
                }}
              />
              <button type="button" className="adm-btn-dark-sm" onClick={m.addEvent}>
                {S.evAdd}
              </button>
            </div>
          </div>
        </div>

        {TOGGLES.map(t => {
          const on = !!m.settings[t.key]
          return (
            <button key={t.key} type="button" role="switch" aria-checked={on} className="adm-toggle" onClick={() => m.toggleSetting(t.key)}>
              <div className="adm-settings__text">
                <span className="adm-settings__title">{pick(t.label, lang)}</span>
                <span className="adm-settings__sub">{pick(t.desc, lang)}</span>
              </div>
              <span className={`adm-switch${on ? ' is-on' : ''}`}>
                <span className="adm-switch__knob" />
              </span>
            </button>
          )
        })}

        <div className="adm-card-plain adm-card-plain--row">
          <div className="adm-settings__text">
            <span className="adm-settings__title">{S.maxDur}</span>
            <span className="adm-settings__sub">{S.maxDurSub}</span>
          </div>
          <div className="adm-seg-plain">
            {MAX_DURS.map(d => {
              const on = m.maxDur === d
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  className={`adm-seg-plain__btn${on ? ' is-on' : ''}`}
                  onClick={() => m.setMaxDur(d)}
                >
                  {d + S.durUnit}
                </button>
              )
            })}
          </div>
        </div>

        <div className="adm-card-plain">
          <div className="adm-settings__text">
            <span className="adm-settings__title">{S.words}</span>
            <span className="adm-settings__sub">{S.wordsSub}</span>
          </div>
          <div className="adm-chips">
            {m.words.map(w => (
              <button key={w} type="button" className="adm-chip" onClick={() => m.removeWord(w)}>
                {w}
                <span className="adm-chip__x">×</span>
              </button>
            ))}
          </div>
          <div className="adm-add">
            <input
              type="text"
              className="adm-input-plain"
              aria-label={S.words}
              value={m.wordIn}
              placeholder={S.addPh}
              onChange={e => m.setWordIn(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') m.addWord()
              }}
            />
            <button type="button" className="adm-btn-dark-sm" onClick={m.addWord}>
              {S.add}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
