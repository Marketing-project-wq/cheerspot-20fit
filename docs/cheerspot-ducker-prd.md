# PRD: CheerSpot Ducker

Aplikasi kecil di laptop DJ yang otomatis mengecilkan musik rekordbox saat cheer diputar, lalu menaikkannya lagi.

Versi dokumen: 1.1 · 5 November 2026 · Pemilik produk: tim CheerSpot (20FIT)

> **Perubahan arah (v1.1):** versi 1 sekarang adalah **app menu bar macOS** di MacBook DJ yang berbicara dengan booth lewat **Supabase Realtime Broadcast**, bukan WebSocket lokal. Varian Windows dan WebSocket lokal (`ws://127.0.0.1:47321`) **ditunda**. Bagian yang menyebut Windows, tray, WebSocket lokal, atau loopMIDI di bawah ini berlaku untuk varian yang ditunda itu. Kontrak yang berlaku sekarang ada di **bagian 11**. Booth `/dj` dijalankan operator di perangkat terpisah, bukan di laptop DJ.

---

## 0. Ringkasan untuk yang membangun

Bangun aplikasi desktop Windows bernama **CheerSpot Ducker**. Aplikasi ini berjalan diam-diam di system tray laptop DJ. Ia menerima perintah dari halaman DJ Booth CheerSpot (`https://cheerspot.20fit.id/dj`, dibuka di Chrome di laptop yang sama) lewat WebSocket lokal `ws://127.0.0.1:47321/cheerspot`.

- Saat booth akan memutar cheer, booth mengirim `duck`. Ducker menurunkan volume musik rekordbox pelan-pelan, lalu membalas `ducked`.
- Setelah cheer selesai, booth mengirim `restore`. Ducker menaikkan volume kembali pelan-pelan, lalu membalas `restored`.
- Ada dua cara (backend) untuk mengatur volume:
  1. **MIDI (utama):** mengirim MIDI CC ke port MIDI virtual (loopMIDI) yang sudah di-map ke Master Level di rekordbox lewat MIDI LEARN. Cara ini tetap jalan walaupun rekordbox memakai driver ASIO controller.
  2. **Volume per aplikasi Windows (cadangan):** menurunkan volume sesi audio `rekordbox.exe` (atau aplikasi lain) lewat Windows Core Audio. Cara ini hanya jalan kalau audio aplikasi lewat mixer Windows (bukan ASIO).
- Ducker **tidak pernah boleh meninggalkan musik dalam keadaan kecil.** Kalau koneksi putus atau perintah `restore` tidak datang, musik otomatis dinaikkan lagi.

Stack yang disarankan: **C# / .NET 8**, WinForms (tray icon), **NAudio** (MIDI + Core Audio), WebSocket server bawaan .NET. Output: satu file `CheerSpotDucker.exe` (self-contained, single-file, win-x64).

---

## 1. Latar belakang

CheerSpot adalah web untuk penonton race (HYROX dan sejenisnya) mengirim voice note "cheer" ke atlet. Admin menyetujui cheer di `/admin`. DJ Booth di `/dj` memutar cheer yang disetujui ke sound system arena.

Booth sudah bisa mengecilkan musik otomatis (ducking) saat cheer diputar, tapi hanya untuk musik yang diputar oleh booth sendiri (YouTube, folder lagu, atau Live input). DJ di event memakai **rekordbox + DJ controller**, dan browser tidak bisa mengatur volume aplikasi lain. Akibatnya cheer diputar di atas musik yang tetap kencang, atau DJ harus menurunkan fader sendiri.

Semua alternatif yang sudah dibahas dianggap terlalu rumit di lapangan:

- Musik DJ lewat laptop booth (audio interface ke Live input): kabelnya banyak, dan laptop booth jadi titik rawan.
- Dua input ke sound system + ducker di mixer venue: tergantung mixer venue dan operator sound.
- Mode MANUAL: DJ harus menurunkan fader sendiri setiap ada cheer.

Yang diinginkan: **DJ cukup membuka halaman booth di laptopnya, lalu lupakan.** Admin menyetujui cheer dari HP atau laptop lain, dan musik apa pun yang sedang dimainkan DJ otomatis mengecil, cheer diputar, lalu musik naik lagi.

## 2. Tujuan

1. Musik rekordbox mengecil otomatis (fade out) sebelum cheer diputar, dan naik lagi (fade in) setelah cheer selesai, tanpa sentuhan DJ.
2. Setelah setup awal, DJ tidak perlu membuka atau mengklik apa pun di Ducker selama event.
3. Setup awal di laptop DJ selesai dalam 15 menit dengan panduan langkah demi langkah.
4. Gagal dengan aman: apa pun yang terjadi (booth ditutup, internet putus, Ducker crash, laptop sleep), musik tidak boleh tertinggal dalam keadaan kecil lebih dari batas waktu yang ditentukan (lihat 8.4).
5. Tidak mengubah cara DJ bermain. Headphone cue DJ tidak terpengaruh.

## 3. Non-tujuan (versi 1)

- Memutar audio cheer dari Ducker. Cheer tetap diputar oleh halaman booth di Chrome.
- Mengontrol lagu, deck, atau playlist di rekordbox.
- Dukungan macOS. Direncanakan di versi 2 (lihat bagian 14).
- Dukungan Serato atau VirtualDJ secara khusus. Backend MIDI kemungkinan bisa dipakai untuk aplikasi lain yang punya MIDI mapping, tapi tidak diuji di versi 1.
- Akses dari jaringan lain. Ducker hanya menerima koneksi dari laptop itu sendiri (127.0.0.1).

## 4. Pengguna

| Peran | Yang dilakukan | Di mana |
| --- | --- | --- |
| DJ | Memainkan musik di rekordbox + controller. Membuka booth `/dj` sekali di awal | Laptop DJ (Windows) |
| Admin / moderator | Menyetujui cheer | `/admin` di HP atau laptop lain |
| Operator / tim teknis CheerSpot | Instal dan setup Ducker, soundcheck | Laptop DJ, sebelum event |

## 5. Gambaran sistem

```
                         (internet)
 Penonton ──> CheerSpot (Supabase) <── Admin /admin (HP)
                         │  realtime: cheer disetujui
                         ▼
 ┌──────────────────── Laptop DJ (Windows) ─────────────────────┐
 │                                                              │
 │  Chrome: /dj (booth, mode AUTO)                              │
 │     │  1. "duck"  ──────────────┐                            │
 │     │  4. "restore" ────────────┤  ws://127.0.0.1:47321      │
 │     │                           ▼                            │
 │     │                CheerSpot Ducker (tray)                 │
 │     │                  │ backend MIDI      │ backend per-app │
 │     │                  ▼                   ▼                 │
 │     │          loopMIDI port ──> rekordbox (Master Level)    │
 │     │                                       │                │
 │     │  3. cheer diputar                     │ musik          │
 │     ▼                                       ▼                │
 │  output cheer                         controller (ASIO)      │
 └─────┼───────────────────────────────────────┼────────────────┘
       ▼                                       ▼
  Sound system ch 2                      Sound system ch 1
  (atau input MIC/AUX controller)
```

Urutan saat ada cheer:

1. Admin menyetujui cheer. Booth (mode AUTO) mengambilnya dari antrean.
2. Booth mengirim `duck` ke Ducker. Ducker menurunkan Master Level rekordbox dalam 2,5 detik, lalu membalas `ducked`.
3. Booth memutar cheer (maksimal 30 detik).
4. Setelah cheer selesai dan jeda 1,5 detik tanpa cheer baru, booth mengirim `restore`. Ducker menaikkan volume dalam 3,5 detik, lalu membalas `restored`.

Kalau ada beberapa cheer berturut-turut, musik tetap kecil di antara cheer, dan `restore` baru dikirim setelah cheer terakhir.

### 5.1 Jalur suara cheer

Ducker tidak menangani suara cheer, tapi cheer harus sampai ke sound system. Pilihan yang didukung (dipilih saat Fase 0):

| Pilihan | Sambungan | Catatan |
| --- | --- | --- |
| A (disarankan) | Colokan headphone laptop DJ atau USB sound card kecil ke **channel 2 sound system** | Paling aman. Tidak berebut driver dengan rekordbox |
| B | Colokan headphone laptop ke **input MIC/AUX controller** (kalau controller punya) | Hanya satu kabel ke sound system. Cek apakah input itu masuk ke master |
| C | Chrome output langsung ke **controller** | Hanya jika driver controller mengizinkan Windows audio bersamaan dengan ASIO rekordbox. Harus dites di Fase 0 |

Booth akan diberi pilihan **output device untuk cheer** (lihat bagian 11), sehingga output cheer tidak harus default Windows.

## 6. Fase 0: uji kelayakan (wajib sebelum membangun penuh)

Jalankan di laptop DJ yang asli, dengan rekordbox dan controller yang akan dipakai. Catat hasilnya di `docs/fase0-hasil.md` di repo Ducker.

1. **Catat setup:** versi Windows, versi rekordbox, merek dan model controller, driver audio di rekordbox (Preferences > Audio). Apakah memakai ASIO?
2. **Uji backend per-app:** putar lagu di rekordbox, buka Windows Volume Mixer (klik kanan ikon speaker > Open volume mixer). Apakah `rekordbox` muncul, dan apakah menggeser slider-nya mengubah volume musik yang keluar dari controller?
   - Ya: backend per-app bisa dipakai.
   - Tidak (paling mungkin dengan ASIO): pakai backend MIDI.
3. **Uji backend MIDI:**
   1. Instal **loopMIDI** (gratis, Tobias Erichsen) dan buat port bernama `CheerSpot Ducker`.
   2. Buka rekordbox, mode PERFORMANCE, tombol **MIDI** (MIDI LEARN). Pilih device `CheerSpot Ducker`.
   3. Tambahkan mapping: kategori **MIXER**, fungsi **Master Level** (atau fungsi volume master lain yang tersedia). Input: Control Change, channel 1, CC **20**.
   4. Kirim CC 20 dengan nilai 0, 64, dan 127 menggunakan alat uji MIDI (misalnya MIDI-OX, atau halaman uji Ducker di bagian 9.5). Pastikan Master Level di rekordbox ikut bergerak dan musik dari controller mengecil.
   5. Cek apakah knob MASTER fisik di controller terhubung ke parameter yang sama. Kalau ya, catat, karena ini bisa bentrok (lihat 8.6).
   6. Catat apakah fitur MIDI LEARN tersedia di lisensi atau mode rekordbox yang dipakai.
   7. Pastikan headphone cue DJ tidak ikut mengecil.
4. **Uji jalur cheer:** pilih Pilihan A, B, atau C dari 5.1. Untuk C: saat rekordbox memutar lagu lewat controller, putar audio dari Chrome dengan output ke controller. Apakah keduanya terdengar?
5. **Tentukan nilai CC:** cari nilai CC "normal" (musik penuh, biasanya posisi Master Level yang biasa dipakai DJ) dan nilai CC "duck" (musik kecil tapi masih terdengar, sekitar 25% kerasnya) dengan mendengarkan langsung.

Keluaran Fase 0: backend yang dipakai, nilai `normalValue` dan `duckValue`, dan jalur cheer yang dipilih.

## 7. Kebutuhan fungsional

### 7.1 Startup dan tray

- F1. Aplikasi berjalan sebagai **ikon di system tray**, tanpa jendela utama. Hanya satu instance (instance kedua menampilkan pesan "CheerSpot Ducker sudah berjalan" lalu keluar).
- F2. Opsi **"Jalan otomatis saat Windows menyala"** (registry `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`). Default: aktif setelah setup pertama.
- F3. Warna ikon tray menunjukkan status:
  - **Hijau:** booth tersambung dan target volume siap (port MIDI terbuka, atau sesi aplikasi ditemukan).
  - **Kuning:** menunggu booth tersambung, atau booth tersambung tapi target belum siap (misalnya rekordbox belum dibuka).
  - **Merah:** error (port WebSocket dipakai aplikasi lain, port MIDI tidak ada, dan sebagainya).
  - **Biru / berkedip:** sedang duck (musik sedang dikecilkan).
- F4. Tooltip ikon tray menampilkan status singkat, misalnya "CheerSpot Ducker · Booth tersambung · rekordbox via MIDI".
- F5. Menu tray (klik kanan):
  - Status (baris teks, tidak bisa diklik): status booth, backend, dan target.
  - **Tes ducking (10 detik):** turunkan, tahan 4 detik, lalu naikkan, memakai pengaturan saat ini.
  - **Kembalikan volume sekarang:** paksa restore (untuk darurat).
  - **Pengaturan…**
  - **Buka halaman uji** (lihat 9.5).
  - **Buka folder log**
  - **Jalan saat Windows menyala** (centang)
  - **Keluar** (restore volume dulu sebelum keluar).

### 7.2 Server WebSocket

- F6. Server mendengar di **`ws://127.0.0.1:47321/cheerspot`**, hanya di loopback (127.0.0.1), tidak pernah di 0.0.0.0. Port bisa diubah di pengaturan.
- F7. Hanya menerima koneksi dengan header `Origin` yang ada di daftar izin. Default:
  - `https://cheerspot.20fit.id`
  - `http://localhost:5173`, `http://localhost:4173`, `http://localhost:3000` (pengembangan)
  - `http://127.0.0.1:47321` (halaman uji Ducker sendiri)

  Origin lain ditolak dengan HTTP 403, dan penolakan dicatat di log.
- F8. Pesan maksimal 4 KB. Pesan bukan JSON, atau dengan `type` tidak dikenal, dibalas `error` lalu diabaikan, dan koneksi tidak ditutup.
- F9. Hanya satu booth yang aktif. Kalau koneksi kedua masuk, koneksi baru menjadi yang aktif dan koneksi lama ditutup dengan kode 4001 ("replaced"). Status duck tetap dipertahankan.
- F10. Endpoint HTTP `GET http://127.0.0.1:47321/health` membalas JSON status (sama dengan pesan `status`) untuk diagnosis.

### 7.3 Protokol (versi 1)

Semua pesan JSON UTF-8, satu objek per frame teks. Field `v` = versi protokol (`1`). Field `id` (opsional) dipakai untuk mencocokkan balasan.

**Booth → Ducker**

| type | Field | Arti |
| --- | --- | --- |
| `hello` | `v`, `client` (`"cheerspot-booth"`), `clientVersion` | Pesan pertama setelah tersambung |
| `duck` | `v`, `id`, `level` (0..1), `fadeMs` | Turunkan musik ke `level` × volume normal dalam `fadeMs` |
| `restore` | `v`, `id`, `fadeMs` | Naikkan musik ke volume normal dalam `fadeMs` |
| `ping` | `v` | Heartbeat, dikirim setiap 5 detik |
| `test` | `v`, `id` | Jalankan tes ducking 10 detik (sama dengan menu tray) |

**Ducker → Booth**

| type | Field | Arti |
| --- | --- | --- |
| `welcome` | `v`, `app` (`"cheerspot-ducker"`), `appVersion`, `status` | Balasan untuk `hello` |
| `ducked` | `v`, `id`, `skipped` (bool), `reason`? | Fade turun selesai. `skipped: true` jika target tidak tersedia (booth tetap memutar cheer) |
| `restored` | `v`, `id`, `skipped`, `reason`? | Fade naik selesai |
| `status` | `v`, `status` | Dikirim saat status berubah, dan sebagai balasan `ping` |
| `error` | `v`, `id`?, `code`, `message` | Pesan tidak valid atau error internal |

Objek `status`:

```json
{
  "ready": true,
  "backend": "midi",
  "target": "rekordbox",
  "targetFound": true,
  "ducked": false,
  "level": 1.0,
  "detail": "Port MIDI 'CheerSpot Ducker' terbuka"
}
```

- `backend`: `"midi"` | `"app-volume"` | `"none"`
- `ready`: `true` jika duck akan benar-benar berpengaruh

Kode `error`: `bad_json`, `unknown_type`, `bad_field`, `unsupported_version`, `internal`.

Contoh percakapan:

```
booth  → {"type":"hello","v":1,"client":"cheerspot-booth","clientVersion":"2026.11"}
ducker → {"type":"welcome","v":1,"app":"cheerspot-ducker","appVersion":"1.0.0","status":{...,"ready":true}}
booth  → {"type":"duck","v":1,"id":"c-91f2","level":0.25,"fadeMs":2500}
          (2,5 detik kemudian)
ducker → {"type":"ducked","v":1,"id":"c-91f2","skipped":false}
          (cheer diputar ±20 detik, lalu jeda 1,5 detik)
booth  → {"type":"restore","v":1,"id":"r-91f2","fadeMs":3500}
          (3,5 detik kemudian)
ducker → {"type":"restored","v":1,"id":"r-91f2","skipped":false}
```

### 7.4 Logika fade

- F11. Fade memakai kurva **smoothstep** `e(t) = t² (3 − 2t)` dari nilai saat ini ke target. Ini sama dengan kurva di booth, sehingga tidak terdengar patah.
- F12. Kirim atau terapkan nilai setiap **20 ms** (50 langkah per detik). Untuk MIDI, kirim CC hanya jika nilainya berubah.
- F13. Perintah baru membatalkan fade yang sedang berjalan dan mulai dari nilai saat itu:
  - `duck` saat sudah duck: fade ke level baru (atau langsung balas `ducked` jika levelnya sama).
  - `restore` saat tidak duck: langsung balas `restored`.
  - `duck` saat sedang restore: balik arah dari nilai saat itu.
- F14. Fade yang dibatalkan tetap membalas pesannya sendiri dengan `ducked`/`restored` dan `reason: "superseded"`, supaya booth tidak menunggu.
- F15. Batas: `fadeMs` dijepit di 0–10.000 ms, `level` di 0–1.

### 7.5 Backend MIDI (utama)

- F16. Membuka port output MIDI dengan nama yang dipilih di pengaturan (default `CheerSpot Ducker`, dibuat oleh loopMIDI).
- F17. Mengirim Control Change di channel dan nomor CC yang diatur (default channel 1, CC 20).
- F18. Konversi level ke nilai CC:
  - `level = 1`: kirim `normalValue` (default 127, diatur saat Fase 0).
  - `level = target duck`: kalau `duckValue` diisi di pengaturan, pakai `duckValue` untuk semua duck dan abaikan `level` dari booth. Kalau kosong, pakai `round(normalValue × level)`.
  - Nilai di antaranya mengikuti fade (F11), interpolasi linear di ruang CC.
- F19. Saat Ducker mulai (dan saat port baru terbuka), kirim `normalValue` sekali supaya rekordbox berada di posisi yang diketahui. Ini bisa dimatikan di pengaturan ("Jangan kirim nilai awal") untuk kasus bentrok dengan knob DJ (8.6).
- F20. Kalau port tidak ditemukan: status merah dengan detail "Port MIDI 'CheerSpot Ducker' tidak ditemukan. Buka loopMIDI." Coba buka lagi setiap 5 detik. `duck` dibalas `skipped: true`.
- F21. Ducker tidak membaca nilai dari rekordbox. Ducker menganggap dirinya pemilik parameter yang di-map.

### 7.6 Backend volume per aplikasi Windows (cadangan)

- F22. Mencari sesi audio di **semua** perangkat output aktif yang proses-nya cocok dengan daftar nama di pengaturan (default `rekordbox.exe`). Gunakan Windows Core Audio: `IAudioSessionManager2`, `IAudioSessionControl2::GetProcessId`, `ISimpleAudioVolume` (lewat NAudio `AudioSessionManager`).
- F23. Sebelum duck, simpan volume asli setiap sesi yang cocok. Saat duck, fade ke `asli × level`. Saat restore, fade kembali ke volume asli yang disimpan.
- F24. Sesi baru yang muncul saat sedang duck langsung diset ke level duck. Sesi yang hilang diabaikan.
- F25. Pindai ulang sesi setiap 2 detik, dan setiap kali ada `duck`.
- F26. Kalau tidak ada sesi yang cocok: status kuning "rekordbox tidak ditemukan di Volume Mixer (kemungkinan memakai ASIO, gunakan backend MIDI)". `duck` dibalas `skipped: true`.

### 7.7 Pemilihan backend

- F27. Pengaturan **Backend**: `Otomatis` (default), `MIDI`, atau `Volume aplikasi`.
- F28. `Otomatis`: pakai MIDI jika port MIDI yang diatur ada. Jika tidak, pakai volume aplikasi jika sesi target ditemukan. Jika tidak, `none`.
- F29. Backend aktif ditampilkan di tooltip, menu status, dan pesan `status`.

### 7.8 Pengaturan

Jendela pengaturan kecil (WinForms), disimpan di `%APPDATA%\CheerSpotDucker\config.json`. Perubahan berlaku tanpa restart.

| Pengaturan | Default | Keterangan |
| --- | --- | --- |
| Backend | Otomatis | Otomatis / MIDI / Volume aplikasi |
| Port MIDI | `CheerSpot Ducker` | Dropdown port output MIDI yang ada |
| Channel MIDI | 1 | 1–16 |
| Nomor CC | 20 | 0–127 |
| Nilai normal (CC) | 127 | Volume penuh |
| Nilai duck (CC) | kosong | Jika diisi, menggantikan level dari booth |
| Kirim nilai normal saat mulai | Ya | F19 |
| Aplikasi target | `rekordbox.exe` | Daftar nama proses, dipisah koma |
| Port WebSocket | 47321 | |
| Origin yang diizinkan | lihat F7 | Satu per baris |
| Batas lama duck | 45 detik | Lihat F31 |
| Jalan saat Windows menyala | Ya | |

Tombol di jendela pengaturan: **Simpan**, **Tes ducking**, **Kirim nilai normal sekarang**, **Kirim nilai duck sekarang** (untuk kalibrasi saat soundcheck).

## 8. Pengaman (fail-safe)

Bagian ini wajib. Musik yang tertinggal kecil di tengah event adalah kegagalan paling buruk.

- F30. **Koneksi putus saat duck:** kalau booth terputus saat musik sedang kecil, tunggu 3 detik. Kalau booth belum tersambung lagi, lakukan restore otomatis (fade 3,5 detik).
- F31. **Batas lama duck:** kalau musik kecil lebih lama dari "Batas lama duck" (default 45 detik = cheer maksimal 30 detik + fade + jeda) tanpa `duck` baru, restore otomatis. Setiap `duck` baru mereset timer.
- F32. **Heartbeat:** kalau tidak ada pesan dari booth selama 20 detik, anggap booth terputus (F30).
- F33. **Keluar atau crash:** saat keluar dari menu, Windows shutdown/logoff, atau exception tak tertangani, restore secepatnya (langsung ke nilai normal tanpa fade) sebelum proses berakhir.
- F34. **Sleep/resume:** setelah laptop bangun dari sleep, restore ke normal dan buka ulang port MIDI.
- F35. **Restore darurat:** menu tray "Kembalikan volume sekarang" selalu bisa dipakai.
- F36. Semua restore otomatis dicatat di log beserta alasannya.

### 8.6 Bentrok dengan knob DJ

Kalau parameter yang di-map (misalnya Master Level) juga dipegang knob fisik controller, nilai dari Ducker dan dari knob bisa saling menimpa. Contoh: setelah restore, Ducker mengembalikan nilai ke `normalValue`, padahal DJ sudah memutar knob ke posisi lain.

Penanganan di versi 1:

1. Saat Fase 0, utamakan memetakan Ducker ke parameter yang **tidak** dipegang DJ selama main (misalnya Master Level software jika knob MASTER controller bersifat hardware/analog).
2. Kalau terpaksa memakai parameter yang sama, setel `normalValue` sama dengan posisi biasa DJ, dan matikan "Kirim nilai normal saat mulai".
3. Tulis temuan ini di panduan setup.

## 9. Kebutuhan non-fungsional

- N1. **Platform:** Windows 10 22H2 dan Windows 11, x64.
- N2. **Ukuran dan sumber daya:** RAM di bawah 80 MB, CPU di bawah 1% saat idle. Tidak boleh mengganggu audio rekordbox, jadi tidak boleh ada kerja berat di thread audio.
- N3. **Latensi:** `ducked` dikirim paling lambat 100 ms setelah `fadeMs` selesai.
- N4. **Tanpa internet:** Ducker tidak membutuhkan internet sama sekali.
- N5. **Keamanan:** hanya listen di 127.0.0.1, wajib cek Origin (F7), batas ukuran pesan (F8). Ducker hanya bisa mengubah volume, tidak bisa menjalankan perintah lain. Tidak ada telemetri.
- N6. **Log:** `%APPDATA%\CheerSpotDucker\logs\ducker-YYYYMMDD.log`, rotasi harian, simpan 7 hari. Isinya: koneksi, duck/restore beserta durasi, error, dan restore otomatis.
- N7. **Distribusi:** satu file `CheerSpotDucker.exe` (self-contained .NET 8, single-file, win-x64), tanpa installer di versi 1. Opsional: installer Inno Setup di versi 1.1.
- N8. **Bahasa UI:** Bahasa Indonesia.

### 9.5 Halaman uji bawaan

- F37. `GET http://127.0.0.1:47321/` menampilkan halaman HTML sederhana yang tersambung ke WebSocket Ducker sendiri. Isinya: tombol **Duck**, **Restore**, **Tes 10 detik**, slider level dan fadeMs, serta log pesan masuk dan keluar.
- F38. Halaman ini dipakai untuk Fase 0 dan soundcheck, tanpa perlu membuka booth CheerSpot.

## 10. Stack dan struktur yang disarankan

- **Bahasa:** C# 12, .NET 8, `net8.0-windows`, WinForms (`NotifyIcon` untuk tray).
- **Library:** `NAudio` (MIDI out lewat `NAudio.Midi.MidiOut`, Core Audio lewat `NAudio.CoreAudioApi`). WebSocket memakai `HttpListener` + `System.Net.WebSockets` bawaan .NET, atau ASP.NET Core minimal API (Kestrel) yang di-bind ke `127.0.0.1`.
- **Build dari OS apa pun:** set `<EnableWindowsTargeting>true</EnableWindowsTargeting>` supaya bisa di-build dari macOS/Linux:
  ```bash
  dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true
  ```
- **Struktur:**
  ```
  CheerSpotDucker/
    src/CheerSpotDucker/
      Program.cs              // single instance, tray, startup
      Tray/TrayController.cs  // ikon, menu, warna status
      Server/WsServer.cs      // WebSocket + /health + halaman uji
      Server/Protocol.cs      // tipe pesan, validasi
      Ducking/DuckController.cs   // state duck, fade, fail-safe timer
      Ducking/Fade.cs             // smoothstep, langkah 20 ms
      Backends/IVolumeBackend.cs
      Backends/MidiBackend.cs
      Backends/AppVolumeBackend.cs
      Config/Settings.cs, SettingsForm.cs
      Web/test.html           // embedded resource
    tests/CheerSpotDucker.Tests/  // xUnit
    docs/panduan-setup.md
    docs/fase0-hasil.md
    README.md
  ```
- **Antarmuka backend:**
  ```csharp
  interface IVolumeBackend {
      string Name { get; }            // "midi" | "app-volume"
      bool IsReady { get; }           // target tersedia
      string Detail { get; }          // teks status untuk UI
      void Apply(double level);       // 0..1 relatif terhadap normal, dipanggil tiap 20 ms saat fade
      void Refresh();                 // cari ulang port/sesi
  }
  ```
  `DuckController` memegang state (`level` saat ini, `ducked`, timer fail-safe) dan memanggil `Apply` sepanjang fade. Backend tidak tahu soal fade.

## 11. Kontrak booth ↔ Ducker (Supabase Realtime Broadcast) dan perubahan di booth `/dj`

Kontrak ini yang berlaku untuk versi 1 (macOS). Booth sudah mengimplementasikannya di repo `cheerspot-20fit`:

- `src/lib/duckerConfig.js` berisi `DUCKER_DEFAULTS`, satu-satunya tempat nilai tetap.
- `src/lib/ducker.js` berisi koneksi, protokol, dan adapter musik `external`.
- `src/lib/ducking.js` mengecilkan dan menaikkan semua sumber musik yang aktif sekaligus, dan mengirim ulang duck selama ada cheer.
- `src/components/dj/DuckerPanel.jsx` adalah panel "Ducker DJ".

### 11.1 Channel dan pesan

- **Channel:** `supabase.channel('ducker:' + pairCode, { config: { broadcast: { self: false } } })`. Channel publik (non-private), memakai anon/publishable key project CheerSpot.
- **Event broadcast:** `ducker`.
- **Kode pairing:** dibuat app, 8 karakter dari `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (huruf besar + angka, tanpa O/0/I/1). Booth menerima input tanpa membedakan huruf besar-kecil, dan spasi dibuang.
- **Bentuk setiap payload:** `{ v: 1, from, type, id?, ... }`. Booth mengirim `from: 'booth'` dan mengabaikan pesan yang `from`-nya bukan `'ducker'`. App sebaiknya mengabaikan pesan yang `from`-nya bukan `'booth'`.

| Arah | type | Field | Kapan |
| --- | --- | --- | --- |
| Booth → App | `hello` | `clientVersion` | Setiap kali booth (kembali) bergabung ke channel |
| Booth → App | `duck` | `id`, `level` (0..1), `fadeMs` | Di awal **setiap** cheer, dan setiap 20 detik selama cheer diputar atau di-pause |
| Booth → App | `restore` | `id`, `fadeMs` | Setelah cheer terakhir + jeda 1,5 detik. Juga saat operator klik Putuskan dan saat tab ditutup (`pagehide`, best effort) |
| Booth → App | `ping` | | Setiap 5 detik |
| Booth → App | `test` | `id` | Tombol "Tes ducking" |
| Booth → App | `restore_now` | `id` | Tombol "Kembalikan volume sekarang" |
| Booth → App | `config` | `normalValue?`, `duckValue?`, `midiChannel?`, `cc?`, `maxDuckSec?` | Tombol "Simpan" di Kalibrasi (booth saat ini hanya mengirim `normalValue` dan `duckValue`) |
| Booth → App | `send_value` | `value` (0–127) | Tombol "Kirim" di Kalibrasi |
| App → Booth | `welcome` | `appVersion?` | Balasan `hello` |
| App → Booth | `ducked` | `id`, `skipped`, `reason?` | Fade turun selesai. `id` sama dengan `duck` |
| App → Booth | `restored` | `id`, `skipped`, `reason?` | Fade naik selesai. `id` sama dengan `restore` |
| App → Booth | `status` | `ready`, `realtime`, `midiReady`, `ducked`, `level`, `ccValue`, `config`, `pairCode`, `appVersion` | Setiap 5 detik, dan sebaiknya juga langsung setelah `hello`/`ping` |
| App → Booth | `error` | `code`, `message` | Kapan saja. Booth menampilkannya di panel selama 60 detik |

### 11.2 Perilaku booth

- **Level duck** = pengaturan Duck level booth (`DEFAULT_DUCKING.duckLevel`, saat ini 0,25), dikirim apa adanya. Slider Music volume booth **tidak** mengubah volume rekordbox. `fadeMs` mengikuti fade booth: turun 2.500 ms, naik 3.500 ms.
- **Menunggu balasan:** cheer pertama dalam satu rangkaian menunggu `ducked` dengan `id` yang sama, paling lama `fadeMs + 1.500 ms`. Setelah itu cheer tetap diputar. `duck` ulang (cheer berikutnya saat musik sudah kecil, atau kirim ulang 20 detik) dikirim dengan `fadeMs: 0` dan **tidak** ditunggu.
- **Kirim ulang 20 detik** hanya berjalan selama ada cheer yang sedang diputar atau di-pause. Begitu cheer selesai, kiriman ulang berhenti. Tidak ada jalur di mana booth terus mengirim `duck` tanpa cheer aktif, jadi batas 45 detik di app tetap menjadi pengaman.
- **Kapan app dianggap aktif:** `status` terakhir diterima maksimal 12 detik lalu **dan** `status.ready === true`. Kalau tidak, booth tidak mengirim `duck`/`restore` untuk cheer dan memutar cheer seperti biasa (YouTube, folder, dan live input tetap dikecilkan oleh booth sendiri).
- **Semua sumber bersamaan:** sumber musik booth dan app dikecilkan serta dinaikkan bersamaan.
- **Pill header** tidak menghitung app sebagai musik. Pill tetap "Standby" kalau booth sendiri tidak memutar musik.
- **Chip status di panel:** hijau "Ducker: tersambung" (`ready`), kuning "Ducker: MIDI belum siap" (`status` ada tapi `ready` false), abu-abu "Ducker: offline" (belum tersambung, atau tidak ada `status` lebih dari 12 detik).
- **Sambung otomatis:** kode disimpan di `localStorage`. Setelah refresh, booth bergabung lagi kalau sebelumnya tersambung. Putuskan menghapus tanda sambung otomatis.
- **Log:** semua pesan masuk dan keluar dicatat di console dengan prefix `[ducker]`.

### 11.3 Yang harus dipenuhi app

1. Membalas setiap `duck` dengan `ducked` dan setiap `restore` dengan `restored`, memakai `id` yang sama, setelah fade-nya selesai. `skipped: true` jika MIDI tidak siap.
2. Mengirim `status` setiap 5 detik. `ready` hanya true jika `duck` benar-benar akan menggerakkan rekordbox.
3. Pengaman: menaikkan musik sendiri jika tidak ada `duck` baru dalam `maxDuckSec` (default 45 detik). Setiap `duck` mereset timer ini.
4. `duck` saat sudah kecil dengan `fadeMs: 0` hanya mereset timer (dan menyesuaikan level jika berbeda).
5. Kode pairing acak 8 karakter. Anon key bersifat publik, jadi kode pairing adalah satu-satunya rahasia channel. Siapa pun yang tahu kode bisa mengirim `duck`/`send_value`.

### 11.4 Syarat di Supabase

Realtime Broadcast di channel **publik** harus diizinkan (Dashboard → Realtime → Settings → "Allow public access"). `realtime.messages` memakai RLS tanpa policy, jadi channel private akan ditolak. Kontrak ini sengaja memakai channel publik.

## 12. Panduan setup untuk DJ/operator (harus dibuat sebagai `docs/panduan-setup.md`)

Ditulis untuk orang non-teknis, dengan screenshot. Isi minimal:

1. Unduh dan instal **loopMIDI**, lalu buat port `CheerSpot Ducker`. Centang agar loopMIDI jalan saat Windows menyala.
2. Jalankan `CheerSpotDucker.exe`, lalu pastikan ikon muncul di tray.
3. Di rekordbox: MIDI LEARN, map `CheerSpot Ducker` CC 20 ke Master Level (dengan langkah dan screenshot dari Fase 0).
4. Buka `http://127.0.0.1:47321/`, klik **Tes 10 detik**, lalu pastikan musik rekordbox mengecil dan naik lagi.
5. Kalibrasi nilai normal dan nilai duck sambil mendengarkan dari sound system.
6. Sambungkan output cheer sesuai pilihan di 5.1.
7. Buka `https://cheerspot.20fit.id/dj` di Chrome, login, pilih mode **AUTO**, pilih **Output cheer**, klik **Allow** jika Chrome meminta izin, lalu pastikan chip "Ducker: tersambung".
8. Klik **Tes ducking** di booth.
9. Checklist sebelum event: charger terpasang, sleep dimatikan, notifikasi Windows dimatikan, Ducker hijau.
10. Troubleshooting: ikon merah, chip abu-abu, musik tidak mengecil, musik tertinggal kecil (klik "Kembalikan volume sekarang").

## 13. Kriteria terima

**Ducker (bisa dites tanpa booth, lewat halaman uji)**

- [ ] `CheerSpotDucker.exe` jalan di Windows 10 dan 11 tanpa instal .NET terpisah.
- [ ] Hanya satu instance yang bisa berjalan.
- [ ] Ikon tray berubah warna sesuai status (F3).
- [ ] Koneksi dari Origin yang tidak diizinkan ditolak 403.
- [ ] Server tidak bisa diakses dari laptop lain di jaringan yang sama.
- [ ] Dengan backend MIDI + loopMIDI + rekordbox: `duck` level 0,25 fade 2500 menurunkan Master Level dengan halus dalam ±2,5 detik, lalu `ducked` terkirim.
- [ ] `restore` fade 3500 mengembalikan ke nilai normal, lalu `restored` terkirim.
- [ ] `duck` di tengah restore berbalik arah dengan halus, tanpa lompatan.
- [ ] Koneksi WebSocket diputus saat duck: musik kembali normal dalam ±3 + 3,5 detik.
- [ ] Duck tanpa restore: musik kembali normal setelah 45 detik.
- [ ] Keluar dari menu saat duck: musik langsung kembali normal.
- [ ] Port MIDI dihapus di loopMIDI: status merah dan `duck` dibalas `skipped: true`. Port dibuat lagi: tersambung lagi sendiri dalam 5 detik.
- [ ] Backend volume aplikasi: dengan aplikasi yang memakai audio Windows (misalnya Spotify, untuk tes), volume aplikasi itu turun dan kembali ke nilai aslinya.
- [ ] Headphone cue DJ tidak ikut mengecil.
- [ ] Unit test lulus: fungsi smoothstep, konversi level ke CC, mesin state duck/restore/superseded, timer fail-safe, validasi pesan.

**Ujung ke ujung (bersama booth, setelah W1–W8 selesai)**

- [ ] Admin menyetujui cheer di HP, lalu di laptop DJ musik rekordbox mengecil, cheer terdengar jelas, dan musik naik lagi tanpa ada yang menyentuh laptop DJ.
- [ ] Tiga cheer berturut-turut: musik tetap kecil di antaranya, dan naik setelah cheer terakhir.
- [ ] Internet laptop DJ putus saat duck: musik tetap kembali normal (fail-safe).
- [ ] Booth ditutup saat cheer: musik kembali normal dalam beberapa detik.
- [ ] 2 jam pemakaian terus-menerus tanpa masalah memori atau audio.

## 14. Rencana tahap

| Tahap | Isi | Selesai jika |
| --- | --- | --- |
| Fase 0 | Uji kelayakan di laptop DJ (bagian 6) | `docs/fase0-hasil.md` terisi, backend dan nilai CC ditentukan |
| Versi 1.0 | Ducker: tray, WebSocket, protokol, backend MIDI + volume aplikasi, fail-safe, halaman uji, pengaturan, log, panduan | Kriteria Ducker di bagian 13 lulus |
| Integrasi | Perubahan booth W1–W9 di repo `cheerspot-20fit` | Kriteria ujung ke ujung lulus |
| Versi 1.1 | Installer, auto-update sederhana, ikon dan tampilan dirapikan | |
| Versi 2 | macOS: CoreMIDI virtual source (tanpa loopMIDI), app menu bar. Volume per aplikasi tidak didukung di macOS | Diuji di MacBook DJ dengan rekordbox |

## 15. Alternatif yang sudah dipertimbangkan

| Alternatif | Kenapa tidak dipilih (atau kapan dipakai) |
| --- | --- |
| Musik DJ dialirkan lewat laptop booth (Live input) | Butuh audio interface dan banyak kabel, dan laptop booth jadi titik rawan. Dinilai terlalu rumit |
| Dua input ke sound system + ducker/sidechain mixer venue | Bagus jika mixer venue mendukung, tapi tergantung venue dan operator sound |
| Mode MANUAL (DJ menurunkan fader sendiri) | Tetap tersedia sebagai cadangan. Menambah beban DJ |
| **Booth mengirim MIDI langsung lewat Web MIDI di Chrome, tanpa aplikasi Ducker** | Lebih sedikit software (cukup loopMIDI + mapping rekordbox), tapi tidak punya fail-safe di luar browser (kalau tab crash saat duck, musik bisa tertinggal kecil), tidak punya backend volume aplikasi, dan tidak ada status atau tes di luar booth. Bisa dipakai sebagai solusi sementara sebelum Ducker siap |

## 16. Risiko dan pertanyaan terbuka

| Risiko / pertanyaan | Dampak | Mitigasi |
| --- | --- | --- |
| MIDI LEARN rekordbox tidak tersedia di lisensi atau mode yang dipakai | Backend MIDI tidak bisa dipakai | Cek di Fase 0. Alternatif: volume aplikasi (jika tidak ASIO), atau dua input + ducker mixer |
| Master Level juga dipegang knob controller | Nilai saling menimpa | Bagian 8.6 |
| Driver controller tidak mengizinkan Chrome memakai output yang sama | Cheer tidak bisa lewat controller | Pakai jalur cheer A atau B (5.1) |
| Chrome memblokir koneksi ke 127.0.0.1 | Booth tidak bisa memberi perintah | Izin Chrome (W8). Uji di versi Chrome yang dipakai |
| Antivirus menandai exe baru | Ducker tidak bisa dijalankan | Code signing di versi 1.1. Sementara: tambahkan pengecualian |
| Laptop DJ ternyata Mac | Versi 1 tidak bisa dipakai | Versi 2, atau sementara pakai Web MIDI dari booth (bagian 15) |

Pertanyaan yang perlu dijawab sebelum mulai:

1. Laptop DJ: Windows atau Mac, dan versi berapa?
2. Merek dan model controller, serta versi dan lisensi rekordbox?
3. Apakah sound system venue punya input kedua untuk cheer, atau controller punya input MIC/AUX?
4. Siapa yang menjalankan Fase 0 di laptop DJ, dan kapan?
