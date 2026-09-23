<a id="customer-support-channels"></a>
# Saluran dukungan pelanggan

[Indeks spesifikasi](../spec.md)

Dukungan produk membuka tindakan layanan berikut:

| Tindakan | Tujuan |
| --- | --- |
| Klaim Garansi | Aliran `/klaim-garansi` internal dengan konteks produk dan SKU |
| Gascomp Care | Halaman kontak pelanggan resmi Gascomp |
| Pusat Layanan | Direktori `/service-center` internal, mempertahankan konteks pertanyaan produk dan SKU dari tindakan produk |

Website juga menyediakan tautan navigasi anggota **GascompCare** terpisah.
Masuk anggota dan ekstensi berbayar didokumentasikan di [GascompCare](gascomp-care.md).
Merek selalu ditulis sebagai "Gascomp." Tindakan kontak eksternal membuka situs Gascomp resmi di tab baru.

Tautan WhatsApp menggunakan nomor dukungan yang dikonfigurasi dan mencakup konteks produk/isu singkat bahasa Inggris jika tersedia. Pelanggan dapat mengedit pesan sebelum mengirimnya. Pengaturan jam dukungan ditampilkan pada halaman depan.

Tombol WhatsApp hanya logo tetap berada di sudut kanan bawah pada rute aplikasi publik. Tersembunyi di `/admin` dan semua subrute `/admin/`, termasuk masuk admin. Membuka percakapan dengan nomor admin Gascomp yang dikonfigurasi di tab baru. Tombol menghormati area aman mobile dan tersembunyi ketika tidak ada nomor dukungan yang dikonfigurasi.

Ketika flag server-side opsional `GASCOMP_AI_ASSISTANCE_ENABLED` aktif,
panel [Ayu](ai-assistance.md) menggantikan tombol melayang ini.
Panel menyediakan tindakan admin WhatsApp di dalam respons handoff atau pemberitahuan kegagalan layanan, daripada secara permanen di bawah komposer obrolan. Flag default off; tautan WhatsApp lain dan redirect garansi tidak berubah.

<a id="service-center-directory"></a>
## Direktori Pusat Layanan

Implementasi 16 September 2026 memperkenalkan `/service-center`, dapat diakses dari navigasi publik bersama, dukungan produk, dan tindakan layanan produk admin yang ada. Direktori dimulai kosong: tidak ada lokasi bisnis sampel atau disimpulkan ditanam.

- Pelanggan mencari berdasarkan nama pusat, kota/kabupaten, atau alamat dan menyaring oleh salah satu dari 38 provinsi Indonesia. Kode provinsi mengikuti [metadata BPS](https://sirusa.web.bps.go.id/metadata/variabel/326536). Label provinsi bahasa Inggris dan Indonesia menyertai salinan antarmuka yang dilokalisasi dan pemilih bahasa yang ada.
- Hanya lokasi aktif muncul dalam data halaman publik, hasil pencarian, dan penanda peta. Pencarian dan penyaring provinsi dikombinasikan. Semua provinsi tetap dapat dipilih bahkan tanpa lokasi.
- Kartu menampilkan nama pusat, provinsi, kota/kabupaten, alamat, dan jam buka opsional, telepon, dan tindakan WhatsApp. Google Maps membuka tautan HTTPS yang disimpan atau koordinat lokasi ketika tidak ada tautan yang disediakan.
- Peta Leaflet interaktif menggunakan tile OpenStreetMap dan atribusi terlihat. Penanda mengikuti penyaring; memilih kartu memfokuskan penandarnya, dan memilih penanda menyoroti karta. Peta kosong menampilkan Indonesia tanpa penyangga palsu. Lokasi, arah, dan tindakan kontak tetap dapat digunakan ketika tile gagal dimuat.
- Direktori kosong, tidak ada hasil yang cocok, pemuat peta/gagal, dan keadaan data-tidak-tersedia memiliki pesan eksplisit. Kesalahan database tidak direpresentasikan sebagai direktori kosong. Tautan dukungan mengarah ke bagian kontak yang ada.
- Tile peta diminta langsung oleh browser sesuai [kebijakan penggunaan tile OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/). Peta publik tidak memerlukan geocoding, pengambilan tile massal, kunci API, atau izin lokasi pelanggan.

<a id="service-center-administration"></a>
## Administrasi Pusat Layanan

Sidebar admin yang dilindungi mencakup **Service Centers** sebagai ruang kerja terpisah. Administrator dapat membuat daftar/mencari, menambah, mengedit, menonaktifkan, mengaktifkan kembali, dan menghapus secara permanen lokasi.

Bidang wajib adalah nama, provinsi, kota/kabupaten, alamat, latitude, dan longitude. Telepon, WhatsApp, jam buka, dan URL Google Maps bersifat opsional. Pemilih peta dan input koordinat merujuk pada lokasi yang sama. Formulir baru dimulai tanpa koordinat. Validasi server memeriksa kode provinsi Indonesia yang dikenal, koordinat terbatas dalam rentang batas Indonesia, batasan bidang, format telepon, dan tujuan Google Maps HTTPS. Rentang batas adalah penjaga geografis kasar, bukan batas provinsi atau verifikasi batas daratan; administrator harus memverifikasi setiap titik dan alamat.

**Save location** hanya menyimpan lokasi saat ini segera dan membuat status aktifnya berlaku efektif secara publik. Katalog Simpan/Batalkan tidak berlaku untuk ruang kerja ini. Kegagalan mempertahankan nilai formulir. Beralih antar ruang kerja admin mempertahankan formulir yang terpasang, dan meninggalkan lokasi yang berubah di dalam ruang kerja ini meminta operator untuk membuang perubahan. UI mendukung pengeditan desktop dan mobile.

**Delete location** muncul di editor untuk lokasi yang disimpan, termasuk yang tidak aktif. Konfirmasi menamai lokasi yang disimpan dan memperingatkan bahwa penghapusan bersifat permanen;
edit yang belum disimpan untuk lokasi tersebut juga dibuang hanya setelah konfirmasi dan
respons sukses. Penghapusan segera menghapus catatan dari daftar admin
dan direktori publik serta menutup editor. Tidak memerlukan katalog
Simpan. Membatalkan meninggalkan draf tidak berubah. Permintaan gagal atau tidak dikonfirmasi mempertahankan
draf dan menampilkan kesalahan; kegagalan transport meminta administrator untuk memperbarui
daftar sebelum mencoba lagi. Mengulangi penghapusan yang selesai dengan aman mengonfirmasi ketidakhadiran.
Penyimpanan menunda dan penghapusan memblokir mutasi lokasi lain. Respons impor Google Maps
yang tiba setelah penghapusan dikonfirmasi dimulai diabaikan.

Setiap permintaan daftar admin memeriksa sesi admin yang ada; mutasi secara tambahan memverifikasi asal permintaan. Supabase adalah penyimpanan utama dengan migrasi berurutan terpisah dan baca/tulis hanya server. Klien API anonim dan terautentikasi Supabase tidak dapat mengakses tabel; server aplikasi mengembalikan hanya lokasi aktif ke halaman direktori. Database dikonfigurasi yang hilang atau gagal melaporkan ketidaktersediaan daripada menggunakan data lokal secara diam-diam. Pengembangan tanpa Supabase menggunakan file `.data/service-centers.json` yang awalnya tidak ada yang dibagikan oleh admin lokal dan server publik. Mode file ini hanya untuk pengembangan proses tunggal. Lihat [Supabase storage](../integrations/supabase.md) untuk status migrasi.

Status: pemilik mengotorisasi penghubungan pengujian lokal ke database Supabase yang dikonfigurasi pada 16 September 2026, kemudian mengotorisasi push GitHub dan deployment Hostinger setelah verifikasi lokal. Migrasi `202609160001` diterapkan dengan akses tabel hanya server. Lokasi uji coba sementara dihapus setelah verifikasi. Lihat [catatan rilis](../operations/deployment.md#service-center-release-on-september-16-2026) untuk kesiapan deployment dan cakupan verifikasi.

<a id="local-verification-on-september-16-2026"></a>
## Verifikasi lokal pada 16 September 2026

Lint, TypeScript, dan build produksi lulus. Suite Node lulus 131 tes
dengan tiga tes opsional yang tidak terkait dilewati; tes migrasi service-center
berjalan terhadap database PGlite yang dapat dibuang dan memverifikasi inisialisasi kosong,
akses database hanya server, penolakan baca/tulis publik langsung, dan batasan koordinat/provinsi.

Chromium memeriksa direktori kosong dan terisi, semua opsi provinsi, penyaringan gabungan, penanda sinkronisasi, persistensi bilingual, pembuatan admin, pengeditan, deaktivasi/aktivasi ulang, pemilihan koordinat peta, draf yang dipertahankan, penolakan sesi kadaluarsa, dan kegagalan penyimpanan/pengulangan. Tata letak publik diperiksa pada resolusi 320, 390, dan 1440 piksel serta pengeditan admin pada 390 piksel. Tidak terjadi kesalahan halaman atau tumpahan horizontal. Respons tile peta dimock untuk menghindari unduhan otomatis pihak ketiga; kegagalan tile diuji secara terpisah. Ketersediaan penyedia peta hidup dan deployment produksi tetap berada di luar verifikasi lokal ini. Semua catatan lokasi sementara telah dihapus, meninggalkan direktori kosong.

<a id="supabase-backed-local-verification-on-september-16-2026"></a>
## Verifikasi lokal berbasis Supabase pada 16 September 2026

Pemilik meminta pengujian dengan database yang dikonfigurasi sambil menjaga aplikasi baru bersifat lokal hingga deployment. Chromium menjalankan alur direktori dan admin yang sama menggunakan `http://localhost:3000` dengan persistensi Supabase asli, termasuk reload, pengeditan, visibilitas aktif/non-aktif, dan penolakan sesi kadaluarsa. Dua pusat fiktif yang teridentifikasi secara unik dibuat dan dihapus menggunakan ID persis mereka. Direktori kosong sekali lagi dan tidak ada file fallback lokal yang ditulis. Baca langsung API publik ditolak meskipun baris fixture aktif masih ada.

Sebelum/sesudah jumlah dan konten checksum memverifikasi semua 247 baris yang ada melintasi 16 tabel metadata aplikasi dan Penyimpanan yang tidak berubah. Laporan lokal adalah `.data/service-center-validation/database-preservation.json`; hasil browser ada di `database-browser-report.json` dalam direktori yang sama. Tidak ada rilis hosting atau terowongan publik yang dibuat. Server pengembangan lokal yang ada tetap tersedia untuk tinjauan pemilik menggunakan kredensial admin lokal yang dikonfigurasi.

<a id="google-maps-link-auto-fill"></a>
## Auto-fill tautan Google Maps

Administrator dapat menempelkan tautan Share lokasi Google Maps di bagian atas editor lokasi. Menempelkan memulai pencarian server secara otomatis; mengetik tautan dan meninggalkan bidang juga memulai pencarian. **Read Google Maps link** melakukan ulang pencobaannya. Tidak diperlukan kunci API Google atau migrasi database tambahan.

Server mengikuti redirect HTTPS hanya melalui host Google Maps yang didukung dan membaca lokasi yang dipilih dari data Maps publik. Ketika HTML awal mendeklarasikan sumber `/maps/preview/place` yang sama asalnya, ia membaca sumber tersebut sekali. Tidak ada login, pemecahan CAPTCHA, evaluasi halaman eksekutif, layanan geocoding, atau API Places Google. Permintaan memiliki redirect terbatas, batas waktu 12 detik, dan batas respons 3 MB, dan tidak mengirim cookie admin atau kredensial. Autentikasi admin dan asal permintaan yang cocok diperlukan sebelum pencarian apa pun.

Nama tersedia, alamat lengkap, kota/kabupaten, provinsi Indonesia yang diakui, telepon, jam buka reguler, dan koordinat lokasi yang dipilih mengisi bidang kosong. Parser mengabaikan koordinat kamera dan hasil pencarian tidak terkait. Negara asing eksplisit atau koordinasi di luar batas Indonesia ditolak. Koordinasi dari tautan pin-hanya dapat menghasilkan hasil parsial yang memerlukan input nama/alamat manual. Bidang yang hilang atau tidak didukung tetap tidak berubah dan dicatat untuk tinjauan. Nomor telepon tidak pernah disalin otomatis ke WhatsApp.

Nilai formulir yang ada dipertahankan. **Replace matching fields** memungkinkan operator secara eksplisit mengganti hanya bidang yang dikembalikan setelah konfirmasi. Perubahan tautan, penutupan editor, atau draf yang dibuang akan membuat respons pencarian lama menjadi tidak valid. Pencarian otomatis tidak pernah menyimpan lokasi: administrator meninjau dan memperbaiki draf, kemudian memilih **Save location**. Aturan persistensi dan visibilitas Supabase yang ada tetap berlaku.

Ini adalah parser terbaik upaya untuk data halaman Google Maps publik, di mana struktur yang tidak didokumentasikan dapat berubah. Tautan yang tidak didukung, blok penyedia, dan kegagalan jaringan menampilkan pesan "masukkan secara manual/ulangi percobaan" tanpa menghapus formulir. Tidak dapat menjamin detail lengkap untuk setiap tautan yang dibagikan. Halaman Maps diminta dalam bahasa Inggris untuk antarmuka admin; nama tempat dan alamat yang diimport mempertahankan nilai yang disediakan oleh Google. Pemilik mengotorisasi penyebaran setelah verifikasi lokal.

Verifikasi lokal lulus linting, TypeScript, build produksi, dan 146 uji coba Node (tiga uji coba opsional tidak terkait dilewati). Lima belas uji coba regresinya mencakup parsing data publik, jam buka saat ini/legacy, pencocokan provinsi, tempat asing, respons yang rusak, koordinat pin versus kamera, pembatasan redirect/sumber, batas respons, dan autentikasi/admin asal pemeriksaan.

Chromium memverifikasi tempel otomatis menggunakan tautan pendek Google Maps publik asli, preservasi bidang manual, penggantian eksplisit, kesalahan tautan tidak valid, penolakan respons usang, tata letak mobile, dan penanganan sesi kadaluarsa. Rekor uji coba tidak aktif yang ditinjau dan diberi nama unik disimpan ke database Supabase yang dikonfigurasi, dimuat ulang, dan dihapus dengan ID yang tepat. Identitas lokasi yang ada dan visibilitas tidak berubah. Tidak ada lokasi yang disimpan selama pencarian. Respons publik Monas asli juga memverifikasi ekstraksi jam buka mingguan format saat ini. Laporan dan skrip browser lokal berada di bawah `.data/service-center-maps/`.

<a id="service-center-deletion-verification-on-september-16-2026"></a>
## Verifikasi penghapusan Pusat Layanan pada 16 September 2026

Penghapusan lulus linting, pengecekan tipe, build produksi, dan 164 uji coba Node; empat uji coba SQL opsional dilewati. Uji coba regresinya mencakup autentikasi, validasi asal dan ID, penghapusan database dengan ID yang tepat, ulang percobaan aman, kegagalan database, revalidasi publik, dan edit lokal bersamaan tanpa membuat ulang baris yang dihapus.

Chromium menggunakan localhost dengan database Supabase yang dikonfigurasi untuk memverifikasi pembatalan, kegagalan transport, penghapusan sukses, sesi kadaluarsa, persistensi reload, tata letak mobile, dan ketiadaan aksi pada lokasi baru yang belum disimpan. Dua rekor tidak aktif sementara dibuat dan dihapus; lokasi yang ada sebelumnya tetap tidak berubah. Tidak ada lokasi uji coba yang dibuat publik. Pemeriksaan browser melaporkan tidak ada kesalahan JavaScript halaman atau tumpahan horizontal. Bukti lokal dicatat di `.data/service-center-delete/browser-report.json`.

Tidak perlu migrasi. Pemilik mengotorisasi mendorong perubahan penghapusan terverifikasi ke GitHub dan penyebaran melalui jalur rilis otomatis Hostinger yang ada. Lihat [rekor rilis](../operations/deployment.md#service-center-deletion-release-on-september-16-2026) untuk cakupan verifikasi produksi.
