import { useEffect } from 'react'
import { useT } from '../lib/i18n.jsx'
import useCheerFlow from '../components/cheer/useCheerFlow.js'
import { Header, Hero } from '../components/cheer/Hero.jsx'
import Form from '../components/cheer/Form.jsx'
import { IdleStage, RecordingStage, PreviewStage, UploadingStage, ErrorStage } from '../components/cheer/Stages.jsx'
import SuccessScreen from '../components/cheer/SuccessScreen.jsx'
import CheerStatus from '../components/cheer/CheerStatus.jsx'
import { COPY } from '../components/cheer/copy.js'
import { ShieldIcon } from '../components/cheer/icons.jsx'
import '../components/cheer/cheer.css'

export default function Cheer() {
  const { lang: appLang } = useT()
  const lang = appLang === 'en' ? 'en' : 'id'
  const f = useCheerFlow({ lang })

  useEffect(() => {
    document.title = 'Send a Cheer · CheerSpot'
  }, [])

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
