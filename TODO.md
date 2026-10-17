# TODO — Arcana Survival

Game aksi-survival top-down (Expo/React Native, Android APK). Pemain = penyihir; mantera
menembak otomatis; gelombang monster makin sulit; level up + upgrade; skor dari waktu
bertahan & kill. Pengembangan berkelanjutan: pengguna adalah penguji-kritikus, setiap versi
= checkpoint + ringkasan perubahan; uji cepat lewat Expo Go.

## V1 — Vertical slice (uji Expo Go + APK pertama)

- [x] **Gerak bebas dengan joystick virtual**
      Saat permainan berjalan, menyentuh layar memunculkan joystick mengambang di titik
      sentuh; menggeser jari menggerakkan penyihir ke segala arah dengan kecepatan
      proporsional jarak geser; melepas jari menghentikan gerakan. Kamera mengikuti pemain
      pada arena yang lebih besar dari layar.
- [x] **Mantera menembak otomatis**
      Penyihir otomatis menembak Bolt Sihir ke monster terdekat dalam jangkauan, tanpa tombol
      serang, berulang sesuai cooldown. Mantera tambahan (Bola Api, Petir Berantai, Nova Es)
      juga berjalan otomatis setelah diperoleh dari upgrade.
- [x] **Gelombang monster makin sulit**
      Monster muncul terus dari luar layar; interval spawn makin pendek dan statistik musuh
      (HP, damage, jumlah) meningkat seiring waktu. Jenis baru muncul bertahap: Crawler
      (dasar) → Runner (cepat) → Brute (kuat, lambat).
- [x] **Level up dengan pilihan upgrade**
      Monster yang mati menjatuhkan kristal XP yang tertarik ke pemain (magnet). XP penuh
      menaikkan level: simulasi terjeda, tampil 3 pilihan acak (mantera baru / penguatan
      mantera / statistik pasif), memilih satu melanjutkan permainan.
- [x] **HUD dalam permainan**
      Tampil selama bermain: bar HP, bar XP + nomor level, gelombang, waktu bertahan, jumlah
      kill, dan tombol jeda.
- [x] **Skor, kill, dan rekor tersimpan**
      Skor dihitung dari waktu bertahan + jumlah kill + level. Game over menampilkan skor;
      rekor tertinggi tersimpan persisten (AsyncStorage) dan ditampilkan di menu utama.
- [x] **Menu utama, jeda, dan game over**
      Menu utama: judul, tombol Main, rekor tertinggi, nomor versi, cara main singkat.
      Jeda menghentikan simulasi penuh (lanjut / keluar ke menu). Game over: ringkasan skor
      + Main Lagi + kembali ke Menu.
- [x] **Aset orisinal prosedural**
      Seluruh visual digambar sendiri via Skia (penyihir, 3 jenis monster, proyektil, efek
      cahaya, partikel, latar arena bergaya neon-occult). Tidak ada aset yang disalin dari
      game sumber.
- [x] **Berjalan di Expo Go dan siap build APK**
      Dependensi kompatibel Expo Go SDK 57 (Skia bundled); web preview untuk inspeksi cepat;
      checkpoint berisi konfigurasi app.config.ts + ikon launcher khas sehingga Dashboard
      dapat mem-build APK.
- [x] **Alur iterasi versi**
      Setiap perubahan yang siap uji dikommit sebagai checkpoint dengan pesan ringkasan
      perubahan versi (changelog) untuk dinilai pengguna.

## V2+ — Backlog (menunggu umpan balik penguji)

- Mantera & musuh tambahan, boss berkala
- Meta-progresion (upgrade permanen antar sesi), misi harian
- Efek suara & musik, haptik lebih kaya
- Papan skor online (server/database sudah tersedia di starter) bila diminta
