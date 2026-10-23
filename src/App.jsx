import { Route, Routes } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import Cheer from './pages/Cheer.jsx'
import Admin from './pages/Admin.jsx'
import Dj from './pages/Dj.jsx'

export default function App() {
  return (
    <div className="min-h-dvh bg-neutral-950 text-neutral-100">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/cheer" element={<Cheer />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/dj" element={<Dj />} />
      </Routes>
    </div>
  )
}
