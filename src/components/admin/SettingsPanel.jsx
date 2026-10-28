import { MAX_DURS } from './data.js'
import { pick, STRINGS, TOGGLES } from './strings.js'

const WORD_GROUPS = [
  { level: 'high', title: 'wordsHigh', sub: 'wordsHighSub' },
  { level: 'medium', title: 'wordsMedium', sub: 'wordsMediumSub' },
  { level: 'low', title: 'wordsLow', sub: 'wordsLowSub' },
]

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
            <span className="adm-settings__title">{S.evList}</span>
            <span className="adm-settings__sub">{S.evSubNew}</span>
          </div>
          {m.events.length === 0 && <span className="adm-settings__sub">{S.evEmpty}</span>}
          <ul className="adm-events">
            {m.events.map(name => {
              const on = name === m.eventName
              return (
                <li key={name} className={`adm-events__row${on ? ' is-on' : ''}`}>
                  <span className="adm-events__name">{name}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={`${name}: ${on ? S.evOn : S.evOff}`}
                    className="adm-events__toggle"
                    onClick={() => m.toggleEvent(name)}
                  >
                    <span className="adm-events__state">{on ? S.evOn : S.evOff}</span>
                    <span className={`adm-switch${on ? ' is-on' : ''}`}>
                      <span className="adm-switch__knob" />
                    </span>
                  </button>
                  <button
                    type="button"
                    className="adm-events__remove"
                    aria-label={`${S.evRemove}: ${name}`}
                    title={S.evRemove}
                    onClick={() => m.removeEvent(name)}
                  >
                    ×
                  </button>
                </li>
              )
            })}
          </ul>
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
          {WORD_GROUPS.map(g => (
            <div key={g.level} className="adm-words__group">
              <div className="adm-words__head">
                {S[g.title]} ({m.words[g.level].length})<span>{S[g.sub]}</span>
              </div>
              <div className={`adm-chips adm-chips--${g.level}`}>
                {m.words[g.level].map(w => (
                  <button key={w} type="button" className="adm-chip" onClick={() => m.removeWord(g.level, w)}>
                    {w}
                    <span className="adm-chip__x">×</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="adm-add">
            <select
              className="adm-input-plain adm-words__level"
              aria-label={S.words}
              value={m.wordLevel}
              onChange={e => m.setWordLevel(e.target.value)}
            >
              {WORD_GROUPS.map(g => (
                <option key={g.level} value={g.level}>
                  {S[g.title]}
                </option>
              ))}
            </select>
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
          <button type="button" className="adm-link adm-words__reset" onClick={m.resetWords}>
            {S.wordsReset}
          </button>
        </div>
      </div>
    </div>
  )
}
