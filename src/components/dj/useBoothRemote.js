import { useEffect, useRef } from 'react'
import { BOOTH_COMMAND_LABELS, BOOTH_REMOTE as R } from '../../lib/boothRemoteConfig.js'
import { boothId, claimCommand, startStatusBroadcast, watchCommands } from '../../lib/boothRemote.js'
import { getDuckerState, restoreNow, testDucker } from '../../lib/ducker.js'
import { pauseCheer, resumeCheer } from '../../lib/ducking.js'

const C = R.commands
const RESULT = R.results
const log = (...args) => console.log('[booth-remote]', ...args)

// What a command does on this booth right now: the result to record, the action, and the toast.
// Every action is a function the booth's own buttons already use.
function plan(command, booth) {
  const s = booth.status
  const label = `Admin: ${BOOTH_COMMAND_LABELS[command.type] || command.type}`
  const ok = (run, text = label) => ({ result: RESULT.ok, run, text })
  const noop = { result: RESULT.noop, run: null, text: null }
  switch (command.type) {
    case C.setMode: {
      const mode = command.payload?.mode
      if (!R.modes.includes(mode)) return noop
      return mode === booth.mode ? noop : ok(() => booth.setMode(mode), `Admin: ${mode.toUpperCase()}`)
    }
    case C.playNext: {
      const next = booth.pickNext()
      return next ? ok(() => booth.playNext(), `${label} (${next.athlete_name})`) : noop
    }
    case C.pause:
      return s.cheerId && !s.paused ? ok(pauseCheer) : noop
    case C.resume:
      return s.cheerId && s.paused ? ok(resumeCheer) : noop
    case C.stop:
      return s.cheerId || s.busy || s.queued.length ? ok(booth.stop) : noop
    case C.skip:
      return s.cheerId ? ok(booth.skip) : noop
    case C.replay: {
      const item = booth.items.find(x => x.id === command.payload?.cheerId)
      if (!item) return { result: RESULT.notFound, run: null, text: `${label}: cheer not found on this booth` }
      return ok(() => booth.playItem(item), `${label} (${item.athlete_name})`)
    }
    case C.duckerTest:
      return getDuckerState().online ? ok(testDucker) : noop
    case C.duckerRestoreNow:
      return getDuckerState().connected ? ok(restoreNow) : noop
    default:
      return noop
  }
}

// What /admin sees: no names, only ids and numbers.
function statusOf(booth, id) {
  const s = booth.status
  const d = getDuckerState()
  return {
    boothId: id,
    started: booth.started,
    needsTap: !!booth.needsTap,
    mode: booth.mode,
    phase: s.phase,
    paused: s.paused,
    busy: s.busy,
    cheerId: s.cheerId,
    position: s.position,
    duration: s.duration,
    queueCount: booth.approved.length,
    ducked: s.ducked,
    ducker: {
      connected: d.connected,
      online: d.online,
      ready: d.ready,
      ducked: d.status ? !!d.status.ducked : null,
    },
  }
}

// Lets /admin control this booth. Commands run only after the booth's sound has started, and each one
// is claimed first, so it runs once even with two booths open. A failed claim or a lost command changes
// nothing: the booth keeps running in its current mode.
export default function useBoothRemote(booth) {
  const ref = useRef(booth)
  const idRef = useRef(null)
  const statusRef = useRef(null)
  if (!idRef.current) idRef.current = boothId()

  useEffect(() => {
    ref.current = booth
  })

  useEffect(() => {
    const broadcast = startStatusBroadcast(() => statusOf(ref.current, idRef.current))
    statusRef.current = broadcast
    return () => {
      broadcast.stop()
      statusRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!booth.started) return undefined
    return watchCommands(async command => {
      const step = plan(command, ref.current)
      const claim = await claimCommand(command.id, step.result, idRef.current)
      log(command.type, command.payload, '→', claim, step.result)
      if (claim !== 'claimed') return
      if (step.run) step.run()
      if (step.text) ref.current.showToast(step.text)
      // Let /admin see the effect without waiting for the next status tick.
      setTimeout(() => statusRef.current?.sendNow(), 50)
    })
  }, [booth.started])
}
