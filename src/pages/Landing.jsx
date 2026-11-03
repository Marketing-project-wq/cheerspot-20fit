import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '../lib/i18n.jsx'
import { LOGO_URL } from '../lib/brand.js'
import { Hero } from '../components/cheer/Hero.jsx'
import { COPY } from '../components/cheer/copy.js'
import { ShieldIcon } from '../components/cheer/icons.jsx'
import '../components/cheer/cheer.css'
import './landing.css'

// Home page for the crowd: what CheerSpot is, how it works, and one button to /cheer.
// Staff open /admin and /dj directly, so there are no staff links here.
const L = {
  cta: { id: 'KIRIM CHEER SEKARANG', en: 'SEND A CHEER NOW' },
  ctaNote: { id: 'Gratis, tanpa login, langsung dari HP.', en: 'Free, no sign-in, right from your phone.' },
  howTitle: { id: 'CARA KERJANYA', en: 'HOW IT WORKS' },
  steps: [
    {
      title: { id: 'Isi nama', en: 'Add the names' },
      body: { id: 'Nama kamu dan nama atlet yang mau kamu dukung.', en: 'Your name and the athlete you are cheering for.' },
    },
    {
      title: { id: 'Rekam teriakanmu', en: 'Record your shout' },
      body: { id: 'Voice note singkat, maksimal 30 detik.', en: 'A short voice note, 30 seconds max.' },
    },
    {
      title: { id: 'Dengar di arena', en: 'Hear it in the arena' },
      body: { id: 'Setelah dicek, DJ memutarnya lewat sound system.', en: 'Once checked, the DJ plays it over the sound system.' },
    },
  ],
  footer: { id: 'CheerSpot by 20FIT', en: 'CheerSpot by 20FIT' },
}

export default function Landing() {
  const { lang: appLang, toggleLang, t } = useT()
  const lang = appLang === 'en' ? 'en' : 'id'

  useEffect(() => {
    document.title = 'CheerSpot by 20FIT'
  }, [])

  return (
    <div className="cz-app cz-landing">
      <div className="cz-header">
        <img src={LOGO_URL} alt={COPY.ariaLogo[lang]} className="cz-logo" />
        <button type="button" className="cz-lang" onClick={toggleLang} title={t('nav.toggleTitle')}>
          {t('nav.toggleLabel')}
        </button>
      </div>

      <Hero lang={lang} />

      <div className="cz-l-cta-wrap">
        <Link to="/cheer" className="cz-s-cta cz-l-cta">
          {L.cta[lang]}
          <span aria-hidden="true">→</span>
        </Link>
        <p className="cz-l-note">{L.ctaNote[lang]}</p>
      </div>

      <section className="cz-l-how" aria-labelledby="cz-l-how-title">
        <h2 id="cz-l-how-title" className="cz-l-how-title">
          <span className="cz-kicker-line" />
          {L.howTitle[lang]}
        </h2>
        <ol className="cz-l-steps">
          {L.steps.map((step, i) => (
            <li key={i} className="cz-l-step">
              <span className="cz-l-num">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <p className="cz-l-step-title">{step.title[lang]}</p>
                <p className="cz-l-step-body">{step.body[lang]}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="cz-privacy">
        <ShieldIcon />
        <span>{COPY.privacy[lang]}</span>
      </div>

      <p className="cz-l-footer">{L.footer[lang]}</p>
    </div>
  )
}
