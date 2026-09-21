<a id="gascompcare-membership-and-warranty-extensions"></a>
# Perpanjangan anggota GascompCare dan garansi produk

[Spesifikasi indeks](../spec.md)

<a id="product-agreement"></a>
## Kesepakatan produk

GascompCare adalah perlindungan tambahan yang dibayar untuk satu item tertentu yang dibeli, terpisah dari garansi produk yang disertakan. Satu unit Care memberikan satu tahun perlindungan dan hingga tiga klaim tambahan. Dua unit memberikan dua tahun dan hingga enam klaim tambahan; N unit memberikan N tahun dan hingga 3 × N klaim tambahan. Tanggal pembelian Care memulai periode perlindungan, bukan tanggal login atau tanggal operator memasukkan pembelian. Satu akun memiliki satu kartu anggota virtual; setiap catatan perlindungan mengidentifikasi item spesifik yang dilindungi.

Deskripsi terbaru pemilik tentang garansi produk yang disertakan memungkinkan satu hingga tiga klaim. Kebijakan pastinya masih akan didefinisikan secara terpisah. Implementasi [Klaim Garansi](warranty.md) tetap mematuhi aturan satu-klaim yang didokumentasikan dan tidak berubah oleh fitur ini.

Administrator mencatat pembelian Care yang diverifikasi dan penggunaan klaim yang disetujui secara manual. Sebuah pembelian mengidentifikasi satu item dilindungi, referensi pesanan Care, tanggal pembelian aktual, dan jumlah unit (1–10 per catatan). Setiap pembelian memiliki periode perlindungan sendiri dan saldo klaim. Pembelian pada tanggal yang berbeda tetap terpisah; sistem tidak menggabungkan periode mereka atau mengalokasikan kembali klaim antar pembelian. Pembuatan akun saja tidak mengaktifkan perlindungan.

Sinkronisasi pasar, kode QR yang berfungsi, pengembalian dana, koreksi pembelian, dan alokasi otomatis antara tiket garansi disertakan dan Care ditangguhkan. Sebuah klaim yang disetujui dicatat secara manual terhadap pembelian Care-nya; alur kerja tiket garansi biasa tidak secara otomatis mengonsumsi kuota Care.

<a id="customer-access"></a>
## Akses pelanggan

Header publik menyediakan menu **GascompCare** yang terlihat di desktop dan mobile, termasuk halaman beranda, panduan produk, dan formulir garansi. Rute publik yang ada, tujuan QR produk yang dicetak, dan tautan kontak dukungan legacy tetap stabil.

- `/gascomp-care` memerlukan sesi anggota dan hanya menampilkan profil anggota tersebut dan kartu virtualnya.
- `/gascomp-care/login` menerima nama pengguna dan kata sandi. Akun dibuat oleh administrator; tidak ada pendaftaran publik atau pengiriman pesan otomatis.
- `/gascomp-care/change-password` memerlukan kata sandi saat ini dan konfirmasi penggantian. Kredensial sementara memerlukan langkah ini sebelum akses anggota.
- Pelanggan dapat keluar dan mengubah kata sandi mereka. Kata sandi yang dilupakan ditangani oleh administrator setelah pelanggan menghubungi dukungan.

Halaman pelanggan mendukung Bahasa Inggris dan Bahasa Indonesia menggunakan preferensi bahasa yang ada. Metadata, validasi, dan label aksesibilitas dilokalisasi. Halaman akun dikecualikan dari indeksing dan data anggota tidak dikunci secara publik.

Halaman anggota menampilkan identitas resmi Gascomp, nama pelanggan, nomor anggota permanen, dan bagian perlindungan untuk setiap pembelian yang dicatat. Setiap bagian menampilkan item dilindungi, tanggal mulai, tanggal akhir inklusif, status aktif/habis/terhabis dan klaim yang tersisa yang dapat digunakan. Jumlah yang digunakan, referensi klaim internal, dan riwayat disimpan untuk tampilan detail admin dan tidak dikirim ke halaman pelanggan. Perlindungan yang kadaluarsa menampilkan nol klaim yang dapat digunakan meskipun sebagian kuota asli belum terpakai.

Tanggal cakupan dimulai pada tanggal pembelian Care yang sebenarnya di zona waktu Asia/Jakarta dan berjalan hingga hari sebelum ulang tahun kalender N-nya. Ulang tahun 29 Februari dibulatkan menjadi 28 Februari pada tahun non-kabisat, lalu dikurangi satu hari untuk akhir inklusif. Sebagai contoh, pembelian satu unit pada 15 September 2026 mencakup hingga 14 September 2027 dan mengizinkan hingga tiga klaim disetujui; dua unit mencakup hingga 14 September 2028 dengan hingga enam klaim.

Akun tanpa pembelian yang tercatat menampilkan status kosong eksplisit, bukan kedaluwarsa dibuat-buat atau saldo nol. Data cakupan yang tidak tersedia menampilkan kesalahan yang dapat dicoba ulang, bukan daftar pembelian kosong. Pelanggan dapat memperbarui detail; halaman yang terlihat diperbarui setiap menit dan saat fokus untuk memperbarui penggunaan dan kedaluwarsa. Bacaan memperoleh kepemilikan secara eksklusif dari sesi anggota, dan akun yang menunggu penggantian kata sandi tidak dapat membaca cakupan. Tidak ada QR yang berguna yang diterbitkan.

<a id="admin-account-management"></a>
## Manajemen akun admin

**GascompCare** muncul setelah **Warranty tickets**. Administrator dapat mencari anggota berdasarkan nama, nama pengguna, atau nomor anggota, menelusuri 20 hasil per halaman, membuat akun, memeriksa anggota, mereset kata sandi, dan menghapus akun. Daftar awal kosong.

Pembuatan mengumpulkan nama, nama pengguna, nomor WhatsApp, dan referensi pesanan Shopee opsional. Referensi tersebut adalah catatan operator, bukan pembelian yang diverifikasi atau hak akses. Nama pengguna unik setelah normalisasi huruf kecil dan menggunakan 3–32 huruf ASCII, angka, titik, garis bawah, atau tanda hubung.

Server menghasilkan nomor anggota stabil dan kata sandi sementara acak. Kata sandi sementara hanya dikembalikan setelah pembuatan atau reset sehingga administrator dapat menyalinnya untuk pengiriman manual melalui WhatsApp atau obrolan pasar. Penolakan atau navigasi menghapus kredensial yang terlihat. Kata sandi yang ada tidak dapat dibaca. Jika respons sukses hilang, administrator dapat menemukan akun dan mereset kata sandi daripada membuat akun lain.

Reset kata sandi memerlukan konfirmasi, mencabut sesi yang ada, dan memerlukan perubahan kata sandi pada login berikutnya. Operasi anggota bertahan segera dan tidak menggunakan alur Simpan/Batalkan katalog. Perubahan katalog yang belum disimpan bertahan saat berpindah antara tampilan dashboard.

<a id="selection-and-deletion"></a>
### Pemilihan dan penghapusan

**Select Members** mengaktifkan kotak centang dalam daftar anggota. **Select all on this page** hanya memilih anggota pada halaman yang terlihat, dan **Delete Selected** menghapus akun yang secara eksplisit dipilih. Pemilihan dibersihkan saat mencari, mengubah halaman, atau meninggalkan mode pemilihan, sehingga hasil tersembunyi tidak pernah dihapus secara implisit. Detail anggota juga menawarkan **Delete Member** untuk satu akun.

Penghapusan memerlukan konfirmasi, menyembunyikan akun dari daftar anggota aktif, dan segera mengakhiri akses pelanggan. Ini menandai `deleted_at` dan mencabut sesi; ini tidak menghapus fisik anggota, pembelian, klaim, atau data pelanggan lainnya. Nomor anggota dan nama pengguna tetap dipertahankan sebagai cadangan. Akun yang dihapus tidak dapat login, mereset atau mengubah kata sandi, membuat pembelian, atau mengonfirmasi klaim. Referensi pembelian dan klaim yang ada tetap dipertahankan sebagai cadangan untuk melindungi duplikasi. Tidak ada antarmuka pemulihan dalam rilis ini.

Server menerima 1–100 UUID eksplisit, memvalidasi seluruh batch, dan melakukan penghapusan atomik. ID yang tidak dikenal menolak batch; mencoba ulang akun yang sudah dihapus aman. Kunci database serialisasi penghapusan dengan perubahan kredensial dan cakupan. Permintaan gagal atau tidak pasti tidak menampilkan kesuksesan palsu. Penghapusan sukses menghapus detail terpengaruh dan kredensial sementara serta memperbarui daftar.

Anggota yang dipilih juga memiliki panel **Coverage and claims**. **Add Care Purchase** mempertahankan pembelian yang diverifikasi oleh operator secara langsung. **Confirm Claim** adalah satu tombol dalam tampilan detail kartu, dengan dialog konfirmasi; satu konfirmasi sukses menggunakan satu klaim. Admin melihat klaim terpakai/total dan riwayat berhari-hari. Server menentukan hari ini di Asia/Jakarta dan menggunakan identifikasi permintaan internal, sehingga admin tidak memasukkan tanggal referensi atau penggunaan. Jaminan yang kadaluarsa atau habis tidak dapat menerima konfirmasi baru. Referensi dinormalisasi secara case-insensitif dan unik antar anggota untuk mencegah pembelian atau klaim ganda. Mengulang identifikasi permintaan yang sama bersifat idempoten; admin mempertahankan identifikasi tersebut setelah kesalahan jaringan ambigu dan menggantinya hanya setelah sukses dikonfirmasi. Cek kuota klaim dan insert memegang kunci baris pembelian.

Kartu pratinjau terpisah diberi label **Sample** dan menggunakan data fiktif, satu tahun, hingga tiga klaim, dan placeholder QR non-fungsional. Itu tidak pernah mewakili pembelian atau jaminan aktual pelanggan.

<a id="authentication-and-storage"></a>
## Autentikasi dan penyimpanan

<a id="one-local-website"></a>
### Satu situs web lokal

Gunakan `npm run dev` di `http://localhost:3000` untuk semua fitur aplikasi. Perintah pengembangan secara eksplisit mendedikasikan port 3000; invokasi kedua tidak boleh menciptakan situs web lokal yang berbeda secara diam-diam. Situs web sebelumnya pada port 3100 sudah usang. Kredensial administrator berasal dari konfigurasi proyek normal.

Variabel `GASCOMP_CARE_PREVIEW_URL` dan `GASCOMP_CARE_PREVIEW_KEY` opsional dalam `.env.local` yang diabaikan hanya menghubungkan GascompCare ke database uji coba loopback yang ada. Katalog, alur kerja garansi biasa, dan koneksi Supabase yang dikonfigurasi tetap tidak berubah. Pengecer database adalah layanan latar belakang, bukan situs web kedua. Gerbang lokal mempertahankan akun uji coba, sesi, pembelian, dan klaim dalam direktori data pribadi yang diabaikan sehingga menyalinkannya menyimpan catatan yang ada.

Penyimpangan ini tersedia hanya dalam pengembangan dan mengizinkan hanya database loopback HTTP. Pengaturan yang tidak valid atau tidak lengkap, atau database pratinjau yang tidak tersedia, melaporkan ketidaktersediaan tanpa jatuh kembali ke database utama. Pembangun produksi dan `npm run start` mengabaikan kedua variabel pratinjau dan menggunakan proyek Supabase yang dikonfigurasi. Anggota uji coba lokal tidak pernah disalin ke produksi oleh push Git, build, atau migrasi. Lihat [Supabase setup](../../setup/supabase.md) untuk mempertahankan konten database dan Storage yang ada selama rollout yang secara eksplisit diotorisasi.

<a id="sessions"></a>
### Sesi

Autentikasi anggota terpisah dari autentikasi admin yang ada. Supabase menyimpan akun, sesi terhash dan penghitung percobaan login bersama. Tidak ada fallback penyimpanan lokal atau mock-auth ketika Supabase tidak tersedia. Antarmuka melaporkan ketidaktersediaan sementara dan tidak mengeluarkan kredensial atau sesi.

Kata sandi menggunakan Node scrypt asinkron dengan N=32768, r=8, p=3, garam acak per kata sandi, dan batas memori 64 MiB. Kata sandi pelanggan menggunakan 8–128 karakter. Hanya hash kata sandi dan parameter yang disimpan. Kata sandi dan token sesi tidak boleh muncul dalam log atau respons daftar anggota.

Sesi menggunakan token acak disimpan sebagai hash di database dan kadaluarsa setelah delapan jam. Cookie anggota terpisah adalah HTTP-only, SameSite=Lax, berskala ke `/gascomp-care`, dan aman dalam produksi. Logout mencabut sesi server. Perubahan kata sandi dan reset secara atomik membuat sesi lama tidak valid. Sesi yang menunggu penggantian kata sandi hanya dapat mengubah kata sandi atau keluar.

Pengembangan lokal normal mendukung HTTP cookies tanpa flag tambahan. Untuk memeriksa loopback pada build produksi terpisah, `GASCOMP_LOCAL_HTTP_PREVIEW=true` memungkinkan WebKit/Safari mempertahankan sesi melalui HTTP; peluncur pengembangan saat ini tidak mengatur flag ini.
Penulisan cookie admin dan anggota mengabaikan Secure hanya ketika flag tersebut aktif dan permintaan memiliki HTTP Origin/Host yang cocok secara tepat pada `localhost`, `127.0.0.1`, atau `[::1]`. HTTPS, host non-loopback, asal yang rusak/tidak cocok, dan deployment tanpa flag mempertahankan Secure. Jalur cookie, HTTP-only, SameSite, kadaluarsa, verifikasi password, dan pembatalan sesi database tetap tidak berubah.

Setiap pembacaan dan mutasi dilindungi memverifikasi sesi sisi server saat ini. Identitas anggota berasal dari sesi tersebut, bukan ID anggota yang disuplai klien. Operasi akun admin memverifikasi sesi admin; mutasi juga memverifikasi asal permintaan. Keamanan tingkat baris dan hak akses database membatasi tabel dan fungsi anggota untuk akses sisi server. Operasi database menerapkan pemeriksaan versi kredensial untuk mencegah login bersamaan mengembalikan akses setelah reset.

Upaya login dibatasi di seluruh instance server menggunakan counter database: lima upaya per nama pengguna dan 30 per IP dalam 15 menit. Pengembangan lokal (`NODE_ENV=development`) melewatkan counter login dan perubahan password untuk permintaan loopback Origin/Host yang cocok secara tepat (`localhost`, `127.0.0.1`, atau `[::1]`). Counter lokal yang ada tidak memblokir permintaan ini. Semua permintaan produksi, termasuk `support.gascompsuperlock.com`, mempertahankan batasan berbasis database. Verifikasi password, pemeriksaan asal, dan persyaratan sesi tetap berlaku secara lokal. Kredensial tidak valid menggunakan respons publik yang sama baik nama pengguna ada atau tidak.
Upaya perubahan password menggunakan counter terpisah sehingga login kelima yang berhasil tidak mencegah perubahan password wajib pertama. Proxy balik terpercaya harus menambahkan atau mengganti `X-Forwarded-For`; aplikasi menggunakan IP akhir yang diverifikasi.
IP yang hilang atau tidak valid berbagi bucket `unknown` yang konservatif.

Migrasi `202609150003_gascomp_care_accounts.sql` menyiapkan penyimpanan ini tanpa mengubah tiket garansi, data katalog, bukti, atau sesi admin yang ada. Harus diterapkan sebelum autentikasi anggota fungsional tersedia. Migrasi produksi yang diotorisasi dicatat dalam [Spesifikasi integrasi Supabase](../integrations/supabase.md#gascompcare-member-accounts).

Migrasi cakupan `202609150004_gascomp_care_coverage.sql` menambahkan tabel `care_purchases` dan `care_claims` privat serta tiga RPC. Akses pembacaan sisi server menggunakan peran layanan; peran database yang terautentikasi dan anonim tidak memiliki akses. Peran layanan dapat mengubah cakupan hanya melalui fungsi terbatas yang menerapkan tanggal, kepemilikan, referensi, dan kuota. Migrasi ini mempertahankan akun yang ada, data garansi, dan Penyimpanan; tidak mengisi pembelian dari tanggal pembuatan akun atau catatan pesanan opsional.

Migrasi penghapusan `202609150005_gascomp_care_member_deletion.sql` menambahkan penanda nullable dan fungsi penghapusan batch dilindungi, serta memperbarui fungsi autentikasi dan cakupan untuk menolak akun yang dihapus. Terapkan setelah migrasi cakupan sebelum memuatkan aplikasi yang diperbarui. Data yang ada dipertahankan.

<a id="verification"></a>
## Verifikasi

Jalankan lint, typecheck, uji Node, dan build produksi. Tutupi pembuatan akun dan duplikasi; kredensial valid/invalid; batas laju bersama; penggantian password wajib; kadaluarsa/logout/reset; perubahan kredensial bersamaan; isolasi antar anggota; dan pemisahan akses anggota/admin. Lakukan latihan SQL terhadap database uji yang dapat dibuang dan periksa hak akses database anonim.

Verifikasi browser mencakup desktop/mobile, kedua bahasa, keadaan kosong/loading/error, penolakan kredensial sementara, navigasi publik, alur password, dan pelestarian pengeditan katalog bertahap. Gunakan anggota fiktif dalam database uji terisolasi, bukan catatan pelanggan produksi.

<a id="local-verification-on-september-15-2026"></a>
### Verifikasi lokal pada 15 September 2026

Lint, typecheck, build produksi, dan 93 uji Node berhasil. Suite SQL opsional dijalankan terpisah dengan `CARE_PGLITE_MODULE` menunjuk ke instalasi PGlite sementara: semua delapan uji berhasil terhadap mesin PostgreSQL yang dapat dibuang, termasuk hak peran, kadaluarsa sesi, penolakan kredensial usang, batas, dan rollback transaksi. Mesin ini menggunakan satu koneksi; kontensi multi-koneksi langsung dan perilaku proxy hosting tetap menjadi pemeriksaan deployment.

Pemeriksaan Chromium berhasil terhadap build produksi Next yang terhubung ke database yang dapat dibuang melalui adapter REST lokal. Mereka melakukan uji pembuatan akun, duplikasi, pencarian/paginasi, login, penggantian password wajib, reset, logout, kadaluarsa, isolasi kepemilikan, batas laju, gangguan/penyimpanan ulang, kedua bahasa, metadata, navigasi mobile/desktop, dan pelestarian pengeditan katalog bertahap. Tidak terjadi kesalahan halaman browser. Laporan dan tangkapan layar akun fiktif berada di `.data/gascomp-care-validation/`, diabaikan oleh Git. Database produksi dan website tidak diubah.

<a id="http-preview-session-regression"></a>
### Regresi sesi pratinjau HTTP

WebKit mereproduksi kegagalan pratinjau loopback: build produksi mengembalikan cookie Aman melalui HTTP, yang WebKit buang. Respons aksi menampilkan formulir perubahan password, tetapi pengiriman berikutnya tidak memiliki sesi dan melaporkan kadaluarsa. Chromium menerima cookie loopback, sehingga verifikasi awal hanya Chromium melewatkan perbedaan browser ini.

Kebijakan cookie loopback-hanya eksplisit di atas memperbaiki pratinjau untuk login admin dan anggota. Empat uji regresi mencakup perilaku opt-in, asal yang cocok, perlindungan HTTPS/external-host, dan asal yang rusak. Lint, typecheck, build, dan 97 uji aplikasi berhasil. Chromium dan WebKit keduanya mempertahankan sesi melalui penggantian password pertama, reload halaman, logout, dan login dengan password baru; login admin juga berhasil di kedua mesin. Catatan diagnostik lokal disimpan di `.data/gascomp-care-validation/session-probe-before.json` dan `session-probe.json`. Akun anggota pratinjau yang ada dan database produksi dipertahankan.

<a id="unified-local-website-verification"></a>
### Verifikasi website lokal terpadu

Website sekarang hanya berjalan di `http://localhost:3000`; proses port 3100 sebelumnya dihentikan. Gerbang Care yang dapat dibuang yang ada tetap berjalan untuk mempertahankan akun uji manual. Chromium dan WebKit berhasil login admin, pembuatan anggota, penggantian password wajib, reload, logout, dan login berikutnya di port 3000. Probe sesi yang diperbarui menunggu formulir yang dirender daripada jeda tetap, mengakomodasi kompilasi pengembangan.

Lint, typecheck, build, dan semua 113 uji Node berhasil dengan mesin SQL opsional diaktifkan. Uji mencakup produksi mengabaikan variabel preview, koneksi preview yang tidak valid atau tidak tersedia tidak pernah kembali ke database utama, dan pelestarian baris yang ada saat menambahkan atau secara tidak sengaja mengulang migrasi Care.
Tidak ada migrasi produksi, push, atau deployment yang dilakukan.

<a id="coverage-and-confirmation-verification"></a>
### Verifikasi cakupan dan konfirmasi

Lint, typecheck, build, dan semua 134 uji Node berhasil dengan mesin SQL opsional diaktifkan. Uji mencakup kepemilikan, batas tanggal, idempotensi, kehabitan kuota, akses database dilindungi, tanggal konfirmasi yang dihasilkan oleh server, dan DTO pelanggan mengecualikan bidang penggunaan/sejarah admin. Chromium memverifikasi tombol Konfirmasi Klaim Admin, cakupan dua unit menampilkan 1/6 untuk admin dan lima tersisa untuk pelanggan, kehabitan satu unit setelah tiga konfirmasi, konfirmasi dinonaktifkan pada cakupan kadaluarsa, tata letak mobile bilingual, akun kosong, dan gangguan/pulih cakupan. Rekam berada di `.data/gascomp-care-validation/coverage-browser.json`.

Gerbang lokal sekarang mempertahankan basis datanya. Konversinya melestarikan seluruh 16 anggota yang ada, 13 sesi, dan 13 baris percobaan secara tepat sebelum uji lebih lanjut. Migrasi cakupan baru dan perubahan aplikasi hanya telah dilakukan uji secara lokal; tindak lanjut ini belum dipush atau dideploy ke produksi.

<a id="member-deletion-verification"></a>
### Verifikasi penghapusan anggota

Lint, typecheck, build, dan semua 147 uji Node berhasil dengan validasi SQL diaktifkan. Chromium memverifikasi seleksi, keadaan pilih-semua campuran, pembersihan seleksi, pembatasan pencarian, pembatalan konfirmasi, penghapusan tunggal dan massal, tata letak mobile, dan ulang setelah kegagalan permintaan disimulasikan. Sesi hidup anggota yang dihapus ditolak dan login berikutnya gagal, sementara pembelian dan klaim yang dikonfirmasi tetap disimpan. Anggota yang tidak dipilih tetap aktif hingga penghapusan eksplisit terpisah. Perangkat uji browser hanya menggunakan akun lokal fiktif; laporan berada di `.data/gascomp-care-validation/deletion-browser.json`.

Migrasi lokal melestarikan anggota yang ada, sesi, pembelian, dan klaim; satu-satunya perubahan baris awal adalah menambahkan nilai `deleted_at` null. Migrasi produksi, push GitHub, dan hosting deployment tindak lanjut ini tetap tertunda.
