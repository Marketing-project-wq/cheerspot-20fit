import AdminLogin from '../admin/AdminLogin.jsx'

import { useT } from '../../lib/i18n.jsx'

// Sign-in page for the DJ Booth: the shared staff login with DJ wording. "Remember me" starts off,
// so a shared booth laptop asks for the login again once the browser closes.
const COPY = {
  id: { title: 'DJ Booth', sub: 'Masuk untuk memutar musik dan cheer penonton.' },
  en: { title: 'DJ Booth', sub: 'Sign in to play the music and the crowd’s cheers.' },
}

const SUPER_NOTE = {
  id: { text: 'Browser ini masih masuk sebagai superadmin.', action: 'Buka booth sebagai superadmin' },
  en: { text: 'This browser is still signed in as superadmin.', action: 'Open the booth as superadmin' },
}

export default function DjLogin({ onSuccess, superadminSignedIn, onContinue }) {
  const { lang } = useT()
  const note = superadminSignedIn ? { ...(SUPER_NOTE[lang] || SUPER_NOTE.id), onAction: onContinue } : null
  return <AdminLogin onSuccess={onSuccess} copy={COPY} rememberDefault={false} notice={note} />
}
