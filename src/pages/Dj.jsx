import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getSession, onSessionChange, staffRole } from '../lib/auth.js'
import DjBooth from '../components/dj/DjBooth.jsx'

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

  if (role === undefined) return null
  if (!role) return <Navigate to="/admin" replace />

  return <DjBooth />
}
