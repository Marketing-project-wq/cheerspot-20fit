// Copy from the Cheer design. Keys map to { id, en }. Do not move these into src/locales.
export const COPY = {
  heroA: { id: 'Kaki mereka capek.', en: 'Their legs are tired.' },
  heroB: { id: 'Suaramu jangan.', en: 'Your voice isn’t.' },
  heroSub: { id: 'Rekam voice note singkat dan semangati jagoanmu, langsung di arena.', en: 'Record a quick voice note and cheer your champion on, live in the arena.' },
  lName: { id: 'NAMA KAMU', en: 'YOUR NAME' },
  phName: { id: 'mis. Rina', en: 'e.g. Rina' },
  lAth: { id: 'NAMA ATLET', en: 'ATHLETE NAME' },
  phAth: { id: 'Siapa yang kamu dukung?', en: 'Who are you cheering for?' },
  rec: { id: 'REKAM', en: 'RECORD' },
  micOn: { id: 'Mikrofon sudah aktif, tap REKAM', en: 'Mic is on, tap RECORD' },
  hold: { id: 'Tahan / Tap untuk rekam', en: 'Hold / Tap to record' },
  max: { id: 'Maksimal 30 detik', en: 'Max 30 seconds' },
  recLbl: { id: 'MEREKAM · SISA WAKTU', en: 'RECORDING · TIME LEFT' },
  shout: { id: 'Teriak yang kencang! Tap untuk berhenti.', en: 'Shout it loud! Tap to stop.' },
  pvPlaying: { id: 'MEMUTAR…', en: 'PLAYING…' },
  pvAgain: { id: 'PUTAR ULANG', en: 'PLAY AGAIN' },
  pvListen: { id: 'DENGARKAN (OPSIONAL)', en: 'LISTEN (OPTIONAL)' },
  redo: { id: 'Rekam ulang', en: 'Re-record' },
  send: { id: 'KIRIM', en: 'SEND' },
  sending: { id: 'Mengirim cheer…', en: 'Sending cheer…' },
  dontClose: { id: 'Jangan tutup halaman ini dulu ya.', en: "Don't close this page yet." },
  allow: { id: 'IZINKAN MIKROFON', en: 'ALLOW MICROPHONE' },
  still: { id: 'MASIH DIBLOKIR?', en: 'STILL BLOCKED?' },
  ios1: { id: 'Tap ikon aA di kiri address bar', en: 'Tap the aA icon on the left of the address bar' },
  ios2: { id: 'Pilih Pengaturan Situs Web, lalu ubah Mikrofon ke Izinkan', en: 'Choose Website Settings, then set Microphone to Allow' },
  and1: { id: 'Tap ikon gembok / pengaturan di samping alamat web', en: 'Tap the lock / settings icon next to the web address' },
  and2: { id: 'Buka Izin, lalu aktifkan Mikrofon', en: 'Open Permissions, then turn on Microphone' },
  oth1: { id: 'Klik ikon gembok di samping alamat web', en: 'Click the lock icon next to the web address' },
  oth2: { id: 'Ubah izin Mikrofon ke Izinkan', en: 'Set Microphone permission to Allow' },
  step3: { id: 'Kembali ke halaman ini. Kami deteksi otomatis begitu mikrofon diizinkan.', en: "Come back to this page. We'll detect it automatically once the mic is allowed." },
  privacy: { id: 'Suara kamu akan dicek dulu sebelum diputar di area publik.', en: 'Your voice will be checked before it plays in public.' },
  watchDenied: { id: 'Menunggu izin mikrofon… otomatis lanjut begitu diizinkan', en: 'Waiting for mic permission… continues automatically once allowed' },
  watchOther: { id: 'Halaman ini akan lanjut otomatis setelah masalahnya beres', en: 'This page continues automatically once fixed' },
  nameMissing: { id: 'Isi nama atlet dulu, biar DJ tahu cheer ini buat siapa.', en: 'Fill in the athlete name first.' },
  homeBack: { id: 'Kembali ke beranda', en: 'Back to home' },
  liveAt: { id: 'LIVE AT THE ARENA', en: 'LIVE AT THE ARENA' },
  ariaRecord: { id: 'Mulai rekam', en: 'Start recording' },
  ariaStop: { id: 'Stop rekam', en: 'Stop recording' },
  ariaPlay: { id: 'Putar rekaman', en: 'Play recording' },
  ariaLogo: { id: '20FIT Race Lab', en: '20FIT Race Lab' },
  statusTitle: { id: 'STATUS CHEER KAMU', en: 'YOUR CHEER STATUS' },
  statusFor: { id: 'Untuk', en: 'For' },
  statusNote: { id: 'Status update otomatis, tidak perlu refresh.', en: 'Status updates by itself, no need to refresh.' },
}

// Status of a sent cheer, as the sender sees it.
export const STATUS = {
  checking: { id: 'Mengecek status…', en: 'Checking status…' },
  pending: { id: 'Lagi dicek tim kami', en: 'Being checked by our team' },
  approved: { id: 'Lolos! Lagi antre diputar DJ', en: 'Approved! Waiting for the DJ' },
  played: { id: 'Sudah diputar di arena 🔊', en: 'Played in the arena 🔊' },
  rejected: { id: 'Belum lolos pengecekan', en: "Didn't pass the check" },
  missing: { id: 'Cheer tidak ditemukan', en: 'Cheer not found' },
}

export const PLATFORM_LABEL = {
  ios: { id: 'IPHONE · SAFARI', en: 'IPHONE · SAFARI' },
  android: { id: 'ANDROID · CHROME', en: 'ANDROID · CHROME' },
  other: { id: 'BROWSER', en: 'BROWSER' },
}

// Microphone / browser error screens, keyed by errKind
export const ERR = {
  denied: {
    id: ['Mikrofon belum diizinkan', 'Tap tombol di bawah, lalu pilih Izinkan saat browser bertanya.'],
    en: ['Microphone not allowed yet', 'Tap the button below, then choose Allow when the browser asks.'],
  },
  unsupported: {
    id: ['Browser belum didukung', 'Buka link ini di Safari (iOS 14.3 ke atas) atau Chrome, bukan dari dalam aplikasi lain.'],
    en: ['Browser not supported', 'Open this link in Safari (iOS 14.3+) or Chrome, not inside another app.'],
  },
  insecure: {
    id: ['Koneksi tidak aman', 'Rekam suara hanya bisa lewat link https://. Scan ulang QR di venue.'],
    en: ['Connection not secure', 'Voice recording only works over https://. Scan the QR at the venue again.'],
  },
}

// Success screen variants. {n} is replaced with the athlete name.
export const SUCCESS_VARIANTS = {
  1: {
    icon: 'mic',
    id: { t: 'Cheer terkirim! 🎤', b: 'Selamat, kamu resmi jadi motivator dadakan hari ini. {n} mungkin lagi ngos-ngosan, tapi berkat kamu, setidaknya dia ngos-ngosan dengan semangat!', c: 'Teriak lagi!' },
    en: { t: 'Cheer sent! 🎤', b: "Congrats, you're officially today's surprise motivator. {n} might be gasping for air, but thanks to you, at least they're gasping with spirit!", c: 'Shout again!' },
  },
  2: {
    icon: 'cup',
    id: { t: 'Boom! Terkirim! ☕🔥', b: 'Kata ilmuwan (yang nggak pernah ada), satu cheer dari orang tersayang setara dengan tiga gelas kopi dan satu gel energi. Semoga {n} langsung ngebut!', c: 'Masih ada suara? Kirim lagi' },
    en: { t: 'Boom! Sent! ☕🔥', b: 'According to scientists (who never existed), one cheer from a loved one equals three cups of coffee and an energy gel. Hope {n} speeds right up!', c: 'Got more voice? Send another' },
  },
  3: {
    icon: 'sled',
    id: { t: 'Suaramu sudah meluncur! 🛷', b: 'Lebih cepat dari sled push {n} di stasiun terakhir, tentunya. Semoga cheer kamu bikin dia lupa kalau kakinya udah kayak jeli.', c: 'Semangatin korban lainnya' },
    en: { t: 'Your voice is on the move! 🛷', b: "Faster than {n}'s sled push at the last station, obviously. Hopefully your cheer makes them forget their legs have turned to jelly.", c: 'Hype up another victim' },
  },
  4: {
    icon: 'ball',
    id: { t: 'Mic drop! 🎤', b: 'Cheer kamu sudah terbang lebih tinggi dari wall ball. Kalau nanti {n} tiba-tiba senyum di tengah burpee, kita semua tahu itu gara-gara kamu.', c: 'Satu lagi, biar makin ngebut' },
    en: { t: 'Mic drop! 🎤', b: 'Your cheer flew higher than a wall ball. If {n} suddenly smiles mid-burpee, we all know it was because of you.', c: 'One more, make them faster' },
  },
  5: {
    icon: 'medal',
    id: { t: 'Cheer terkirim! 🏆', b: 'Atletnya yang lari, kamu yang teriak. Tim yang sempurna. Kalau ada medali buat supporter terbaik, kamu udah masuk nominasi.', c: 'Teriak lagi!' },
    en: { t: 'Cheer sent! 🏆', b: "They run, you shout. The perfect team. If there were a medal for best supporter, you'd already be nominated.", c: 'Shout again!' },
  },
}

// Ticker words under the hero
export const TICKER_WORDS = ['SKI ERG', 'SLED PUSH', 'SLED PULL', 'BURPEE BROAD JUMP', 'ROWING', 'FARMERS CARRY', 'SANDBAG LUNGES', 'WALL BALLS']
