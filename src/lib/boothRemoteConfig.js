// Every fixed value for controlling the DJ booth (/dj) from /admin in one place.
// Commands go through the cheerspot_booth_commands table (insert: superadmin only, by RLS); the booth
// picks them up, claims each one through cheerspot_booth_claim_command, then runs it. The booth's
// status comes back over a public Realtime Broadcast channel: read-only, no names (only cheer ids,
// which /admin turns into names from the cheers it already reads).

export const BOOTH_REMOTE = {
  table: 'cheerspot_booth_commands',
  claimRpc: 'cheerspot_booth_claim_command',

  // Must match the check constraint in the migration.
  commands: {
    setMode: 'set_mode',
    playNext: 'play_next',
    pause: 'pause',
    resume: 'resume',
    stop: 'stop',
    skip: 'skip',
    replay: 'replay',
    duckerTest: 'ducker_test',
    duckerRestoreNow: 'ducker_restore_now',
  },
  // What the booth records after a claim. 'stale' is set by the server.
  results: { ok: 'ok', noop: 'noop', notFound: 'not_found', stale: 'stale' },
  modes: ['auto', 'manual'],

  // A command older than this (server clock) is not run, so a refresh never replays old commands.
  maxAgeSec: 30,
  // The booth also polls for commands, in case Realtime misses one. Newest first, at most this many.
  pollMs: 3000,
  pollLimit: 20,
  // Command ids the booth has already handled, kept in memory so Realtime and the poll never run one twice.
  seenLimit: 500,

  // Booth status, broadcast on a public channel.
  statusChannel: 'cheerspot-booth-status',
  statusEvent: 'status',
  statusVersion: 1,
  statusEveryMs: 2000,
  // A booth counts as online while its last status is at most this old.
  onlineWithinMs: 6000,
  // One id per /dj tab, kept across a refresh of that tab.
  boothIdKey: 'cheerspot.booth.id',
  // The booth's mode survives a refresh.
  modeKey: 'cheerspot.booth.mode',

  // /admin: recent commands shown with their outcome, and how long a command may wait for the booth.
  historyLimit: 10,
  historyPollMs: 3000,
  resultWaitMs: 10000,
  // Recently played cheers listed for Replay.
  playedLimit: 10,
  // How often /admin re-checks online/offline and the remaining time.
  uiTickMs: 1000,
}

// Short label for the booth's toast when it runs an admin command, e.g. "Admin: Skip".
export const BOOTH_COMMAND_LABELS = {
  set_mode: 'Mode',
  play_next: 'Play next',
  pause: 'Pause',
  resume: 'Resume',
  stop: 'Stop',
  skip: 'Skip',
  replay: 'Replay',
  ducker_test: 'Test ducking',
  ducker_restore_now: 'Restore volume',
}
