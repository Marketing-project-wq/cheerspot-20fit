import { useEffect, useState } from 'react'

function matchesNow(query) {
  try {
    return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(query).matches
  } catch {
    return false
  }
}

export default function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => matchesNow(query))

  useEffect(() => {
    let mql
    try {
      mql = window.matchMedia(query)
    } catch {
      return undefined
    }
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener?.('change', onChange)
    return () => mql.removeEventListener?.('change', onChange)
  }, [query])

  return matches
}
