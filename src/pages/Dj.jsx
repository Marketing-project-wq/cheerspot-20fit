import { useEffect, useState } from 'react'
import CheerBooth from '../components/dj/CheerBooth.jsx'
import DjLogin from '../components/dj/DjLogin.jsx'
import { getSession, onSessionChange, signOut, staffRole } from '../lib/auth.js'
import '../components/admin/admin.css'

export default function Dj() {
  // undefined = still checking the saved session, null = not signed in as staff.
  const [role, setRole] = useState(undefined)

  useEffect(() => {
    document.title = 'DJ Booth · CheerSpot'
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

  const handleLogout = async () => {
    await signOut()
    setRole(null)
  }

  if (role === undefined) return null
  // The booth has its own landing and sign-in page. DJ (admin) and superadmin accounts both work.
  if (!role) {
    return (
      <div className="adm-root">
        <DjLogin onSuccess={setRole} />
      </div>
    )
  }

  return <CheerBooth onLogout={handleLogout} />
}
