import { COPY } from './copy.js'

export default function Form({ lang, name, onName, athlete, onAthlete, hasError }) {
  return (
    <div className="cz-form">
      <label className="cz-field">
        <span className="cz-field-label">{COPY.lName[lang]}</span>
        <input
          className="cz-input"
          value={name}
          onChange={(e) => onName(e.target.value)}
          placeholder={COPY.phName[lang]}
        />
      </label>
      <label className="cz-field">
        <span className="cz-field-label">{COPY.lAth[lang]}</span>
        <input
          className={'cz-input' + (hasError ? ' is-error' : '')}
          value={athlete}
          onChange={(e) => onAthlete(e.target.value)}
          placeholder={COPY.phAth[lang]}
        />
      </label>
    </div>
  )
}
