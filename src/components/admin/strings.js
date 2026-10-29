// Admin copy, taken verbatim from the login and superadmin designs. Each entry is [id, en].

export const pick = (pair, lang) => (lang === 'en' ? pair[1] : pair[0])

const COPY = {
  // Login
  title: ['Masuk', 'Sign in'],
  sub: ['Khusus panitia 20FIT Event.', '20FIT Event staff only.'],
  roleLbl: ['MASUK SEBAGAI', 'SIGN IN AS'],
  emailLbl: ['USERNAME / EMAIL', 'USERNAME / EMAIL'],
  userPh: ['username atau email', 'username or email'],
  passLbl: ['KATA SANDI', 'PASSWORD'],
  forgot: ['Lupa kata sandi?', 'Forgot password?'],
  showPass: ['Tampilkan kata sandi', 'Show password'],
  remember: ['Ingat saya di perangkat ini', 'Remember me on this device'],
  login: ['Masuk', 'Sign in'],
  loading: ['Memeriksa…', 'Checking…'],
  secure: ['Sesi otomatis berakhir setelah 12 jam tidak aktif.', 'Sessions end automatically after 12 hours of inactivity.'],
  errEmpty: ['Isi username dan kata sandi dulu.', 'Enter your username and password.'],
  errEmail: ['Format email belum benar.', 'That email doesn’t look right.'],
  errWrong: ['Username atau kata sandi salah. Coba lagi.', 'Wrong username or password. Try again.'],
  forgotInfo: ['Hubungi Superadmin event untuk reset kata sandi.', 'Contact the event Superadmin to reset your password.'],

  // Moderation shell
  logout: ['Keluar', 'Log out'],
  del: ['Hapus cheer', 'Delete cheer'],
  sentAt: ['Waktu dikirim', 'Sent at'],
  gapTitle: ['Jeda antar cheer (AUTO)', 'Gap between cheers (AUTO)'],
  gapSub: ['Waktu tunggu booth DJ sebelum memutar cheer berikutnya. Tersimpan untuk semua perangkat.', 'How long the DJ booth waits before the next cheer. Saved for every device.'],
  delConfirm: ['Hapus cheer dari {sender} untuk {athlete}? Voice note dan transkripnya ikut terhapus permanen.', 'Delete the cheer from {sender} for {athlete}? The voice note and transcript are removed for good.'],
  role: ['SUPER ADMIN', 'SUPER ADMIN'],
  shortcuts: ['PINTASAN', 'SHORTCUTS'],
  scSelect: ['Pilih kartu', 'Select card'],
  scListen: ['Dengar audio', 'Listen'],
  scYes: ['Yes · terima', 'Yes · approve'],
  scNo: ['No · tolak', 'No · reject'],
  undo: ['Urungkan', 'Undo'],
  space: ['SPASI', 'SPACE'],
  newest: ['Terbaru di atas · live', 'Newest first · live'],
  search: ['Cari atlet / pengirim', 'Search athlete / sender'],
  flagged: ['kata kasar ditandai · cek audio dulu', 'offensive words flagged · check audio first'],
  flaggedHigh: ['kata kasar berat ditandai · cek audio dulu', 'severe words flagged · check audio first'],
  isNew: ['BARU', 'NEW'],
  sender: ['PENGIRIM', 'SENDER'],
  forAth: ['UNTUK ATLET', 'FOR ATHLETE'],
  transcribing: ['Mentranskrip audio…', 'Transcribing audio…'],
  yesAfter: ['Yes aktif setelah transkrip siap', 'Yes unlocks once the transcript is ready'],
  reasonHdr: ['Alasan ditolak · dikirim ke pengirim', 'Rejection reason · sent to sender'],
  cancel: ['Batal', 'Cancel'],
  restore: ['Kembalikan ke review', 'Back to review'],
  allClear: ['Semua beres', 'All clear'],
  emptySub: ['Tidak ada cheer di sini. Cheer baru akan muncul otomatis.', 'No cheers here. New cheers appear automatically.'],
  queueTitle: ['Antrean DJ', 'DJ queue'],
  queueSub: ['Cheer yang sudah di-Yes, urut sesuai waktu disetujui. DJ memutar dari atas.', 'Approved cheers in approval order. The DJ plays from the top.'],
  from: ['dari', 'from'],
  pullBack: ['Tarik ke review', 'Pull back to review'],
  queueEmpty: ['Antrean kosong. Cheer yang di-Yes muncul di sini.', 'Queue is empty. Approved cheers appear here.'],
  histTitle: ['Riwayat putar', 'Play history'],
  histSub: ['Cheer yang sudah diputar DJ di arena.', 'Cheers the DJ has played in the arena.'],
  playAgain: ['Putar lagi', 'Play again'],
  histEmpty: ['Belum ada cheer yang diputar.', 'No cheers played yet.'],
  qrTitle: ['QR Code venue', 'Venue QR code'],
  qrSub: ['Pasang di area penonton. Pengunjung scan untuk membuka halaman Cheer.', 'Place it in the spectator area. Visitors scan it to open the Cheer page.'],
  scan: ['SCAN & SEND A CHEER!', 'SCAN & SEND A CHEER!'],
  link: ['LINK HALAMAN CHEER', 'CHEER PAGE LINK'],
  copy: ['Salin', 'Copy'],
  copied: ['Tersalin', 'Copied'],
  dl: ['Unduh PNG', 'Download PNG'],
  print: ['Cetak poster A4', 'Print A4 poster'],
  qrNote: ['QR ini berubah otomatis mengikuti nama event di Pengaturan.', 'This QR updates automatically with the event name in Settings.'],
  settings: ['Pengaturan', 'Settings'],
  setSub: ['Event, jeda AUTO, dan daftar kata tersimpan untuk semua perangkat. Tombol on/off lain tersimpan di browser ini.', 'Events, the AUTO gap and the word list are saved for every device. The other switches are saved in this browser.'],
  evAdd: ['Tambah event', 'Add event'],
  evPh: ['mis. HYROX Sportfest Vol.3', 'e.g. HYROX Sportfest Vol.3'],
  evList: ['Daftar event', 'Events'],
  evSubNew: ['Event yang aktif tampil di poster dan link QR. Hanya satu event yang bisa aktif.', 'The active event shows on the QR poster and link. Only one event can be active.'],
  evOn: ['Aktif', 'Active'],
  evOff: ['Nonaktif', 'Inactive'],
  evRemove: ['Hapus event', 'Remove event'],
  evEmpty: ['Belum ada event. Tambahkan di bawah.', 'No events yet. Add one below.'],
  evNone: ['Belum ada event aktif. Aktifkan event di Pengaturan.', 'No active event. Turn one on in Settings.'],
  words: ['Daftar kata kasar', 'Offensive word list'],
  wordsSub: [
    'Kata ini disorot di transkrip. Cocok per kata utuh, huruf diulang dan angka pengganti huruf tetap terbaca (anjiiing, g0bl0k).',
    'These words are highlighted in transcripts. Whole-word match; stretched letters and leetspeak still match (fuuuck, sh1t).',
  ],
  wordsHigh: ['Berat', 'Severe'],
  wordsHighSub: ['vulgar, seksual, hinaan SARA, ancaman · kartu ditandai merah', 'vulgar, sexual, slurs, threats · card flagged red'],
  wordsMedium: ['Sedang', 'Harsh'],
  wordsMediumSub: ['makian, hinaan · kartu ditandai oranye', 'insults, harsh words · card flagged orange'],
  wordsLow: ['Ringan', 'Mild'],
  wordsLowSub: ['sering dipakai bercanda · hanya disorot, tidak ditandai', 'often friendly · highlighted only, not flagged'],
  wordsReset: ['Kembalikan ke daftar bawaan', 'Restore the default list'],
  addPh: ['Tambah kata…', 'Add word…'],
  add: ['Tambah', 'Add'],

  // Status labels and feedback (copy from the design's script)
  stApproved: ['Disetujui · di antrean DJ', 'Approved · in DJ queue'],
  stRejected: ['Ditolak', 'Rejected'],
  stPlayed: ['Sudah diputar', 'Played'],
  stAuto: ['Otomatis · di antrean DJ', 'Auto · in DJ queue'],
  noReason: ['tanpa alasan', 'no reason'],
  justNow: ['baru saja', 'just now'],
  minAgo: [' mnt lalu', ' min ago'],
  durUnit: [' dtk', ' sec'],
  toastApproved: [
    (a) => 'Disetujui · cheer untuk ' + a + ' masuk antrean DJ',
    (a) => 'Approved · cheer for ' + a + ' added to DJ queue',
  ],
  toastRejected: [
    (s, r) => 'Ditolak · cheer dari ' + s + ': ' + r,
    (s, r) => 'Rejected · cheer from ' + s + ': ' + r,
  ],
}

const build = i => Object.fromEntries(Object.entries(COPY).map(([k, v]) => [k, v[i]]))

export const STRINGS = { id: build(0), en: build(1) }

// Superadmin-only role shown on the login screen.
export const LOGIN_ROLES = [
  { key: 'super', label: ['Superadmin', 'Superadmin'], desc: ['Moderasi cheer', 'Moderate cheers'] },
  { key: 'admin', label: ['Admin', 'Admin'], desc: ['Putar cheer', 'Play cheers'] },
]

export const REASONS = [
  { key: 'kasar', label: ['Kata kasar / tidak pantas', 'Offensive / inappropriate'] },
  { key: 'audio', label: ['Audio tidak jelas', 'Audio unclear'] },
  { key: 'spam', label: ['Promosi / spam', 'Promotion / spam'] },
  { key: 'atlet', label: ['Nama atlet tidak ditemukan', 'Athlete not found'] },
]

export const TABS = [
  { key: 'pending', label: ['Menunggu review', 'Awaiting review'], dot: '#0A0A0A' },
  { key: 'approved', label: ['Disetujui', 'Approved'], dot: '#22C55E' },
  { key: 'rejected', label: ['Ditolak', 'Rejected'], dot: '#BF0000' },
  { key: 'played', label: ['Sudah diputar', 'Played'], dot: '#85857E' },
  { key: 'all', label: ['Semua', 'All'], dot: '#3A3A36' },
]

export const NAVS = [
  { key: 'mod', label: ['Moderasi', 'Moderation'], icon: 'M4 5h16v11H8l-4 4zM8 10.5l2.5 2.5L16 8' },
  { key: 'queue', label: ['Antrean DJ', 'DJ queue'], icon: 'M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16zM12 9.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5z' },
  { key: 'hist', label: ['Riwayat putar', 'Play history'], icon: 'M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16zM12 8v4l3 2' },
  { key: 'qr', label: ['QR Code venue', 'Venue QR code'], icon: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2' },
  { key: 'dj', label: ['Akun DJ', 'DJ accounts'], icon: 'M12 4a4 4 0 1 0 0 8a4 4 0 1 0 0-8zM4 20c0-3.3 3.6-6 8-6s8 2.7 8 6' },
  { key: 'set', label: ['Pengaturan', 'Settings'], icon: 'M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6zM12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1' },
]

export const TOGGLES = [
  {
    key: 'autoFlag',
    label: ['Tandai kata kasar otomatis', 'Auto-flag offensive words'],
    desc: ['Sorot kata dari daftar di bawah pada transkrip.', 'Highlight words from the list below in transcripts.'],
  },
  {
    key: 'needTx',
    label: ['Wajib tunggu transkrip sebelum Yes', 'Require transcript before Yes'],
    desc: ['Tombol Yes nonaktif selama audio masih ditranskrip.', 'Yes is disabled while audio is still being transcribed.'],
  },
  {
    key: 'autoApprove',
    label: ['Kirim otomatis ke DJ', 'Auto-send to DJ'],
    desc: [
      'Cheer langsung masuk antrean DJ tanpa Yes, selama transkrip tidak berisi kata kasar berat atau sedang. Kata ringan tidak menahan cheer. Cheer yang ditandai tetap menunggu review. Hanya berjalan selama dashboard ini terbuka.',
      'Cheers go straight to the DJ queue without Yes, as long as the transcript has no severe or harsh words. Mild words do not hold a cheer. Flagged cheers still wait for review. Only works while this dashboard is open.',
    ],
  },
]
