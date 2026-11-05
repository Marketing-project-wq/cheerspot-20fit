// Every fixed value for the CheerSpot Ducker link in one place. The Ducker is a menu bar app on the
// DJ's MacBook that turns rekordbox's Master Level down over MIDI. The booth talks to it over a
// Supabase Realtime Broadcast channel named after the pairing code the app shows.

// Pairing codes: 8 characters, capital letters and digits, without the look-alikes O, 0, I and 1.
const PAIR_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export const DUCKER_DEFAULTS = {
  channelPrefix: 'ducker:',
  event: 'ducker',
  protocolVersion: 1,
  clientVersion: 'cheerspot-booth-2026.11',
  // Messages the booth sends carry from 'booth'; only messages from 'ducker' are read.
  fromBooth: 'booth',
  fromDucker: 'ducker',

  pairCodeLength: 8,
  pairAlphabet: PAIR_ALPHABET,
  pairCodePattern: new RegExp(`^[${PAIR_ALPHABET}]{8}$`),

  // The booth pings every 5 s; the app sends a status every 5 s. No status for 12 s = offline.
  pingMs: 5000,
  offlineAfterMs: 12000,
  // How often the panel re-checks whether the app has gone quiet.
  uiTickMs: 1000,
  // How long the panel shows the app's last error, and a short confirmation after a button.
  errorShowMs: 60000,
  noteShowMs: 3000,
  // A duck or restore waits for the app's reply at most its fade plus this, so a cheer is never held up.
  replyGraceMs: 1500,
  // While a cheer plays or is paused, the duck is sent again this often. The app restores the music by
  // itself 45 s after the last duck, so a long pause would otherwise bring the music back mid-cheer.
  holdEveryMs: 20000,
  // Leaving the channel waits at most this long for the last restore to go out.
  leaveFlushMs: 800,

  // A skipped duck or restore with one of these reasons still counts as done.
  okSkipReasons: ['already_ducked', 'in_progress'],
  // Reasons the booth sets itself when no reply came: the app's state is unknown, so nothing changes.
  localSkipReasons: ['timeout', 'disconnected'],
  // The app's error code (or skip reason) for MIDI that is not ready: chip turns yellow, cheers go on.
  midiNotReadyCode: 'midi_not_ready',
  // The app restored the music by itself and says why. Shown in the panel for failsafeNoticeMs.
  failsafePrefix: 'failsafe_',
  failsafeReasons: {
    failsafe_booth_silent: 'booth tidak terdengar',
    failsafe_realtime_disconnected: 'koneksi realtime terputus',
    failsafe_max_duck: 'batas waktu duck tercapai',
  },
  failsafeNoticeMs: 10000,

  // MIDI CC range for calibration.
  ccMin: 0,
  ccMax: 127,
  // Starting point of the "send a value" slider before the app reports its own value.
  sendValueStart: 100,

  storageKeys: {
    pairCode: 'cheerspot.booth.duckerPairCode',
    // On while the operator wants the booth connected, so a refresh reconnects by itself.
    autoConnect: 'cheerspot.booth.duckerAutoConnect',
  },
}
