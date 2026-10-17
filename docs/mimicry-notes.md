# Catatan Mimikri Magic Survival (LEME) — riset & keputusan

Sumber utama (dibaca 17 Okt 2025):
- Fandom wiki: https://magic-survival-rpg.fandom.com/wiki/Magic_Survival
- Panduan Medium: https://medium.com/@andresss2514/what-to-play-magic-survival-review-and-complete-guide-ac938716eb98

Fakta sistem game sumber (publik):
- 53 mantra: 21 aktif (17 sampai Lv.7, 4 utilitas Lv.5), 9 pasif, 23 bonus; 60 fusi.
- Fusi (Magic Combination) dipilih di level karakter 25/50/75; satu mantra dikorbankan.
- 8 tipe musuh (AI beda), elite, "citadel"; monster raksasa hitam-merah muncul saat death-count.
- Death-count/death bar: event horde terkuat; pertama di menit 6:00, lalu 11:00, 15:00, 18:00,
  mode infinity tiap +2:30 (20:30, 23:00, ...). Jam berhenti saat monsters "level up".
- Mana orb 4 tingkat: biru kecil (umum), kuning sedang (~1 per 4-5 biru), merah muda besar
  (kadang), hijau ekstra besar (dari monster raksasa, juga menyembuhkan).
- Item lapangan: rune (kekebalan, magnet orb, amuk serangan+kecepatan, pemusnah massal,
  elite-rune → bunuh semua elite = hadiah), hati (heal), sel (gold), peti (artefak).
- 8 pasif "skills": attack, critical rate, size/area, HP, pickup range, move speed, duration, cooldown.
- 112+ artefak (5 rarity) dari peti (pilih 1 dari 3); 24 kelas; 25 subjek; 13 stage; riset permanen.
- Level maks karakter 100. Tanpa musik di game, hanya ambience+SFX. Visual: gelap, scribble.

Padanan kita (nama orisinal, perilaku setia):
- 21 mantra aktif sama perilakunya: Peluru Sihir, Kejutan Kilat, Pembakaran, Meteor, Bola Api,
  Zona Lava, Roh Kecil, Peluru Energi, Satelit, Sinar Arkana, Tomadoi, Gelombang Pasang,
  Nova Es, Badai Es, Kejut Listrik, Zona Elektro, Badai Guntur, Bencana Total, Menghilang,
  Perisai, Lingkar Sihir.
- 8 pasif: Serangan, Kritis, Area, Nyawa, Jangkauan, Kecepatan, Durasi, Pendinginan.
- Orb mana: biru=1, kuning=5, muda=25, hijau=60(+25 HP). Rune 5 jenis + (hati lewat orb hijau).
- 8 musuh: Crawler, Pelari, Juggernaut, Penyihir Bayangan (ranged), Peledak, Pembelah+mini,
  mini, Raksasa (giant boss horde). Elite: HPx4 dmgx1.5 xpx8 + cincin kuning.
- Gelombang Kematian: 6:00/11:00/15:00/18:00 lalu +2:30; jam beku; Raksasa HP = base
  x enemyHpMult(t) x 1.6^wave; kalahkan = horde tamat; timeout 45 detik.

V3+ queue: fusi (25/50/75), talenta Lv.maks mantra, artefak+peti, kelas, stage, riset.
Batas mimikri: tidak menyalin nama/aset/angka persis dari sumber — hanya pola sistem.

Keputusan teknis penting:
- Web: CanvasKit WASM di self-host public/canvaskit.wasm; entry deferred (index.web.tsx
  LoadSkiaWeb → renderRootComponent). Native entry: index.tsx renderRootComponent langsung.
- Ikon: emblem AI gpt-image-2.5 → derive_icons.py (icon, foreground, background, monochrome,
  splash, favicon). logoUrl CDN: https://files.manuscdn.com/user_upload_by_module/session_file/310519663767339507/TUqZRPjKZQbPqBwW.png
- Balance probe: npx tsx /home/ubuntu/icon-src/balance2.ts (pemain tanky 1M HP, gerak melingkar).
