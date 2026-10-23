import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLogin from '../components/admin/AdminLogin.jsx'
import ModerationDashboard from '../components/admin/ModerationDashboard.jsx'
import { readSaved, saveValue } from '../components/admin/storage.js'
import '../components/admin/admin.css'

const SESSION_KEY = 'cz-admin-session'

export default function Admin() {
  const navigate = useNavigate()
  // Restored from sessionStorage so a refresh keeps the superadmin signed in.
  const [session, setSession] = useState(() => readSaved(SESSION_KEY, null))

  useEffect(() => {
    document.title = 'Admin · CheerSpot'
  }, [])

  // The design sends the admin role to the DJ Booth and the superadmin role to moderation.
  const handleLogin = role => {
    if (role === 'admin') {
      navigate('/dj')
      return
    }
    setSession({ role })
    saveValue(SESSION_KEY, { role })
  }

  const handleLogout = () => {
    setSession(null)
    saveValue(SESSION_KEY, null)
  }

  return (
    <div className="adm-root">
      {session ? (
        <ModerationDashboard adminName="Admin 20FIT" onLogout={handleLogout} />
      ) : (
        <AdminLogin onSuccess={handleLogin} />
      )}
    </div>
  )
}
