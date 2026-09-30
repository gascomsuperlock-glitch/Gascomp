<a id="hostinger-deployment-procedure"></a>
# Prosedur deployment Hostinger

[Spesifikasi deployment](../../product/operations/deployment.md) · [Alur pembelajaran](../learning.md) · [Indeks pekerjaan](../README.md)

<a id="trigger-and-scope"></a>
## Pemicu dan cakupan

Digunakan ketika diminta men-deploy, merilis, memeriksa status rilis, atau memperbaiki deployment yang gagal pada `support.gascompsuperlock.com`. Permintaan status saja hanya membaca bukti; jalankan build hanya ketika pemilik mengizinkan deployment.

Sumber persyaratan: [Rilis otomatis](../../product/operations/deployment.md#automated-releases) dan [Penyelesaian target deployment ganda](../../product/operations/deployment.md#resolving-the-duplicate-deployment-target).

<a id="topology-that-must-not-be-guessed"></a>
## Topologi yang tidak boleh ditebak

Periksa ulang lewat API sebelum bertindak; jangan mengandalkan ingatan atas nilai di bawah ini.

| Fakta | Nilai pada 2026-09-23 |
| --- | --- |
| Akun hosting | `u912264905` |
| Hostname produksi | `support.gascompsuperlock.com` |
| Record kedua pada docroot yang sama | `bantuan.gascompsuperlock.com` |
| Docroot bersama | `public_html/bantuan` |
| Akar aplikasi Passenger | `domains/gascompsuperlock.com/bantuan/hbuilds/current/nodejs` |
| Auto-deploy Git aktif | Hanya `support`; `bantuan` disetel `is_enabled: false` |
| Zona DNS | Cloudflare, di luar akun Hostinger ini |

`bantuan` bukan situs kedua. Ia adalah nama record dan nama folder tempat aplikasi `support` benar-benar berjalan. Log runtime kedua hostname mengembalikan berkas yang sama.

<a id="ordered-work"></a>
## Pekerjaan berurutan

1. Bandingkan `HEAD` lokal dengan `origin/main` dan `origin/release`. Jalur rilis adalah dorong ke `release`, GitHub Actions memverifikasi dan menerapkan migrasi, lalu fast-forward `main`. Jangan dorong perubahan aplikasi langsung ke `main`.
2. Tetapkan commit apa yang benar-benar disajikan situs. `main` yang sudah maju tidak membuktikan situs sudah diperbarui; pada 23 September 2026 situs tertinggal dua commit selama beberapa jam sementara `main` sudah benar.
3. Baca daftar build `support` dan periksa state serta hash commit build terbaru. Build yang gagal dalam waktu di bawah sepuluh detik dengan log kosong adalah tanda perebutan docroot, bukan kegagalan kode; analisis build otomatis akan mengembalikan hasil kosong untuk kasus ini.
4. Untuk memulihkan pengiriman, jalankan satu build Git pada `support` saja memakai pengaturan tersimpan. Satu build tanpa pesaing berhasil di mana build ganda gagal. Jangan jalankan build pada `bantuan`.
5. Tunggu state `completed`. Build yang sehat melewati `pending`, `running`, pemasangan dependensi, kompilasi, TypeScript, dan pembuatan halaman statis. Baca log bertahap memakai `from_line` bila perlu.
6. Verifikasi seperti bagian di bawah, lalu catat hasilnya.

<a id="verification-set"></a>
## Himpunan verifikasi

| Pemeriksaan | Harapan |
| --- | --- |
| State build | `completed`, dengan hash commit yang diharapkan |
| `last_deployed_at` runtime | Sesuai waktu selesai build, dan path versi memuat UUID build tersebut |
| Rute publik | Halaman depan, `/klaim-garansi`, `/service-center`, `/gascomp-care/login`, `/produk/[slug]` mengembalikan HTTP 200 |
| Rute admin | `/admin` mengembalikan 307 ke login |
| Log runtime | Tidak ada galat baru yang berulang pada probe rute kedua |
| Penanda build | Perilaku atau teks yang khas rilis ini benar-benar muncul |

State build `completed` saja tidak membuktikan perilaku fitur. Nyatakan pemeriksaan rute sebagai uji asap, dan sebutkan alur yang belum diperiksa di browser.

<a id="constraints"></a>
## Batasan

- Jangan hapus `bantuan` maupun `support` selama keduanya berbagi docroot. Menghapus salah satunya berpotensi menghapus folder aplikasi live, dan tidak ada undo. Ini berlaku walaupun `bantuan` tampak tidak terpakai.
- `bantuan` tidak memiliki catatan DNS sehingga sudah tidak dapat diakses publik. Ketidakhadirannya di DNS bukan alasan untuk menghapus recordnya.
- Jangan aktifkan kembali auto-deploy pada `bantuan`. Itu mengembalikan build ganda yang saling menggagalkan.
- Pemisahan docroot memerlukan hapus dan buat ulang subdomain karena tidak ada API untuk memindahkan root directory. Itu berarti downtime dan pemasangan ulang SSL pada hostname yang punya riwayat kegagalan TLS. Perlakukan sebagai pekerjaan terencana tersendiri dengan izin pemilik, bukan bagian dari rilis.
- API lingkungan mengganti seluruh set variabel. Jangan menyalin nilai yang tersamar hasil pembacaan ke dalam permintaan penulisan.
- Permintaan pengodean saja tidak mengizinkan deployment. Mintalah izin, lalu laporkan apa yang benar-benar diverifikasi.

<a id="failure-cases"></a>
## Kasus kegagalan representatif

| Gejala | Tafsiran |
| --- | --- |
| Build gagal <10 detik, log kosong, analisis kosong | Dua build serentak pada docroot bersama; jalankan satu build pada `support` |
| `main` benar tetapi situs lama | Build gagal diam-diam; periksa daftar build, jangan percaya keberhasilan Actions |
| Galat runtime sekali saat cold start | Periksa apakah berulang pada probe kedua sebelum menyebutnya regresi |
| `bantuan` gagal resolusi DNS | Keadaan lama yang diharapkan; bukan akibat rilis |
| Satu `Error: Server is not running` tepat saat build selesai | Proses lama ditutup saat pergantian versi; bukan regresi bila tidak berulang |
| `failed to get redirect response` pada login atau logout | Sebuah Server Action memanggil `redirect()`; lihat [Server Action tanpa `redirect()`](../../product/operations/deployment.md#server-actions-without-redirect) |

<a id="evidence-level"></a>
## Tingkat bukti

Terverifikasi sebagian. Langkah pemulihan build tunggal dan himpunan verifikasi dijalankan pada 23 September 2026 dan berhasil. Pada 30 September 2026 satu push ke `main` menghasilkan tepat satu build, pada `support`, tanpa build `bantuan`; ini terbukti untuk satu push. Bukti pelaksanaan terbaru berada di [spesifikasi deployment](../../product/operations/deployment.md#thumbnail-and-symptom-release-on-september-23-2026).
