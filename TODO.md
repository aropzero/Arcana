# TODO — Arcana Survival

## Rutinitas rilis (berlaku setiap update)

Setiap checkpoint: commit → `git push origin main` (kanonik Manus) → `git push github main`
(repo pengguna: github.com/aropzero/Arcana). Push ke GitHub otomatis memicu workflow
`.github/workflows/build-apk.yml` yang membangun APK (artifact `arcana-survival-apk`,
paling lama ±15 menit). Catatan CI: Skia butuh `npx install-skia` setelah install; pnpm
versi mengikuti `packageManager` package.json; token push tersimpan di `.git/config`
remote `github` (tidak pernah terkomit).

Game aksi-survival top-down (Expo/React Native, Android APK) yang meniru rasa bermain
Magic Survival (LEME) dengan kode, nama, dan aset 100% orisinal. Pemain = penyihir;
mantera menembak otomatis; horde monster makin brutal; naik level + pilih upgrade.
Pengembangan berkelanjutan: pengguna adalah penguji-kritikus; setiap versi = checkpoint
dengan changelog; uji cepat lewat Expo Go, rilis lewat APK.

## V2.0 — Mimikri sistem inti (versi saat ini)

- [x] **21 mantera aktif** (17 sampai Lv.7 + 4 utilitas Lv.5): Peluru Sihir, Kejutan Kilat,
      Pembakaran, Meteor, Bola Api, Zona Lava, Roh Kecil, Peluru Energi, Satelit, Sinar
      Arkana, Tomadoi, Gelombang Pasang, Nova Es, Badai Es, Kejut Listrik, Zona Elektro,
      Badai Guntur + Bencana Total, Menghilang, Perisai, Lingkar Sihir — perilaku nyata
      berbeda per mantera (proyektil, zona DoT, orbit, summon, beam, hujan meteor/guntur,
      gelombang tepi, buff).
- [x] **8 pasif** sampai Lv.7: Serangan, Kritis, Area, Nyawa, Jangkauan, Kecepatan, Durasi,
      Pendinginan — memengaruhi semua mantera; kritis menghasilkan angka damage kuning.
- [x] **Orb mana 4 tingkat** (biru 1 / kuning 5 / merah muda 25 / hijau 60 + pulih nyawa)
      menggantikan kristal XP; kurva level cepat di awal lalu melandai, seperti sumber.
- [x] **Rune lapangan 5 jenis** (kekebalan, magnet, amuk serangan+kecepatan, pemusnah
      massal di layar, elite [bunuh 3 elite → hadiah orb]) + hati penyembuh drop langka.
- [x] **8 tipe musuh**: Crawler, Pelari, Juggernaut, Penyihir Bayangan (ranged), Peledak,
      Pembelah (+mini), mini, Raksasa (giant/boss); varian elite (outline glow, HPx4, XPx8).
- [x] **Gelombang Kematian**: horde event pada 6:00, 11:00, 15:00, 18:00 lalu tiap 2:30 —
      timer berhenti, langit merah, Raksasa muncul (HP membesar per event), banner +
      bar HP raksasa di HUD; setelah Raksasa tumbang, waktu berjalan lagi.
- [x] **Rasa tepuk**: angka damage melayang (kritis = kuning besar), screen shake,
      hit flash, vignette HP rendah, ledakan kematian musuh.
- [x] **Pacing & balancing**: naik level deras di menit awal; tekanan eksponensial;
      build lemah tumbang wajar di menit 6–12.

## V3+ — Antrean berikutnya (menunggu kritik penguji)

- Kombinasi Mantera (fusi) di level 25/50/75 — satu mantera dikorbankan untuk
  memperkuat yang lain (game sumber punya 60 resep; kita mulai ~10).
- Talenta saat mantera mencapai level maksimum (mengubah perilaku, bukan angka saja).
- Artefak dari peti (pilih 1 dari 3; modul build: ledakan saat naik level, damage %HP, dll).
- Kelas pra-run, stage dengan latar/monster unik, riset permanen (meta progression;
  penyimpanan server sudah tersedia bila diminta).

## V1.0 — Vertical slice (selesai, checkpoint 38bd01a)

- [x] Joystick virtual mengambang; gerak bebas; kamera mengikuti pemain di arena 2600x2600.
- [x] Mantera otomatis + gelombang musuh + XP/level + 3 kartu upgrade acak.
- [x] HUD lengkap (HP, XP/level, gelombang, waktu, kill, skor, jeda) + rekor AsyncStorage.
- [x] Menu utama, jeda (auto-pause pindah aplikasi), game over + main ulang.
- [x] Aset orisinal prosedural (Skia), ikon launcher khas, web preview (CanvasKit
      self-hosted, deferred registration), 7 uji unit simulasi, tsc bersih.
- [x] Alur iterasi: checkpoint per versi dengan changelog untuk dinilai pengguna.
