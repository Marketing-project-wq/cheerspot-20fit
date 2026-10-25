import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLogin from '../components/admin/AdminLogin.jsx'
import ModerationDashboard from '../components/admin/ModerationDashboard.jsx'
import { getSession, onSessionChange, signOut, staffRole } from '../lib/auth.js'
import '../components/admin/admin.css'

export default function Admin() {
  const navigate = useNavigate()
  // undefined = still checking the saved session, null = signed out, object = staff session.
  const [role, setRole] = useState(undefined)

  useEffect(() => {
    document.title = 'Admin · CheerSpot'
  }, [])

  useEffect(() => {
    let alive = true
    getSession().then(session => {
      if (alive) setRole(staffRole(session))
    })
    const unsubscribe = onSessionChange(session => setRole(staffRole(session)))
    return () => {
      alive = false
      unsubscribe()
    }
  }, [])

  // The design sends the admin role to the DJ Booth and the superadmin role to moderation.
  const handleLogin = nextRole => {
    if (nextRole === 'admin') {
      navigate('/dj')
      return
    }
    setRole(nextRole)
  }

  const handleLogout = async () => {
    await signOut()
    setRole(null)
  }

  if (role === undefined) return null

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
