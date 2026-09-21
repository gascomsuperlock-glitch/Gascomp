<a id="set-up-gascomp-supabase"></a>
# Mengatur Gascomp Supabase

1. Buka proyek Supabase tujuan dan periksa objek yang ada di Editor Tabel.
2. Untuk proyek baru, jalankan file-file berikut secara berurutan di SQL Editor:
   - `supabase/migrations/202609100001_catalog.sql`
   - `supabase/migrations/202609100002_warranty.sql`
   - `supabase/migrations/202609110001_english_system_defaults.sql`
   - `supabase/migrations/202609110002_tutorial_video_sources.sql`
   - `supabase/migrations/202609110004_warranty_video_upload_limit.sql`
   - `supabase/migrations/202609140001_warranty_video_formats.sql`
   - `supabase/migrations/202609140002_tutorial_video_thumbnails.sql`
   - `supabase/migrations/202609140003_warranty_claim_eligibility.sql`
   - `supabase/migrations/202609150001_warranty_ticket_deletion.sql`
   - `supabase/migrations/202609150002_warranty_ticket_solution.sql`
   - `supabase/migrations/202609150003_gascomp_care_accounts.sql`
   - `supabase/migrations/202609150004_gascomp_care_coverage.sql`
   - `supabase/migrations/202609150005_gascomp_care_member_deletion.sql`
   - `supabase/migrations/202609160001_service_centers.sql`
3. Salin URL proyek, kunci publik, dan kunci rahasia ke `.env.local`. Pertahankan kunci server-hanya dan jangan pernah memberikan awalan `NEXT_PUBLIC_`. Kode juga menerima nama `SUPABASE_SERVICE_ROLE_KEY` legacy saat diperlukan.
4. Ulangi menjalankan server pengembangan setelah mengubah variabel lingkungan.
5. Buat draf produk, unggah gambar, dan publikasikannya. Konfirmasi bahwa pengunjung publik tidak dapat membaca draf dan browser lain dapat membaca produk yang dipublikasikan.
6. Serahkan klaim garansi dan konfirmasi bahwa hanya administrator yang telah otentikasi yang dapat menelusuri tiket atau mengunduh bukti.

Jika SQL mengembalikan `42P07: relation "products" already exists`, jangan hapus tabel atau jalankan ulang migrasi awal secara buta. Periksa migrasi mana saja yang sudah ada dan terapkan hanya migrasi selanjutnya yang hilang.

Bucket `product-images` dan `product-videos` bersifat publik dan harus berisi hanya foto produk yang terlihat oleh pelanggan serta tutorial. Unggahan video mendukung MP4/WebM hingga 50 MB, menggunakan URL unggah bertanda yang diterbitkan oleh endpoint admin. Migrasi video tutorial bersifat opsional untuk katalog yang sudah ada: Save mendeteksi skema dan mendukung kolom URL legacy. Bucket `product-videos` harus ada dengan batas ukuran dan MIME yang didokumentasikan sebelum mengunggah video. Bucket `warranty-evidence` bersifat privat. Metadata draf produk dilindungi oleh keamanan tingkat baris, tetapi URL yang diketahui dalam bucket publik tetap dapat diakses.

Aplikasi dan bucket `product-videos` menggunakan batas inklusif yang sama sebesar 52.428.800 byte (50 MB). Tidak diperlukan peningkatan batas bucket atau upgrade rencana.

Untuk proyek yang sudah ada, terapkan `202609110004_warranty_video_upload_limit.sql` sebelum membatasi video garansi 50 MB saat deploy. Pertahankan `warranty-evidence` bersifat privat. Batas faktur dan foto tetap 4 MB; batas permintaan Server Action 72 MB mencakup bukti gabungan dan overhead multipart.

Jalankan pemeriksaan koneksi hanya baca setelah konfigurasi:

```bash
npm run supabase:check
```

<a id="gascompcare-accounts"></a>
## Akun GascompCare

Untuk proyek yang sudah ada, periksa dan terapkan hanya migrasi GascompCare baru ketika secara eksplisit diotorisasi. Migrasi ini menggunakan URL dan konfigurasi rahasia server-only Supabase yang sudah ada; tidak ada pendaftaran pelanggan atau ketergantungan pada pengiriman email Supabase Auth. Tidak perlu pemberian hak akses tabel publik baru atau bucket Storage baru.

Setelah migrasi dalam proyek staging terisolasi, buka **GascompCare** di dashboard admin yang telah otentikasi, buat anggota tes fiktif, dan secara manual uji kredensial sementara. Konfirmasi bahwa login pertama memerlukan perubahan kata sandi, anggota hanya melihat kartu mereka sendiri, dan pengembalian kata sandi admin membatalkan sesi sebelumnya. Hapus kredensial tes dari draf pengiriman dan gunakan data non-produksi untuk validasi.

Akun bukan pembelian Care: referensi pesanan pasar yang opsional tidak mengaktifkan cakupan. Sinkronisasi pasar tetap ditangguhkan. Administrator dapat mencatat pembelian yang diverifikasi dan penggunaan klaim yang disetujui setelah migrasi cakupan terpisah. Lihat [Spesifikasi GascompCare](../product/features/gascomp-care.md).

Proxy hosting harus mempertahankan `Host` publik untuk pemeriksaan same-origin dan menambahkan atau mengganti `X-Forwarded-For` dengan alamat IP klien yang dipercaya. Otentikasi anggota menggunakan loncat IP akhir yang valid untuk batas bersama; nilai yang hilang atau tidak valid berbagi bucket fallback konservatif. Verifikasi perilaku ini pada pengaturan hosting target sebelum mengaktifkan akun untuk pelanggan.

<a id="preserve-existing-production-data-when-adding-gascompcare"></a>
## Jaga data produksi yang ada saat menambahkan GascompCare

Persiapan kode atau publikasinya ke GitHub tidak mengotorisasi penulisan database produksi. Dapatkan persetujuan terpisah sebelum menerapkan migrasi produksi atau membuat akun tes produksi. Validasi lokal di bawah ini tidak menetapkan bahwa cadangan produksi atau pengaturan hosting telah diverifikasi.

1. Konfirmasi proyek produksi Supabase yang dimaksud tanpa menyalin rahasia ke dalam laporan. Periksa riwayat migrasi dan katalog, garansi, Perawatan (Care), serta objek Penyimpanan yang ada. Catat jumlah baris sebelum migrasi dan nilai checksum konten untuk produk, garansi, bukti, dan metadata Penyimpanan yang ada.
2. Ambil dan verifikasi cadangan database yang dapat dipulihkan. Cadangkan file objek Penyimpanan secara terpisah dan verifikasi objek yang diekspor; cadangan database berisi metadata Penyimpanan, bukan byte gambar, video, atau file bukti. Pertahankan kedua cadangan tersebut secara rahasia.
3. Jika Perawatan (Care) tidak ada dan migrasinya belum diterapkan, terapkan hanya `supabase/migrations/202609150003_gascomp_care_accounts.sql` setelah persetujuan.
   Ini membuat tabel dan fungsi Perawatan baru di dalam `BEGIN`/`COMMIT` dan tidak menggantikan data katalog, garansi, atau Penyimpanan yang ada. Jangan jalankan ulang migrasi katalog/garansi awal, reset database, ganti skema lengkap, potong tabel, atau impor fixture pratinjau lokal ke produksi.
4. Jika objek Perawatan atau versi migrasi sudah ada, berhentilah dan bandingkan skema yang terpasang sebelum mengambil tindakan lebih lanjut. Migrasi ini sengaja menolak tabrakan nama alih-alih menggantikan akun yang ada. Jika sesi SQL dibiarkan dalam transaksi yang dibatalkan, izinkan `ROLLBACK`; jangan hapus objek bertabrakan atau hapus datanya untuk memaksa migrasi berjalan.
5. Bandingkan jumlah data yang ada dan checksum terhadap baseline pribadi. Lakukan perbandingan dalam jendela terkontrol atau hitung penulisan langsung yang diotorisasi. Konfirmasi visibilitas Penyimpanan dan aksesibilitas gambar/bukti yang ada secara representatif secara terpisah. Verifikasi tabel Perawatan, hak fungsi, RLS, dan `care_schema_ready()` melalui akses server yang diotorisasi.
6. Jalankan aplikasi mengikuti [prosedur rilis situs yang sudah ada](../product/operations/deployment.md#gascompcare-release-to-an-existing-site).
   Jika perlu pengunduran aplikasi, jalankan kembali revisi aplikasi sebelumnya sambil mempertahankan tabel Perawatan tambahan dan data anggota baru. Jangan gunakan reset database atau hapus tabel Perawatan sebagai mekanisme pengunduran aplikasi.

Suite regresinya SQL sekali pakai menabur produk, tiket, referensi bukti, bucket, dan metadata objek fiktif yang sudah ada. Ini memverifikasi bahwa migrasi Perawatan meninggalkan setiap baris yang ditabur tidak berubah dan bahwa mengulanginya gagal tanpa mengubah akun Perawatan yang ada atau data yang lebih lama. Ini juga menguji isolasi akun, akses peran, batas laju, kedaluwarsa, dan pengunduran transaksi kata sandi. Ini memverifikasi perilaku migrasi secara lokal; ini tidak membuat cadangan atau memeriksa proyek produksi.

<a id="service-center-local-database-preview"></a>
## Pratinjau database lokal Pusat Layanan

Direktori Pusat Layanan menggunakan URL Supabase `.env.local` yang ada dan rahasia server. Migrasi `202609160001_service_centers.sql` diterapkan ke proyek yang dikonfigurasi. Ini membuat tabel kosong awal, hanya untuk server; baca dan tulis anonim langsung serta autentikasi API Supabase ditolak.

Jalankan `npm run dev -- --hostname 127.0.0.1`, lalu buka
`http://localhost:3000/service-center` dan ruang kerja **Service Centers** di
`http://localhost:3000/admin`. Gunakan kredensial admin lokal yang ada.
Perubahan yang dibuat di sini bertahan di Supabase, meskipun aplikasi web berjalan secara lokal. Muncul pada direktori yang dihosting hanya setelah aplikasi dijalankan. Pertahankan lokasi uji coba teridentifikasi dengan jelas dan hapus hanya catatan mereka yang tepat setelah verifikasi; jangan reset database bersama.

Pengujian lokal tidak mengizinkan push branch atau deployment aplikasi.
Jangan ubah pengaturan hosting atau membuka server pengembangan melalui tunnel publik.
Fallback file lokal hanya digunakan ketika Supabase belum dikonfigurasi.
