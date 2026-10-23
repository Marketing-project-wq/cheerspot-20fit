import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLogin from '../components/admin/AdminLogin.jsx'
import ModerationDashboard from '../components/admin/ModerationDashboard.jsx'
import '../components/admin/admin.css'

export default function Admin() {
  const navigate = useNavigate()
  const [session, setSession] = useState(null)

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
  }

  return (
    <div className="adm-root">
      {session ? (
        <ModerationDashboard adminName="Admin 20FIT" onLogout={() => setSession(null)} />
      ) : (
        <AdminLogin onSuccess={handleLogin} />
      )}
    </div>
  )
}
