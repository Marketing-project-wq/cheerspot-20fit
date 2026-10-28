import AdminLogin from '../admin/AdminLogin.jsx'

// Landing and sign-in page for the DJ Booth. The form is the shared staff login; this adds the copy
// and a panel that explains what the booth does.
const COPY = {
  id: { title: 'Masuk DJ Booth', sub: 'Khusus DJ dan operator booth 20FIT Race Lab.' },
  en: { title: 'DJ Booth sign in', sub: 'For 20FIT Race Lab DJs and booth operators only.' },
}

const HERO = {
  id: {
    eyebrow: 'CheerSpot · DJ Booth',
    headline: ['Musik jalan.', 'Cheer terdengar.'],
    lead: 'Satu layar untuk musik dan cheer penonton. Musik turun otomatis saat cheer diputar, lalu naik lagi dengan halus.',
    features: [
      ['Musik', 'Cari dan putar YouTube, atau sambungkan mixer DJ lewat Live input.'],
      ['Cheer', 'Cheer yang sudah disetujui panitia masuk antrean dan diputar AUTO atau MANUAL.'],
      ['Ducking', 'Volume musik turun saat cheer bunyi dan tidak pernah hilang sepenuhnya.'],
    ],
    help: 'Belum punya akun? Hubungi Superadmin event.',
  },
  en: {
    eyebrow: 'CheerSpot · DJ Booth',
    headline: ['Music on.', 'Cheers heard.'],
    lead: 'One screen for the music and the crowd’s cheers. Music dips automatically while a cheer plays, then comes back smoothly.',
    features: [
      ['Music', 'Search and play YouTube, or connect the DJ mixer through Live input.'],
      ['Cheers', 'Cheers approved by the organisers join the queue and play in AUTO or MANUAL.'],
      ['Ducking', 'Music drops while a cheer plays and never goes fully silent.'],
    ],
    help: 'No account yet? Ask the event Superadmin.',
  },
}

function Hero(lang) {
  const H = HERO[lang] || HERO.id
  return (
    <section className="dj-hero" aria-label={H.eyebrow}>
      <p className="dj-hero__eyebrow">{H.eyebrow}</p>
      <h2 className="dj-hero__headline">
        {H.headline[0]}
        <br />
        <span>{H.headline[1]}</span>
      </h2>
      <p className="dj-hero__lead">{H.lead}</p>
      <ol className="dj-hero__list">
        {H.features.map(([name, text], i) => (
          <li key={name}>
            <span className="dj-hero__num" aria-hidden="true">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span>
              <strong>{name}</strong>
              {text}
            </span>
          </li>
        ))}
      </ol>
      <p className="dj-hero__help">{H.help}</p>
    </section>
  )
}

export default function DjLogin({ onSuccess }) {
  return <AdminLogin onSuccess={onSuccess} copy={COPY} hero={Hero} />
}
