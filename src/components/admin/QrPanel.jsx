import { QR_CELLS } from './data.js'
import { STRINGS } from './strings.js'
import { Logo } from './shared.jsx'

export default function QrPanel({ lang, eventName, copied, onCopy }) {
  const S = STRINGS[lang] || STRINGS.id
  return (
    <div className="adm-page adm-page--list">
      <header className="adm-list__head">
        <h1 className="adm-title">{S.qrTitle}</h1>
        <p className="adm-sub">{S.qrSub}</p>
      </header>

      <div className="adm-qr">
        <div className="adm-qr__poster">
          <Logo className="adm-logo--qr" />
          <div className="adm-qr__event">{eventName}</div>
          <div className="adm-qr__grid">
            {QR_CELLS.map((on, i) => (
              <span key={i} className={on ? 'adm-qr__cell is-on' : 'adm-qr__cell'} />
            ))}
          </div>
          <div className="adm-qr__scan">{S.scan}</div>
        </div>

        <div className="adm-qr__side">
          <div className="adm-qr__linkbox">
            <span className="adm-label">{S.link}</span>
            <div className="adm-qr__linkrow">
              <div className="adm-qr__url">cheer.20fit.id/hyrox-vol3</div>
              <button type="button" className="adm-btn-dark" onClick={onCopy}>
                {copied ? S.copied : S.copy}
              </button>
            </div>
          </div>
          <div className="adm-qr__actions">
            <button type="button" className="adm-btn-red">
              {S.dl}
            </button>
            <button type="button" className="adm-btn-outline-lg">
              {S.print}
            </button>
          </div>
          <p className="adm-qr__note">{S.qrNote}</p>
        </div>
      </div>
    </div>
  )
}
