# Panduan Setup — KBM Generus Magelang Barat (Database: Google Sheets)

## Cara kerja
- **`Code.gs`** = backend. Ditempel ke Google Apps Script pada sebuah Google Sheet, lalu di-deploy sebagai *Web App* → jadi API sederhana yang membaca/menulis tab-tab di Sheet itu.
- **`kbm-generus-magelang-barat.html`** = aplikasinya. Dibuka di browser (HP/desktop), lalu disambungkan ke URL Web App tadi.
- Kalau belum disambungkan, aplikasi otomatis jalan di **mode demo** (data contoh di memori, hilang saat halaman di-reload) — jadi bisa dicoba dulu tanpa setup apa pun. Login demo: `admin` / `admin123` (Admin Master) atau `sukorejo` / `admin123` (Admin Kelompok).

## Langkah pasang ke Google Sheets (±5 menit)
1. Buka **sheet.new** → buat spreadsheet baru, beri nama misalnya "DB KBM Generus Magelang Barat".
2. Menu **Extensions → Apps Script**.
3. Hapus isi editor bawaan, lalu **tempel seluruh isi `Code.gs`**.
4. Di dropdown fungsi (atas), pilih **`setupSheets`**, klik **Run**. Ini akan:
   - Membuat 6 tab: `Users`, `Groups`, `Levels`, `Students`, `Attendance`, `AuditLog`
   - Mengisi jenjang standar, 1 kelompok contoh, dan 2 akun demo
   - (Saat run pertama akan minta izin akses — klik lanjut/izinkan)
5. Klik **Deploy → New deployment**:
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Klik **Deploy**, lalu salin URL yang diakhiri `/exec`
6. Buka file `kbm-generus-magelang-barat.html`, di halaman login klik **"Hubungkan ke Google Sheets"**, tempel URL tersebut, simpan.
7. Login dengan akun demo yang tadi dibuat otomatis:
   - Admin Master → `admin` / `admin123`
   - Admin Kelompok → `sukorejo` / `admin123`
   - **Segera ganti password lewat menu Admin Kelompok** setelah pemakaian nyata dimulai.

Setelah tersambung, semua data (kelompok, generus, absensi, log) otomatis tersimpan langsung di Google Sheets kamu — bisa dibuka manual di Sheets kapan pun untuk backup atau audit.

## Yang sudah berfungsi penuh
Login & role (Admin Master / Admin Kelompok) · manajemen kelompok · manajemen admin kelompok · data generus (tambah/ubah/hapus, filter jenjang) · absensi harian termasuk "Hadir Semua" · simulasi absensi biometrik · dashboard kedua role dengan grafik · rekap kehadiran dengan filter & export CSV · laporan cetak/PDF (lewat Print browser) berkop resmi · pencarian global · audit log.

## Yang masih berupa kerangka (roadmap, sesuai arahan di brief)
- **Fingerprint/biometrik nyata**: saat ini disimulasikan di UI. Untuk sensor sungguhan, sambungkan lewat WebAuthn (sensor bawaan HP/laptop) atau bridge API perangkat sensor eksternal — struktur data (`biometric_id`, `method`) sudah disiapkan di `Code.gs`.
- **Notifikasi WhatsApp ke orang tua**, **QR code**, **face recognition**, **jadwal & materi KBM**, **penilaian generus** — field dan arsitektur data pendukungnya (nomor WA, catatan, dsb.) sudah ada di tabel `Students`, tinggal dikembangkan sesuai prioritas berikutnya.
- Export **Excel (.xlsx) & PDF** saat ini lewat CSV + fitur Print browser (hasil setara PDF rapi berkop). Kalau perlu file .xlsx asli, bisa ditambahkan library seperti SheetJS di iterasi berikutnya.

## Catatan keamanan
Password di-hash (SHA-256) sebelum masuk ke Sheets — tidak tersimpan sebagai teks biasa. Untuk penggunaan produksi jangka panjang dengan data sensitif banyak orang, pertimbangkan migrasi ke database sungguhan (Supabase/PostgreSQL) begitu jumlah kelompok & generus sudah besar, karena Google Sheets punya batas kapasitas dan kecepatan baca/tulis.
