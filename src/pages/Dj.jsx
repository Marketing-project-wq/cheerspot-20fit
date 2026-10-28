import { useEffect, useState } from 'react'
import CheerBooth from '../components/dj/CheerBooth.jsx'
import DjLogin from '../components/dj/DjLogin.jsx'
import { getSession, onSessionChange, signOut, staffRole, takeHandoff } from '../lib/auth.js'
import '../components/admin/admin.css'

// Remembers, for this tab, that staff signed in on /dj, so a refresh stays in the booth.
const ENTERED_KEY = 'cz-dj-entered'

function readEntered() {
  try {
    return sessionStorage.getItem(ENTERED_KEY) === '1'
  } catch {
    return false
  }
}

function writeEntered(value) {
  try {
    if (value) sessionStorage.setItem(ENTERED_KEY, '1')
    else sessionStorage.removeItem(ENTERED_KEY)
  } catch {
    // Storage blocked: the booth still works, a refresh just asks to sign in again.
  }
}

export default function Dj() {
  // undefined = still checking the saved session, null = not signed in as staff.
  const [role, setRole] = useState(undefined)
  // A superadmin session left over from /admin does not open the booth by itself: the login page
  // shows first. Signing in on this page opens the booth for any staff role, also after a refresh.
  const [entered, setEntered] = useState(readEntered)

  useEffect(() => {
    document.title = 'DJ Booth · CheerSpot'
  }, [])

  useEffect(() => {
    let alive = true
    // A broken saved session counts as signed out, so the page never stays blank.
    // A DJ who signed in on /admin arrives with a handed-over session and goes straight in.
    takeHandoff()
      .catch(() => false)
      .then(handed => {
        if (handed) {
          writeEntered(true)
          if (alive) setEntered(true)
        }
        return getSession()
      })
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
    writeEntered(false)
    setRole(null)
    setEntered(false)
  }

  const handleLogin = nextRole => {
    writeEntered(true)
    setRole(nextRole)
    setEntered(true)
  }

  if (role === undefined) return null
  // DJ accounts with a remembered session go straight in; everyone else sees the DJ sign-in page.
  if (!role || (role === 'superadmin' && !entered)) {
    return (
      <div className="adm-root">
        <DjLogin onSuccess={handleLogin} />
      </div>
    )
  }

  return <CheerBooth onLogout={handleLogout} />
}
