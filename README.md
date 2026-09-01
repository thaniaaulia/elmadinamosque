# El-Madina Digital Signage

Digital signage masjid berbasis HTML, CSS, JavaScript, dan JSON yang cocok untuk GitHub Pages.

## Fitur
- Jadwal shalat berdasarkan koordinat perangkat.
- Metode perhitungan Kementerian Agama Republik Indonesia.
- Countdown real-time menuju shalat terdekat.
- Fallback otomatis ke Cibinong, Bogor jika izin lokasi ditolak.
- Kalender Hijriah.
- Pengumuman, agenda, running text.
- Pengaturan nama, mode lokasi, dan durasi slide.
- Responsive/fluid untuk TV, desktop, tablet, dan HP.
- Data konfigurasi tersedia di `data.json`.

## Deploy ke GitHub Pages
1. Buat repository baru.
2. Upload `index.html`, `styles.css`, `app.js`, dan `data.json`.
3. Settings → Pages.
4. Pilih `Deploy from a branch`.
5. Pilih branch `main` dan folder `/root`.
6. Save.

## Catatan akurasi
Jadwal diambil saat runtime dari AlAdhan API menggunakan koordinat perangkat dan method 20 (Kementerian Agama Republik Indonesia). Untuk operasional masjid, sebaiknya pengelola mencocokkan hasil dengan jadwal resmi/otoritas setempat dan melakukan penyesuaian jika diperlukan.

## HTTPS / izin lokasi
GitHub Pages menggunakan HTTPS, sehingga browser dapat meminta izin Geolocation. Jika pengguna menolak izin lokasi, aplikasi menggunakan fallback Cibinong, Bogor.

## API
AlAdhan API: https://api.aladhan.com/
