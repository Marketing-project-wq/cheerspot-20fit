import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useT } from '../lib/i18n.jsx'
import useCheerFlow from '../components/cheer/useCheerFlow.js'
import { Header, Hero } from '../components/cheer/Hero.jsx'
import Form from '../components/cheer/Form.jsx'
import { IdleStage, RecordingStage, PreviewStage, UploadingStage, ErrorStage } from '../components/cheer/Stages.jsx'
import SuccessScreen from '../components/cheer/SuccessScreen.jsx'
import CheerStatus from '../components/cheer/CheerStatus.jsx'
import { COPY } from '../components/cheer/copy.js'
import { ShieldIcon } from '../components/cheer/icons.jsx'
import { browserUrl, isInApp } from '../lib/inApp.js'
import '../components/cheer/cheer.css'

export default function Cheer() {
  const { lang: appLang } = useT()
  const lang = appLang === 'en' ? 'en' : 'id'

  useEffect(() => {
    document.title = 'Send a Cheer · CheerSpot'
  }, [])

  // In the my20fit app webview the recorder (and its mic request) is never mounted.
  return isInApp() ? <OpenInBrowser lang={lang} /> : <Recorder lang={lang} />
}

// /cheer inside the my20fit app: no mic here, so offer to continue in the phone's browser.
// Keeps this page's query (e.g. ?event= from a venue QR) on the browser link.
function OpenInBrowser({ lang }) {
  const { pathname, search } = useLocation()
  return (
    <div className="cz-app">
      <Header lang={lang} />
      <Hero lang={lang} />
      <div className="cz-stage">
        <div className="cz-idle cz-rise">
          <a href={browserUrl(pathname + search)} className="cz-s-cta cz-inapp-cta">
            {COPY.inAppCta[lang]}
            <span aria-hidden="true">→</span>
          </a>
          <div className="cz-muted cz-inapp-note">{COPY.inAppNote.id}</div>
        </div>
      </div>
      <div className="cz-privacy">
        <ShieldIcon />
        <span>{COPY.privacy[lang]}</span>
      </div>
    </div>
  )
}

function Recorder({ lang }) {
  const f = useCheerFlow({ lang })

  if (f.s === 'success') {
    return <SuccessScreen lang={lang} athlete={f.athlete} sent={f.sent} onAgain={f.again} />
  }

  let stage
  switch (f.s) {
    case 'recording':
      stage = <RecordingStage lang={lang} left={f.left} levels={f.levels} onStop={f.stopRec} />
      break
    case 'preview':
      stage = (
        <PreviewStage
          lang={lang}
          dur={f.dur}
          pos={f.pos}
          playing={f.playing}
          heard={f.heard}
          err={f.err}
          onToggle={f.togglePlay}
          onSeek={f.seek}
          onRedo={f.redo}
          onSend={f.send}
        />
      )
      break
    case 'uploading':
      stage = <UploadingStage lang={lang} prog={f.prog} />
      break
    case 'error':
      stage = <ErrorStage lang={lang} errKind={f.errKind} tries={f.tries} platform={f.platform} onRetry={f.retry} />
      break
    default:
      stage = <IdleStage lang={lang} micReady={f.micReady} onPointerDown={f.recDown} onClick={f.startRec} />
  }

  return (
    <div className="cz-app">
      <Header lang={lang} />
      <Hero lang={lang} />
      <Form
        lang={lang}
        name={f.name}
        onName={f.setName}
        athlete={f.athlete}
        onAthlete={f.setAthlete}
        hasError={!!f.err}
      />
      <div className="cz-stage">{stage}</div>
      {f.s === 'idle' && <CheerStatus lang={lang} cheers={f.sent} />}
      <div className="cz-privacy">
        <ShieldIcon />
        <span>{COPY.privacy[lang]}</span>
      </div>
    </div>
  )
}
