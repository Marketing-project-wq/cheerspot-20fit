// Cheers sent from this phone, so the sender can follow their status. localStorage can be blocked
// (private mode); the page then just shows the cheer that was sent in this visit.
const KEY = 'cz-sent-cheers'
const KEEP_MS = 24 * 60 * 60 * 1000
const MAX = 10

export function readSent() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]')
    if (!Array.isArray(list)) return []
    return list.filter(c => c && typeof c.id === 'string' && Date.now() - c.ts < KEEP_MS)
  } catch {
    return []
  }
}

export function rememberSent(cheer) {
  const list = [cheer, ...readSent().filter(c => c.id !== cheer.id)].slice(0, MAX)
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    // Storage blocked: the status still shows on the success screen.
  }
  return list
}
