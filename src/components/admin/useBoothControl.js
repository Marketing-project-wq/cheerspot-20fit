import { useCallback, useEffect, useMemo, useState } from 'react'
import { BOOTH_REMOTE as R } from '../../lib/boothRemoteConfig.js'
import { fetchRecentCommands, sendCommand, watchBoothStatus, watchCommandChanges } from '../../lib/boothRemote.js'

// /admin side of the booth remote control: every booth's live status (public broadcast, read-only),
// the command log with outcomes, and sending commands (a table insert only a superadmin may make).
export default function useBoothControl() {
  // boothId -> { status, seenAt }. seenAt is this device's clock, so clock drift between devices does not matter.
  const [booths, setBooths] = useState({})
  const [now, setNow] = useState(() => Date.now())
  const [history, setHistory] = useState([])
  const [sending, setSending] = useState(null)
  // The last command sent from here: { id?, type, at, error? }.
  const [last, setLast] = useState(null)

  useEffect(
    () =>
      watchBoothStatus(status => {
        setBooths(list => ({ ...list, [status.boothId]: { status, seenAt: Date.now() } }))
      }),
    [],
  )

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), R.uiTickMs)
    return () => clearInterval(timer)
  }, [])

  const refresh = useCallback(() => {
    fetchRecentCommands()
      .then(setHistory)
      .catch(err => console.warn('[booth-remote] could not read the command log', err?.message))
  }, [])

  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, R.historyPollMs)
    const unwatch = watchCommandChanges(refresh)
    return () => {
      clearInterval(timer)
      unwatch()
    }
  }, [refresh])

  const send = useCallback(
    async (type, payload = {}) => {
      setSending(type)
      try {
        const row = await sendCommand(type, payload)
        setLast({ id: row.id, type, at: Date.now() })
        setHistory(list => [row, ...list.filter(x => x.id !== row.id)].slice(0, R.historyLimit))
      } catch (err) {
        setLast({ type, at: Date.now(), error: err?.message || 'error' })
      } finally {
        setSending(null)
        refresh()
      }
    },
    [refresh],
  )

  // Booths heard from recently, newest first. The first one is the one shown.
  const online = useMemo(
    () =>
      Object.values(booths)
        .filter(b => now - b.seenAt <= R.onlineWithinMs)
        .sort((a, b) => b.seenAt - a.seenAt),
    [booths, now],
  )
  const latest = useMemo(() => Object.values(booths).sort((a, b) => b.seenAt - a.seenAt)[0] || null, [booths])

  return { online, latest, now, history, sending, last, send }
}
