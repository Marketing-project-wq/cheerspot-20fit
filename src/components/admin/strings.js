// Admin copy, taken verbatim from the login and superadmin designs. Each entry is [id, en].

export const pick = (pair, lang) => (lang === 'en' ? pair[1] : pair[0])

const COPY = {
  // Login
  title: ['Masuk', 'Sign in'],
  sub: ['Khusus panitia 20FIT Event.', '20FIT Event staff only.'],
  roleLbl: ['MASUK SEBAGAI', 'SIGN IN AS'],
  emailLbl: ['USERNAME / EMAIL', 'USERNAME / EMAIL'],
  userPh: ['username atau nama@20fit.id', 'username or name@20fit.id'],
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
  isNew: ['BARU', 'NEW'],
  sender: ['PENGIRIM', 'SENDER'],
  forAth: ['UNTUK ATLET', 'FOR ATHLETE'],
  transcribing: ['Mentranskrip audio…', 'Transcribing audio…'],
  yesAfter: ['Yes aktif setelah transkrip siap', 'Yes unlocks once the transcript is ready'],
  reasonHdr: ['Alasan ditolak · dikirim ke pengirim', 'Rejection reason · sent to sender'],
  cancel: ['Batal', 'Cancel'],
  notified: ['Pengirim sudah diberi tahu', 'Sender has been notified'],
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
  setSub: ['Berlaku untuk semua admin di event ini.', 'Applies to all admins for this event.'],
  evName: ['Nama event', 'Event name'],
  evAdd: ['Tambah event', 'Add event'],
  evSub: ['Tampil di halaman Cheer, DJ Booth, dan poster QR.', 'Shown on the Cheer page, DJ Booth and QR poster.'],
  evPh: ['mis. HYROX Sportfest Vol.3', 'e.g. HYROX Sportfest Vol.3'],
  maxDur: ['Durasi maksimal rekaman', 'Max recording length'],
  maxDurSub: ['Batas waktu di halaman Cheer.', 'Time limit on the Cheer page.'],
  words: ['Daftar kata yang ditandai', 'Flagged word list'],
  wordsSub: ['Kata ini disorot merah di transkrip.', 'These words are highlighted red in transcripts.'],
  addPh: ['Tambah kata…', 'Add word…'],
  add: ['Tambah', 'Add'],

  // Status labels and feedback (copy from the design's script)
  stApproved: ['Disetujui · di antrean DJ', 'Approved · in DJ queue'],
  stRejected: ['Ditolak', 'Rejected'],
  stPlayed: ['Sudah diputar', 'Played'],
  stExpired: ['Kedaluwarsa · tidak diputar', 'Expired · not played'],
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
    (s, r) => 'Ditolak · ' + s + ' diberi tahu: ' + r,
    (s, r) => 'Rejected · ' + s + ' notified: ' + r,
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
    key: 'open',
    label: ['Terima cheer baru', 'Accept new cheers'],
    desc: ['Matikan untuk menutup sementara halaman Cheer.', 'Turn off to temporarily close the Cheer page.'],
  },
  {
    key: 'autoApprove',
    label: ['Kirim otomatis ke DJ', 'Auto-send to DJ'],
    desc: [
      'Cheer langsung masuk antrean DJ tanpa Yes, selama transkrip tidak berisi kata dari daftar di bawah. Cheer yang ditandai tetap menunggu review.',
      'Cheers go straight to the DJ queue without Yes, as long as the transcript has no words from the list below. Flagged cheers still wait for review.',
    ],
  },
]
