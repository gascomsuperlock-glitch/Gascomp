<a id="supabase-storage"></a>
# Penyimpanan Supabase

[Indeks spesifikasi](../spec.md)

Supabase PostgreSQL adalah database bersama utama; Supabase Storage menyimpan gambar produk dan bukti garansi.

| Kebutuhan | Penyimpanan |
| --- | --- |
| Produk, variasi, konten bantuan, dan status publikasi | PostgreSQL |
| File video tutorial | Bucket `product-videos` publik; unggahan admin ditandatangani, MP4/WebM hingga 50 MB |
| Thumbnail video tutorial | Bucket `product-images` publik di bawah `tutorial-thumbnails/`; unggahan admin ditandatangani, WebP/JPEG/PNG yang dihasilkan hingga 1 MB |
| File gambar produk | Bucket `product-images` publik; unggahan admin ditandatangani di bawah `products/{productId}/`, lalu metadata disimpan dengan **Save** eksplisit |
| Metadata gambar dan hubungan produk/variasi | PostgreSQL |
| Tiket garansi dan metadata bukti | Tabel PostgreSQL privat |
| Akun GascompCare, sesi, dan batas login | Tabel PostgreSQL privat; akses hanya server |
| Lokasi pusat layanan | PostgreSQL; pembacaan publik terbatas pada lokasi aktif |
| File bukti garansi | Bucket `warranty-evidence` privat; file video hingga 50 MB |
| Identitas sumber Duoke dan riwayat impor | PostgreSQL |
| Sesi bantuan AI, tugas, snapshot pengetahuan, dan status runtime | Tabel PostgreSQL privat; akses server dan worker melalui aplikasi |
| Catatan grafik produk/pengetahuan | Arsip Obsidian proyek |

Klien publik hanya dapat membaca produk yang dipublikasikan dan konten terkait mereka. Produk yang diarsipkan yang pernah dipublikasikan tetap dapat dibaca melalui URL stabilnya. Draf, tiket, bukti, run impor, dan semua penulisan memerlukan kunci rahasia sisi server. Server Actions dan endpoint admin content-save memverifikasi sesi admin sebelum perubahan dilindungi. Endpoint content-save juga memverifikasi asal permintaan.

Aplikasi mempertahankan identitas sumber yang stabil untuk mencegah duplikat. Impor Duoke dan gudang memperbarui bidang milik sumber sambil mempertahankan konten yang dikelola oleh administrator.

Alur data: **Duoke atau gudang → validasi/normalisasi → Supabase → panel admin dan website pelanggan**. Catatan Obsidian dihasilkan dari catatan produk dan pengetahuan yang sama.

Status: tabel katalog, konten bantuan, riwayat impor, tiket garansi, dan bukti telah diimplementasikan. Bucket `product-images` dan `warranty-evidence` dikonfigurasi. Lihat [penyiapan Supabase](../../setup/supabase.md).

<a id="automated-migration-baseline"></a>
## Baseline migrasi otomatis

`supabase/release-baseline.json` mengunci proyek yang ada, hash file SQL sebelum `202609160002`, dan lima entri riwayat migrasi yang diamati selama
persiapan rilis pada 16 September. File historis dibekukan dan dikeluarkan dari
eksekusi otomatis. Ini tidak menandai migrasi yang tidak dilacak sebagai sudah diterapkan:
beberapa perubahan diterapkan secara manual, dan migrasi sumber kolom tutorial opsional tetap ditunda. Jangan gunakan blanket `supabase db push` terhadap
riwayat ini. Rekonsiliasi perubahan legacy secara terpisah jika menjadi diperlukan.

File SQL baru berurutan dari `202609160002` ke depan diterapkan melalui
API Manajemen oleh `scripts/supabase/release-migrations.mjs`. Nama remote adalah
`release_<local-version>_<full-SHA256-of-SQL>`, sementara Supabase menetapkan versi remote. Ini mempertahankan identitas file lokal yang dapat diverifikasi tanpa mengubah
catatan versi historis Supabase. Mengedit/hapus file yang diterapkan, memperkenalkan migrasi sebelum migrasi otomatis yang sudah diterapkan, mengubah SQL legacy, memilih proyek lain, atau menghadapi riwayat remote yang tidak terduga menghentikan rilis untuk ditinjau.

Setiap POST sukses harus dikonfirmasi dalam riwayat remote sebelum promosi file atau aplikasi berikutnya. Tidak ada POST gagal yang otomatis diulang. Setelah kegagalan jaringan ambigu, periksa riwayat remote dan skema sebelum menjalankan ulang; jika nama yang tercatat cocok, jalannya berikutnya akan melewatinya. Penulisan database melalui klien lain tidak boleh berjalan secara bersamaan dengan rilis. Identifikasi versi CLI lokal dan remote sengaja berbeda untuk rilis otomatis; API runner adalah mekanisme rilis produksi.

Migrasi otomatis pertama memperluas hanya batasan solusi jaminan eksisting untuk menerima `usage_guidance`. Uji SQL terisolasinya memverifikasi pelestarian baris historis, nilai lama/baru, nilai yang ditolak yang tidak valid, dan RLS yang ada.

`202609180001_catalog_save_snapshot.sql` menambahkan fungsi snapshot katalog stabil dan baca saja untuk alur **Save** admin. Fungsi ini menggabungkan pengaturan, produk, konten anak, dan kemampuan kolom video opsional dalam satu respons database. Izin eksekusi terbatas pada `service_role`; klien anonim dan terautentikasi tidak dapat memanggilnya. Fungsi tidak menyimpan salinan katalog lain atau mengubah baris yang ada.

<a id="product-image-diagnosis-on-september-11-2026"></a>
## Diagnosis gambar produk pada 11 September 2026

Website live berisi URL gambar yang tercatat dalam `product_images`, tetapi permintaan gambar publik sampel mengembalikan HTTP 400 dengan `Object not found` / `NoSuchKey`. Bucket `product-images` bersifat publik; daftar root dan prefiks `warehouse` serta `products` tidak mengembalikan objek. Ada 29 catatan metadata gambar. Ini adalah kekurangan konten Storage, bukan masalah URL frontend atau visibilitas bucket.

Pengguna mengotorisasi pemulihan produksi dari buku kerja gudang yang disediakan. Semua 29 gambar referensi kini telah dipulihkan ke jalur Storage mereka yang ada. Dua puluh delapan file JPG berasal dari link gudang asli mereka. Pengganti untuk foto `GRS-915` yang diunggah secara manual berasal dari link buku kerja SKU yang tepat dan dikonversi menjadi PNG untuk mempertahankan URL publiknya yang ada. Tidak ada perubahan metadata produk atau gambar, dan tidak ada objek Storage yang ditimpa.

Verifikasi: semua 29 URL gambar publik mengembalikan HTTP 200 dengan konten gambar, halaman home Hostinger live berisi semua 29 referensi gambar, dan halaman produk `GRS-915` mengembalikan HTTP 200 dengan gambarnya yang dipulihkan. Permintaan terautentikasi ke panel admin live merender 29 URL gambar, semuanya dapat diakses. Ceksum pemulihan dan hasilnya dicatat secara lokal di `.data/image-recovery/restoration-result.json`
dan `.data/image-recovery/production-verification.json`. Memulihkan URL Storage yang ada berlaku dalam aplikasi yang dideploy tanpa deployment kode. Cek Chromium Headless lulus di desktop (1440 px) dan mobile (390 px): semua sembilan gambar produk pada halaman katalog publik pertama dan semua 29 gambar produk admin dimuat dengan dimensi alami bukan nol. Screenshot dan laporan verifikasi browser disimpan di `.data/image-recovery/`.

<a id="tutorial-video-source-migration"></a>
## Migrasi sumber video tutorial

`202609110002_tutorial_video_sources.sql` menambahkan kolom `video_url` dan
`storage_path` yang nullable ke `tutorial_videos`, mengisi kembali link YouTube legacy, dan
membuat bucket publik `product-videos` dengan batas 50 MB dan daftar izin MIME MP4/WebM. Aplikasi juga mendukung skema eksisting: ia menyimpan semua URL sumber video di kolom `youtube_url` legacy dan menurunkan jalur file yang diunggah dari URL Storage. Ketika kolom opsional ada, simpan mengisi kedua kolom URL dan `storage_path`. Ini memungkinkan deployment bergulir tanpa mengganggu Simpan. Tidak ada kebijakan penulisan Storage anonim yang diperkenalkan. Migrasi SQL disiapkan secara lokal dan belum diterapkan ke produksi.

Pada 11 September 2026, bucket produksi `product-videos` dibuat dan diverifikasi sebagai publik dengan batas 52.428.800 byte dan hanya `video/mp4` dan
`video/webm` yang diterima. Migrasi SQL metadata tetap opsional dan belum diterapkan; aplikasi yang dideploy dapat menggunakan skema katalog eksisting.

<a id="tutorial-upload-limit-increase"></a>
### Peningkatan batas unggah tutorial

Peningkatan kapasitas sebesar 150 MB pada tanggal 11 September 2026 ditolak oleh Supabase dengan HTTP 413. Pengguna kemudian memilih untuk mempertahankan 50 MB. Label aplikasi, validasi browser, validasi server, dan bucket `product-videos` produksi sekarang menggunakan batas inklusif yang sama sebesar 52.428.800 byte. Migrasi `202609110003_tutorial_video_upload_limit.sql` yang belum diterapkan ditarik kembali; tidak ada perubahan Storage atau rencana yang diperlukan.

## Migrasi thumbnail video tutorial

`202609140002_tutorial_video_thumbnails.sql` menambahkan kolom `thumbnail_url` dan `thumbnail_storage_path` yang dapat bernilai null ke `tutorial_videos`. Browser mengekstrak empat frame dari file MP4/WebM yang dipilih dan mengunggah hanya thumbnail WebP, JPEG, atau PNG yang dipilih administrator ke bucket `product-images` publik yang ada. Browser lebih menyukai WebP dan mempertahankan tipe canvas fallback aslinya ketika enkoding WebP tidak tersedia. Metadata yang sama juga mendukung penggantian thumbnail pada tutorial yang sudah diunggah tanpa mengunggah ulang videonya. Daftar tutorial pelanggan dan poster player native membaca URL yang disimpan.

Aplikasi terus membaca baris tutorial sebelum migrasi penambahan ini. Ia tidak mengeluarkan URL unggah thumbnail atau menyimpan metadata thumbnail sampai kolom baru tersedia, sehingga database lama menerima kesalahan yang dapat ditindaklanjuti tanpa kehilangan status editor yang dipangkas.

Pada tanggal 14 September 2026, migrasi ini diterapkan ke produksi dan riwayat remote-nya diselaraskan dengan versi lokal `202609140002`. Kedua kolom tersedia, semua delapan baris tutorial yang ada mempertahankan checksum konten yang sama, dan nilai thumbnail baru mereka tetap null. Bucket `product-images` yang ada tetap publik dengan batas objek 5 MB dan dukungan WebP. Rekam verifikasi disimpan secara lokal di `.data/tutorial-thumbnail-migration/`.

## Batas unggah video garansi

`202609110004_warranty_video_upload_limit.sql` meningkatkan batas per-file bucket `warranty-evidence` privat menjadi 52.428.800 byte (50 MB), sejalan dengan validasi video garansi. Ia mempertahankan visibilitas, tipe MIME yang diizinkan, objek, dan kebijakan. Pengunggahan faktur dan foto tetap dibatasi hingga 4 MB oleh aplikasi. Batas permintaan Server Action adalah 72 MB untuk mengakomodasi semua bukti yang diperbolehkan dalam satu pengajuan. Tidak ada akses publik baru atau kebijakan unggah yang diperkenalkan.

Pada tanggal 11 September 2026, pembaruan bucket produksi ekuivalen diterapkan melalui API Storage dan diverifikasi: `warranty-evidence` sekarang mengizinkan 52.428.800 byte, tetap privat, dan mempertahankan daftar izin MIME yang ada. Tidak ada tiket, objek bukti, atau kebijakan akses yang diubah.

## Format video garansi

`202609140001_warranty_video_formats.sql` memperluas daftar izin MIME bucket garansi privat dengan Matroska, AVI, 3GP, MPEG, MPEG-TS, WMV, FLV, dan Ogg video. Aplikasi mendeteksi kontainer dari byte, memverifikasi sepenuhnya decoding video, dan menyimpan tipe MIME video kanonik daripada mempercayai metadata browser.

Pada tanggal 14 September 2026, pembaruan penambahan ekuivalen diterapkan melalui API Storage dan diverifikasi: semua 15 tipe MIME diizinkan, bucket tetap privat, dan batas filenya tetap 52.428.800 byte. Objek yang ada dan kebijakan akses tidak berubah. Rekam verifikasi lokal berada di `.data/warranty-video-formats/bucket-before.json` dan `bucket-after.json`.

## Kelayakan klaim garansi

`202609140003_warranty_claim_eligibility.sql` menambahkan pemicu `BEFORE INSERT` untuk tiket garansi baru. Ia menolak tanggal pembelian masa depan atau kadaluarsa dan menggunakan kunci transaksi tingkat advisory untuk menserikan pengiriman dengan nomor pesanan yang dipotong (trimmed) dan tidak sensitif huruf besar-kecilan serta SKU yang sama sebelum memeriksa tiket yang ada. Tiket historis tetap tidak berubah, dan indeks ekspresi pendukung tidak unik sehingga catatan duplikat yang ada tidak menghalangi migrasi. Terapkan migrasi ini sebelum mengandalkan perlindungan tingkat database untuk pengiriman simultan.

<a id="warranty-ticket-deletion"></a>
## Penghapusan tiket garansi

`202609150001_warranty_ticket_deletion.sql` menambahkan stempel waktu `deleted_at` yang dapat bernilai null yang digunakan untuk penghapusan lunak. Tiket yang dihapus dan bukti pribadinya tetap berada di PostgreSQL dan Storage sehingga identitas klaim tetap tersedia bagi aturan satu-klaim, sementara pembacaan aplikasi mematahkannya dari kotak masuk admin dan menolak akses bukti langsung. Terapkan migrasi ini sebelum mengaktifkan penghapusan dalam deployment berbasis Supabase.

<a id="gascompcare-member-accounts"></a>
## Akun anggota GascompCare

`202609150003_gascomp_care_accounts.sql` memperkenalkan akun anggota pribadi, sesi yang di-hash, batas percobaan login yang dibagikan, dan fungsi autentikasi transaksional. Ia tidak membuat pembelian Care atau mengubah aturan garansi yang ada. Lihat [GascompCare](../features/gascomp-care.md) untuk perilaku dan batas keamanan. Pada 15 September 2026, rilis yang diotorisasi oleh pemilik menerapkan migrasi ini ke proyek produksi yang ada dan menyelaraskan sejarahnya dengan versi lokal `202609150003`. Semua 247 baris yang ada di sembilan tabel aplikasi dan dua tabel metadata Storage tetap identik. RLS diaktifkan pada ketiga tabel Care; panggilan kesiapan anonim ditolak dan peran layanan diperbolehkan. Tidak dibuat anggota produksi atau tiket uji coba.

Salinan data aplikasi pribadi, definisi skema, dan skrip pemulihan data disimpan di bawah `.data/gascomp-care-release/`. Semua 247 baris dipulihkan dengan kendala relasional dalam mesin PostgreSQL yang dapat dibuang, dan migrasi Care mempertahankan data yang dipulihkan itu. Semua 88 file Storage (113.326.093 byte) didownload dan diverifikasi berdasarkan ukuran dan pembacaan SHA-256. Ini adalah cadangan data aplikasi dan Storage, bukan cadangan proyek terkelola/peran penuh; `pg_dump` tidak tersedia karena Docker/Podman belum terinstal.

Tanpa migrasi, Care melaporkan ketidaktersediaan sementara katalog yang ada dan fitur garansi mempertahankan perilakunya.


<a id="gascompcare-coverage-and-claim-usage"></a>
## Jangkauan GascompCare dan penggunaan klaim

`202609150004_gascomp_care_coverage.sql` menambahkan buku pembelian Care pribadi dan buku klaim yang disetujui. Setiap pembelian yang diverifikasi memiliki periode berbasis kalender dan kuota tiga klaim per tahun pembelian. Fungsi mutasi yang dibatasi menegakkan kepemilikan, referensi unik yang dinormalisasi, tanggal, dan batas klaim yang terserikat; peran publik tidak memiliki akses. Catatan akun, katalog, garansi, dan Storage yang ada tidak berubah. Catatan pesanan akun tidak dikonversi menjadi jangkauan.

Pada 15 September 2026, rilis yang diotorisasi oleh pemilik menerapkan migrasi ini ke produksi dengan versi sejarah `202609150004`. Tidak dibuat pembelian atau klaim selama peluncuran. Cadangan jangkauan yang hilang menampilkan kesalahan jangkauan eksplisit sementara akses akun berlanjut.


<a id="gascompcare-member-deletion"></a>
## Penghapusan anggota GascompCare

`202609150005_gascomp_care_member_deletion.sql` menambahkan penghapusan lunak dengan penanganan batch atomik dan pencabutan sesi. Mutasi autentikasi dan cakupan menolak akun yang dihapus, termasuk permintaan yang bersaing dengan penghapusan. Akun, pembelian, klaim, nama pengguna, dan referensi pembelian tetap dipertahankan; tidak ada data penyimpanan atau garansi yang dihapus. Daftar admin hanya membaca akun aktif.

Pada 15 September 2026, rilis yang diotoritaskan pemilik menerapkan migrasi ini setelah cakupan dan menyelaraskan versi sejarah `202609150005`. Tidak ada anggota yang dihapus selama penyebaran. RLS tetap aktif, peran publik tidak dapat mengonfirmasi klaim atau menghapus anggota, dan peran layanan mempertahankan operasi perlindungan yang diperlukan.

Snapshot baru dari 14 tabel yang sudah ada memverifikasi bahwa seluruh 247 baris tetap sama setelah kedua migrasi, selain penanda penghapusan nullable yang baru. Seluruh 88 file Storage diverifikasi terhadap metadata remote yang tidak berubah dan cadangan SHA-256 lokal. Pemulihan data dan kedua migrasi lulus pada database sementara sebelum perubahan produksi. Catatan privat berada di `.data/gascomp-care-release-2/`. Deployment aplikasi ke hosting masih memerlukan verifikasi terpisah.

<a id="service-center-directory"></a>
## Direktori Pusat Layanan

`202609160001_service_centers.sql` membuat tabel `service_centers` yang awalnya kosong dengan lokasi, detail kontak, jam buka, tautan Google Maps opsional, koordinat wajib, dan status aktif. Kode provinsi mengikuti [Klasifikasi Provinsi BPS](https://sirusa.web.bps.go.id/metadata/variabel/326536) mencakup seluruh 38 provinsi Indonesia. Batas koordinat memberikan validasi kasar area Indonesia; administrator tetap bertanggung jawab untuk menempatkan pin di alamat dan provinsi yang benar.

RLS aktif dan hak akses tabel anonim/terotentikasi dicabut untuk baca dan tulis. Server aplikasi menggunakan kunci layanan server-hanya dan mengembalikan hanya lokasi aktif ke direktori. Mutasi admin memverifikasi sesi admin dan asal permintaan. Baca dibagikan sehingga direktori di luar batas baris API tetap lengkap. Deaktivasi mempertahankan catatan untuk pengeditan masa depan.

Ketika Supabase sepenuhnya tidak dikonfigurasi, pengembangan lokal satu-proses menggunakan file `.data/service-centers.json` yang diabaikan, awalnya tidak ada dan diperlakukan sebagai daftar kosong. Penulisan file diserialisasi dalam proses dan diganti secara atomik. Database parsial yang dikonfigurasi, migrasi hilang, atau kesalahan database mengembalikan keadaan tidak tersedia eksplisit dan tidak pernah beralih ke data lokal.

Pada 16 September 2026, pemilik mengotoritaskan pengujian berbasis database melalui localhost. Migrasi ini diterapkan ke proyek Supabase yang dikonfigurasi dan diselaraskan dengan versi sejarah `202609160001`. Akses API publik langsung tetap ditolak, termasuk untuk baris aktif. Aplikasi belum diimplementasikan; rute `/service-center` live masih mengembalikan 404.

Pemeriksaan browser berbasis database hanya menggunakan aplikasi lokal. Dua catatan lokasi sementara dihapus dengan ID yang tepat, meninggalkan `service_centers` kosong. Ceksum sebelum/sesudah mengonfirmasi bahwa seluruh 247 baris yang ada di tabel metadata aplikasi dan Penyimpanan 16 tidak berubah. Baca API anonim dan terotentikasi diverifikasi sebagai ditolak. Catatan verifikasi lokal berada di `.data/service-center-validation/`.

<a id="ai-assistance-product-context-migration"></a>
## Migrasi konteks produk bantuan AI

`202609170002_ai_assistance_resolved_sku.sql` memperluas penyelesaian pekerja terautentikasi dengan `resolvedSku` untuk menghasilkan nama produk atau SKU yang secara unik dapat disimpulkan. Sebuah SKU tugas eksplisit tidak dapat ditimpa. Entri yang dipilih harus sesuai dengan konteks efektif; pemeriksaan snapshot, bahasa, sewa, dan tenggat waktu tetap berlaku. Pratinjau AI lokal menerapkan migrasi secara berurutan tanpa menghapus percakapan. Aplikasi produksi menggunakan alur rilis yang diotorisasi.

<a id="ai-assistance-generated-response-migration"></a>
## Migrasi respons bantuan AI yang dihasilkan

`202609170003_ai_assistance_grounded_responses.sql` menambahkan kontrak respons berbasis fakta bersama penyelesaian jawaban-ID warisan. ID sumber dan dasar respons dipertahankan dengan pesan asisten yang dihasilkan. Klaim membawa sejarah terbatas hanya dari sesi yang sama; permintaan pelanggan tidak dapat menyediakan sesi berbeda atau sejarah terpercaya sembarang. Konteks produk yang ambigu tetap eksplisit dan memungkinkan klarifikasi umum tanpa mempublikasikan fakta produk yang ditebak.

Penyelesaian yang dihasilkan memvalidasi bentuk respons, teks biasa, asal usul aktif, konteks produk, kesiapan, versi snapshot, sewa tugas, dan tenggat waktu. Hanya respons jenis handoff yang memungkinkan tautan WhatsApp kontekstual. Akses cookie tidak transparan, RLS, kredensial pekerja pribadi, retensi, dan perlindungan ulang tetap berlaku. Pratinjau lokal menerapkan migrasi ini setelah dua migrasi AI sebelumnya tanpa menghapus percakapan yang disimpan. Produksi tetap tunduk pada alur rilis yang diotorisasi.
