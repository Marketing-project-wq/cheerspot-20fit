import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { LOGO_URL } from '../lib/brand.js'
import { browserUrl, isInApp } from '../lib/inApp.js'
import { Hero } from '../components/cheer/Hero.jsx'
import { COPY } from '../components/cheer/copy.js'
import { ShieldIcon } from '../components/cheer/icons.jsx'
import '../components/cheer/cheer.css'
import './landing.css'

// Home page for the crowd: what CheerSpot is, how it works, and one button to /cheer.
// Staff open /admin and /dj directly, so there are no staff links here.
const L = {
  cta: 'SEND A CHEER NOW',
  ctaNote: 'Free, no sign-in, right from your phone.',
  howTitle: 'HOW IT WORKS',
  steps: [
    {
      title: 'Add the names',
      body: 'Your name and the athlete you are cheering for.',
    },
    {
      title: 'Record your shout',
      body: 'A short voice note, 30 seconds max.',
    },
    {
      title: 'Hear it in the arena',
      body: 'Once checked, the DJ plays it over the sound system.',
    },
  ],
  footer: 'CheerSpot by 20FIT',
}

export default function Landing() {
  // English only on the home page, so there is no language switch.
  const lang = 'en'
  const inApp = isInApp()

  useEffect(() => {
    document.title = 'CheerSpot by 20FIT'
  }, [])

  return (
    <div className="cz-app cz-landing">
      <div className="cz-header">
        <img src={LOGO_URL} alt={COPY.ariaLogo[lang]} className="cz-logo" />
      </div>

      <Hero lang={lang} />

      <div className="cz-l-cta-wrap">
        {inApp ? (
          // Inside the my20fit app: a plain same-tab link to another host, which the app opens
          // in the phone's browser, where the mic works. No target="_blank" (broken in the iOS webview).
          <a href={browserUrl('/cheer')} className="cz-s-cta cz-l-cta">
            {L.cta}
            <span aria-hidden="true">→</span>
          </a>
        ) : (
          <Link to="/cheer" className="cz-s-cta cz-l-cta">
            {L.cta}
            <span aria-hidden="true">→</span>
          </Link>
        )}
        <p className="cz-l-note">{inApp ? COPY.inAppNote.id : L.ctaNote}</p>
      </div>

      <section className="cz-l-how" aria-labelledby="cz-l-how-title">
        <h2 id="cz-l-how-title" className="cz-l-how-title">
          <span className="cz-kicker-line" />
          {L.howTitle}
        </h2>
        <ol className="cz-l-steps">
          {L.steps.map((step, i) => (
            <li key={i} className="cz-l-step">
              <span className="cz-l-num">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <p className="cz-l-step-title">{step.title}</p>
                <p className="cz-l-step-body">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="cz-privacy">
        <ShieldIcon />
        <span>{COPY.privacy[lang]}</span>
      </div>

      <p className="cz-l-footer">{L.footer}</p>
    </div>
  )
}
