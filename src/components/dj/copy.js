// Copy and timing for the DJ booth. Kept here so src/locales/*.json stays untouched.
export const POLL_MS = 15000
export const GAP_SEC = 5
export const AUTO_MS = 30 * 60000
export const FRESH_MS = 9000

export const pad = n => String(n).padStart(2, '0')

export const hm = ts => {
  const d = new Date(ts)
  return pad(d.getHours()) + ':' + pad(d.getMinutes())
}

export const fmt = s => {
  const v = Math.max(0, Math.floor(s || 0))
  return Math.floor(v / 60) + ':' + pad(v % 60)
}

export const COPY = {
  id: {
    logoAlt: '20FIT Event',
    ariaAuto: 'Auto-play',
    ariaVolume: 'Volume',
    ariaPlayNow: 'Putar sekarang',
    ariaReplay: 'Putar ulang',
    logout: 'Keluar',
    ariaClose: 'Tutup',
    live: 'LIVE',
    newCheer: 'cheer baru',
    from: 'dari',
    sec: 'DTK',
    replay: 'ULANG',
    skip: 'LEWATI',
    play: 'PUTAR',
    pause: 'JEDA',
    next: 'BERIKUTNYA',
    new: 'BARU',
    empty: 'Belum ada cheer. Cheer yang disetujui admin muncul di sini otomatis.',
    played: 'SUDAH DIPUTAR',
    nowPlaying: 'NOW PLAYING',
    paused: 'DIJEDA',
    standby: 'SIAGA',
    autoIn: 'DIPUTAR OTOMATIS DALAM',
    pressPlay: 'TEKAN PUTAR UNTUK MULAI',
    qEmpty: 'ANTREAN KOSONG',
    waitCheer: 'Menunggu cheer',
    autoEnded: 'Auto-play mati otomatis setelah 30 menit. Nyalakan lagi untuk lanjut.',
    autoAgain: 'Nyalakan lagi',
    // Not in the design: shown only when a save or an audio load fails.
    saveError: 'Gagal menyimpan. Coba lagi.',
    audioError: 'Audio tidak bisa diputar. Tekan putar untuk coba lagi.',
  },
  en: {
    logoAlt: '20FIT Event',
    ariaAuto: 'Auto-play',
    ariaVolume: 'Volume',
    ariaPlayNow: 'Play now',
    ariaReplay: 'Play again',
    logout: 'Log out',
    ariaClose: 'Close',
    live: 'LIVE',
    newCheer: 'new cheers',
    from: 'from',
    sec: 'SEC',
    replay: 'REPLAY',
    skip: 'SKIP',
    play: 'PLAY',
    pause: 'PAUSE',
    next: 'UP NEXT',
    new: 'NEW',
    empty: 'No cheers yet. Cheers approved by admin appear here automatically.',
    played: 'PLAYED',
    nowPlaying: 'NOW PLAYING',
    paused: 'PAUSED',
    standby: 'STANDBY',
    autoIn: 'AUTO-PLAYING IN',
    pressPlay: 'PRESS PLAY TO START',
    qEmpty: 'QUEUE EMPTY',
    waitCheer: 'Waiting for cheers',
    autoEnded: 'Auto-play turned off after 30 minutes. Turn it on again to continue.',
    autoAgain: 'Turn on again',
    saveError: 'Could not save. Try again.',
    audioError: 'Audio could not play. Press play to try again.',
  },
}
