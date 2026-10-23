# Migrasi situs utama ke JavaScript

[Indeks](../spec.md) · [Konteks fitur](../../../src/features/main-site/CONTEXT.md)

## Cakupan yang disetujui

Pada 23 Oktober 2026 pemilik meminta PHP ditulis ulang ke JavaScript dan pengamanan. Klarifikasi "Semua" mencakup situs utama WordPress dan plugin `gascomp-site-tools`; jawaban "atur saja sesuai rekomendasi" menyerahkan pilihan teknis kepada agen. Aplikasi bantuan yang sudah memakai Next.js dipertahankan.

## Kontrak migrasi

- Pertahankan permalink halaman, artikel, produk, kategori, media yang dirujuk eksternal, serta tujuan QR dan pengalihan `/dll/` ke klaim garansi aplikasi bantuan.
- Rendering baru menggunakan React/Next.js. HTML lama diparse menjadi data dengan daftar elemen dan protokol yang diizinkan, bukan dimasukkan kembali sebagai HTML mentah. Skrip, iframe, formulir lama, style, event handler, dan atribut aktif tidak dibawa ke renderer.
- Impor baca-saja hanya mengambil halaman, artikel, kategori, dan katalog publik dari origin tetap. Redirect jaringan ditolak, ukuran respons dan pagination dibatasi. Tidak mengambil akun, pesanan, atau kiriman formulir.
- Hasil impor lokal adalah bahan tinjauan, belum persetujuan publikasi. Sanitasi teknis tidak membuktikan isi bebas spam atau klaim usang. Formulir yang dikeluarkan dari HTML dicatat untuk implementasi ulang, bukan dianggap sudah bermigrasi.
- Pratinjau berada di `/admin/main-site`, dilindungi sesi admin, nonindeks, dan dinonaktifkan kecuali `GASCOMP_MAIN_SITE_PREVIEW_ENABLED=true`. Snapshot lokal tidak disajikan sebagai berkas publik.
- Data privat tetap di penyimpanan server. Formulir pengganti membutuhkan validasi server, perlindungan penyalahgunaan, pembatasan unggahan, otorisasi pembacaan, dan penyimpanan yang tahan restart sebelum penerimaan.
- Operasi PHP yang menghapus akun/file atau memperbaiki WordPress adalah operasi migrasi/pensiun, bukan fitur publik JavaScript. Jangan menerjemahkannya menjadi endpoint destruktif.
- Antarmuka baru mengikuti standar bahasa proyek; terjemahan konten lama dan desain akhir memerlukan tinjauan sebelum rilis.

## Penerimaan dan batas rilis

Migrasi baru selesai setelah semua rute, konten, media lokal, formulir kontak/reseller, alur admin, metadata, sitemap, dan pengalihan cocok dengan inventaris sumber terautentikasi; fungsi WooCommerce yang benar-benar dipakai harus diverifikasi. Uji desktop/ponsel dan keadaan kosong/galat, lakukan audit dependensi, lalu periksa rilis live sesuai prosedur deployment. Migrasi lokal tidak mengotorisasi deployment, penghapusan WordPress, perubahan DNS, atau perubahan docroot bersama aplikasi bantuan.

Status dan hasil pemeriksaan aktual berada di [serah terima](../../work/handoffs/handoff-php-javascript-blocked-v1.md).

## Mode situs utama dan aplikasi bantuan

`GASCOMP_MAIN_SITE_ENABLED=true` digunakan pada build dan runtime situs utama yang terpisah. Nilai bawaan tetap false untuk aplikasi bantuan. Mode utama merutekan beranda serta URL WordPress ke fitur `main-site`; URL bantuan pelanggan diarahkan ke hostname support. Konfigurasi ini tidak memisahkan docroot Hostinger secara otomatis dan tidak boleh diaktifkan begitu saja pada deployment support.

Implementasi publik menyediakan beranda, katalog dengan pencarian/pagination 12 item, kategori, detail produk, daftar/detail artikel, halaman informasi, sitemap, robots, serta navigasi Indonesia/Inggris. Isi warisan tetap berbahasa sumber; terjemahan lengkap belum dihasilkan otomatis. Header/footer, galeri, grid, dan formulir tidak membutuhkan Elementor/PHP. Promosi, countdown, dan klaim pemasaran yang belum terverifikasi tidak ditambahkan. Checkout di situs wajib dipertahankan sesuai keputusan di bawah; implementasi katalog saja belum memenuhi penerimaan migrasi.

## Tinjauan dan media

Setiap catatan snapshot memerlukan keputusan `keep` atau `drop`, alasan, serta digest yang cocok dengan konten saat ini. Tidak ada persetujuan massal otomatis. Keputusan stale, catatan tanpa keputusan, dan hilangnya beranda menggagalkan persiapan rilis. `review.json` lokal adalah artefak operasional; konten sumber tidak dimasukkan Git.

Gambar yang dipilih diunduh hanya dari origin yang diizinkan, tanpa redirect, maksimal 12 MB dan 32 juta piksel; decoder hanya menerima format raster. Gambar dikodekan ulang ke WebP maksimal 1600×1600 dan metadata sumber dibuang. Rilis menunjuk nama hash konten lokal. Handler hanya melayani hash yang ada pada manifest rilis; URL unggahan WordPress yang telah dimigrasikan diarahkan ke gambar lokal. Gambar lain tidak disajikan. Kegagalan satu gambar mempertahankan manifest rilis sebelumnya; file gambar parsial tidak otomatis menjadi publik.

## Kontak dan reseller

Formulir baru memerlukan nama, email, telepon, pesan, dan persetujuan penggunaan data untuk tindak lanjut. Tidak menerima lampiran; bukti garansi tetap menggunakan aplikasi bantuan. Endpoint memvalidasi origin terhadap origin situs yang dikonfigurasi, tipe dan batas badan JSON 24 KB, serta panjang dan format setiap kolom.

Turnstile divalidasi di server dengan pemeriksaan `success`, hostname, dan action `main-site-lead`; kesalahan layanan tidak meloloskan pengiriman. Token sekali pakai harus diperbarui saat retry sesuai [dokumentasi Cloudflare](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/). Tanpa konfigurasi provider atau database, endpoint gagal tertutup. Ini tidak membuktikan bahwa semua bot dapat dicegah.

`main_site_leads` privat menggunakan RLS tanpa izin untuk `anon`/`authenticated`; hanya server service-role boleh mengakses. RPC penerimaan menyerialkan pemeriksaan untuk mencegah duplikasi idempotency ID dan membatasi 5 kiriman per email per 24 jam serta 200 kiriman total per jam. Batas ini adalah pilihan implementasi awal agen dalam otorisasi pemilik, bukan hasil pengukuran volume produksi. Inbox admin menyediakan pagination 50 catatan dan status `new`, `in_progress`, `resolved`; setiap API memeriksa sesi, dan mutasi memeriksa origin.

## Notifikasi

Notifikasi dipisahkan dari penyimpanan formulir. Pekerja mengambil paling banyak 20 pesan menggunakan lease database 15 menit dan `skip locked`; kegagalan SMTP tidak menghapus kiriman. Email berisi tautan inbox privat dan referensi, bukan data pribadi pelanggan. SMTP memakai TLS terverifikasi pada port 465. Perintah bawaan hanya dry run; `--send` mengirim ke alamat admin yang dikonfigurasi. Pekerja belum dijadwalkan atau dijalankan mengirim pada sesi implementasi.

Pengiriman email bersifat setidaknya sekali: kegagalan setelah SMTP menerima email tetapi sebelum acknowledgement database dapat menghasilkan duplikasi setelah lease habis. `Message-ID` stabil membantu identifikasi, bukan jaminan tepat sekali. Konfigurasi penerima dan retensi data harus direkonsiliasi dengan pemilik operasional sebelum rilis; tidak ada penghapusan kiriman lama secara otomatis.

Lihat [penyiapan situs utama](../../setup/main-site.md) untuk urutan lokal dan batas produksi.

## Pembelian dan checkout

Dicatat pada 23 Oktober 2026, berdasarkan jawaban pemilik "Pertahankan checkout di situs" setelah inventaris terautentikasi menemukan produk 7266 masih dapat dibeli melalui keranjang WooCommerce. Produk ini tidak boleh diam-diam dialihkan menjadi formulir kontak atau tautan marketplace. Pemilik kemudian meminta metode pembayaran dan ongkir disamakan dengan sebelumnya; jangan memilih provider atau tarif pengganti tanpa sumber. Pemilik tidak menyatakan alasan tambahan.

Penerimaan: pelanggan dapat menambahkan produk, meninjau jumlah/harga yang dihitung server, memilih pengiriman dan metode pembayaran yang memang dikonfigurasi, serta memperoleh pesanan tersimpan tanpa duplikasi. Metode pembayaran, ongkir, pengurangan stok, notifikasi dan penanganan pembayaran gagal harus direkonsiliasi sebelum cutover. Jangan menyatakan pesanan lunas dari status klien. Bukti saat ini baru inventaris; belum ada checkout JavaScript yang diterapkan atau transaksi uji.

Sebanyak 42 produk bertipe `external` menggunakan tautan Shopee pada sumber terautentikasi. Ekspor mempertahankan `add_to_cart.url` hanya untuk produk eksternal, mendekode entitas HTML WooCommerce dan memvalidasi HTTPS, hostname, tanpa kredensial/port/fragment. Tautan panjang dibatasi pada toko `780929103`; tautan pendek `s.shopee.co.id` dari sumber tetap disimpan. Tujuan pendek akhirnya belum diverifikasi. Renderer memvalidasi kembali tujuan sebelum menampilkan tombol bilingual. Tidak ada request checkout atau penempatan pesanan saat migrasi katalog.
