import { useMemo } from 'react'
import QRCode from 'qrcode'
import { cheerUrl } from './data.js'
import { STRINGS } from './strings.js'
import { Logo } from './shared.jsx'

export default function QrPanel({ lang, eventName, copied, onCopy }) {
  const S = STRINGS[lang] || STRINGS.id
  const url = cheerUrl(eventName)

  // Real QR matrix for the cheer link, drawn as one SVG path so it scales to the card's width.
  // Recomputed only when the link changes.
  const { size, path } = useMemo(() => {
    const { modules } = QRCode.create(url, { errorCorrectionLevel: 'M' })
    let d = ''
    modules.data.forEach((on, i) => {
      if (on) d += `M${i % modules.size} ${Math.floor(i / modules.size)}h1v1h-1z`
    })
    return { size: modules.size, path: d }
  }, [url])

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
          {eventName && <div className="adm-qr__event">{eventName}</div>}
          <div className="adm-qr__code">
            <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={url} shapeRendering="crispEdges">
              <path d={path} fill="#0a0a0a" />
            </svg>
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
          {!eventName && <p className="adm-qr__note">{S.evNone}</p>}
          <p className="adm-qr__note">{S.qrNote}</p>
        </div>
      </div>
    </div>
  )
}
