import AdminLogin from '../admin/AdminLogin.jsx'

// Sign-in page for the DJ Booth: the shared staff login with DJ wording.
const COPY = {
  id: { title: 'DJ Booth', sub: 'Masuk untuk memutar musik dan cheer penonton.' },
  en: { title: 'DJ Booth', sub: 'Sign in to play the music and the crowd’s cheers.' },
}

export default function DjLogin({ onSuccess }) {
  return <AdminLogin onSuccess={onSuccess} copy={COPY} />
}
