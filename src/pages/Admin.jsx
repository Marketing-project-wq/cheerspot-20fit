import { useEffect, useState } from 'react'
import AdminLogin from '../components/admin/AdminLogin.jsx'
import ModerationDashboard from '../components/admin/ModerationDashboard.jsx'
import { getSession, handOffToDj, onSessionChange, signOut, staffRole } from '../lib/auth.js'
import '../components/admin/admin.css'

export default function Admin() {
  // undefined = still checking the saved session, null = signed out, object = staff session.
  const [role, setRole] = useState(undefined)

  useEffect(() => {
    document.title = 'Admin · CheerSpot'
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

  // The design sends the admin role to the DJ Booth and the superadmin role to moderation.
  // A DJ session moves to the booth's own sign-in area, so it never replaces a superadmin's.
  useEffect(() => {
    if (role !== 'admin') return
    handOffToDj().finally(() => window.location.assign('/dj'))
  }, [role])

  const handleLogin = nextRole => setRole(nextRole)

  const handleLogout = async () => {
    await signOut()
    setRole(null)
  }

  if (role === undefined || role === 'admin') return null

  return (
    <div className="adm-root">
      {role ? (
        <ModerationDashboard adminName="Admin 20FIT" onLogout={handleLogout} />
      ) : (
        <AdminLogin onSuccess={handleLogin} />
      )}
    </div>
  )
}
