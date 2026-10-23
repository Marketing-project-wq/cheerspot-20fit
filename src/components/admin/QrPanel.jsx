import { useMemo } from 'react'
import QRCode from 'qrcode'
import { cheerUrl } from './data.js'
import { STRINGS } from './strings.js'
import { Logo } from './shared.jsx'

export default function QrPanel({ lang, eventName, copied, onCopy }) {
  const S = STRINGS[lang] || STRINGS.id
  const url = cheerUrl()

  // Real QR matrix for the cheer link; recomputed only when the link changes.
  const qr = useMemo(() => QRCode.create(url, { errorCorrectionLevel: 'M' }), [url])
  const size = qr.modules.size

  const download = async () => {
    const dataUrl = await QRCode.toDataURL(url, { width: 1024, margin: 2, errorCorrectionLevel: 'M' })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = 'cheerspot-qr.png'
    a.click()
  }

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
          <div className="adm-qr__grid" style={{ '--qr-n': size }}>
            {Array.from(qr.modules.data, (on, i) => (
              <span key={i} className={on ? 'adm-qr__cell is-on' : 'adm-qr__cell'} />
            ))}
          </div>
          <div className="adm-qr__scan">{S.scan}</div>
        </div>

        <div className="adm-qr__side">
          <div className="adm-qr__linkbox">
            <span className="adm-label">{S.link}</span>
            <div className="adm-qr__linkrow">
              <div className="adm-qr__url">{url}</div>
              <button type="button" className="adm-btn-dark" onClick={onCopy}>
                {copied ? S.copied : S.copy}
              </button>
            </div>
          </div>
          <div className="adm-qr__actions">
            <button type="button" className="adm-btn-red" onClick={download}>
              {S.dl}
            </button>
            <button type="button" className="adm-btn-outline-lg" onClick={() => window.print()}>
              {S.print}
            </button>
          </div>
          <p className="adm-qr__note">{S.qrNote}</p>
        </div>
      </div>
    </div>
  )
}
