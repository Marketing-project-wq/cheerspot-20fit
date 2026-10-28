import { useEffect, useState } from 'react'
import CheerBooth from '../components/dj/CheerBooth.jsx'
import DjLogin from '../components/dj/DjLogin.jsx'
import { getSession, onSessionChange, signOut, staffRole } from '../lib/auth.js'
import '../components/admin/admin.css'

export default function Dj() {
  // undefined = still checking the saved session, null = not signed in as staff.
  const [role, setRole] = useState(undefined)
  // A superadmin session left over from /admin does not open the booth by itself: the login page
  // shows first, with a link to continue. Signing in on this page opens the booth for any staff role.
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    document.title = 'DJ Booth · CheerSpot'
  }, [])

  useEffect(() => {
    let alive = true
    // A broken saved session counts as signed out, so the page never stays blank.
    getSession()
      .then(session => {
        if (alive) setRole(staffRole(session))
      })
      .catch(() => {
        if (alive) setRole(null)
      })
    const unsubscribe = onSessionChange(session => setRole(staffRole(session)))
    return () => {
      alive = false
      unsubscribe()
    }
  }, [])

  const handleLogout = async () => {
    await signOut()
    setRole(null)
    setEntered(false)
  }

  const handleLogin = nextRole => {
    setRole(nextRole)
    setEntered(true)
  }

  if (role === undefined) return null
  // DJ accounts with a remembered session go straight in; everyone else sees the DJ sign-in page.
  if (!role || (role === 'superadmin' && !entered)) {
    return (
      <div className="adm-root">
        <DjLogin onSuccess={handleLogin} superadminSignedIn={role === 'superadmin'} onContinue={() => setEntered(true)} />
      </div>
    )
  }

  return <CheerBooth onLogout={handleLogout} />
}
