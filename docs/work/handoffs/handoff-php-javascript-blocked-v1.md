# Serah terima migrasi PHP ke JavaScript

Diperbarui: 2026-10-23
Status: Terhambat

## Tujuan

Migrasikan seluruh situs utama WordPress dan plugin PHP ke JavaScript, dengan pengamanan dan pelestarian alur yang digunakan. Pemilik mengonfirmasi "Semua", menyerahkan pilihan teknis dengan "atur saja sesuai rekomendasi", lalu meminta "gunakan ruflo. selesaikan semuanya". [Spesifikasi pemilik](../../product/features/main-site.md) dan [penyiapan](../../setup/main-site.md) mencatat kontrak. Migrasi penuh/live belum selesai; jangan menyamakan implementasi lokal dengan penerimaan produksi.

## Bukti saat ini

### Koordinasi dan akses

- Ruflo MCP digunakan untuk tugas persisten `task-1792723806493-78jwip`. Tidak ada agen Ruflo yang diklaim telah mengerjakan kode. `system_status` MCP melaporkan registry aktif; health komponen lain tidak diukur oleh hasil itu.
- Skill `ruflo-status` dijalankan: `npx @claude-flow/cli@latest doctor` memakai CLI 3.59.17, 18 pemeriksaan lulus, 14 warning, 1 gagal karena disk 91% terpakai (19 GiB tersisa). CLI lokal belum diinisialisasi; `status` melaporkan hal tersebut. Tidak ada API key agen terdeteksi. MCP memiliki state sendiri dan tetap menerima tugas. Tidak dilakukan `init`, reset, perbaikan instalasi, atau klaim eksekusi paralel.
- Saat pemilik meminta "Livekan sekarang", API hosting umum berhasil membaca situs dan `.htaccess`; pernyataan sebelumnya bahwa seluruh akses hosting terhalang sudah tidak berlaku. Konektor WordPress `list_sites` tetap mengembalikan sesi hilang/kedaluwarsa, termasuk sesudah pemilik menyatakan "sudah login". Inventaris WordPress terautentikasi belum terbaca. Jalur alternatif `wordpress_installations_list` juga gagal dengan timeout 300 detik.
- Topologi diverifikasi ulang melalui API: situs utama memakai `public_html`; `support` dan `bantuan` sama-sama memakai `public_html/bantuan`, dengan `.htaccess` Passenger yang identik dan Node 22. `.htaccess` utama masih berisi WordPress/LiteSpeed. Daftar direktori utama benar-benar memuat `bantuan`, `GC-technology`, dan `zengxin-technology`. Operasi `hosting_deploy` menyatakan menimpa konten tanpa undo; cadangan serta pelestarian subfolder belum terbukti. Tidak dijalankan penimpaan.
- Perubahan pengguna di AI, CareDirect, dokumentasi, dan folder `masalah` yang sudah ada dipertahankan. Commit `043b95e` berhasil dipush dan diverifikasi pada remote branch `feat/main-site-javascript-migration`. Pemilik kemudian mengotorisasi deployment dengan "Livekan sekarang"; deployment belum dijalankan karena inventaris, artefak rilis nyata, konfigurasi provider, dan mekanisme cutover yang menjaga subfolder belum lengkap. Tidak ada deployment, perubahan DNS/hosting, penerapan migrasi produksi, penghapusan PHP, atau email nyata.

### Konten dan rilis lokal

- Snapshot publik asli `.data/main-site/snapshot.json`: 14 halaman, 280 artikel, 50 produk, 12 formulir. Sampel artikel masih berisi perjudian/konten asing yang tidak terkait Gascomp. Snapshot tidak disetujui, tidak masuk Git, dan tidak disajikan sebagai berkas publik.
- Parser mengeluarkan hanya struktur React yang diizinkan; tidak menjalankan HTML, skrip, iframe, style, atau formulir WordPress. Pratinjau `/admin/main-site` memerlukan flag dan sesi admin; pembaca snapshot juga memeriksa sesi.
- `prepare-release.mjs` membuat template tinjauan lokal yang tidak menimpa review yang ada. Setiap catatan perlu `keep`/`drop`, alasan, dan digest saat ini. Keputusan tidak lengkap/stale menolak rilis. Setelah kelanjutan berikutnya, enam artikel tidak terkait Gascomp ditinjau dari judul dan cuplikan kontennya lalu ditandai `drop` dengan alasan per catatan: 7384, 7377, 7361, 7369, 7368, 7349. Sebanyak 338 keputusan masih pending; tidak dibuat manifest rilis nyata. Salinan review sebelum perubahan disimpan lokal di `.data/main-site/review-before-triage.json`. Tidak ada penghapusan di WordPress.
- Pipeline media membatasi origin, redirect, byte dan piksel; menolak SVG/HTML, mengodekan ulang raster ke WebP tanpa metadata, memakai hash konten, dan menerbitkan manifest atomik hanya setelah seluruh gambar berhasil. File tidak terdaftar di manifest tidak dilayani. URL unggahan lama yang dipindahkan mendapat redirect ke gambar lokal.
- Persiapan lanjutan mengunduh seluruh 185 URL gambar pada 50 produk snapshot ke `.data/main-site/product-media-staging`, menghasilkan 181 WebP unik tanpa kegagalan. Total byte menurut pemetaan sumber 12.361.566 (menghitung duplikat). Seluruh berkas diperiksa ulang terhadap SHA-256 dan signature WebP; manifest tetap `approved: false`. Ini baru cache lokal media produk, bukan persetujuan konten produk atau migrasi semua media halaman/artikel.
- Ringkasan 14 halaman disimpan lokal di `.data/main-site/pages-review.json`; pemeriksaan menemukan placeholder/template pada panduan instalasi, tentang kami, beranda, dan katalog. Belum ada persetujuan massal.
- Percobaan `list_sites` setelah perintah "lanjutkan" tetap gagal dengan sesi hilang/kedaluwarsa. Pencarian operasi backup pada API hosting tidak menemukan kemampuan yang tersedia; tidak ada cadangan yang diklaim telah dibuat.

### Implementasi aplikasi

- Mode utama `GASCOMP_MAIN_SITE_ENABLED=true` menambahkan rute publik lewat `src/app/site/[[...path]]`; default false mempertahankan aplikasi bantuan. Nilai build/runtime harus sama. Beranda, header/footer, menu ponsel, label dan metadata bilingual, katalog/pencarian/pagination, kategori, detail produk, daftar/detail artikel, halaman informasi, sitemap/robots, dan redirect garansi telah diimplementasikan.
- `/dll` diarahkan ke klaim garansi support; halaman dukungan tetap menggunakan hostname support. `wp-admin`/`wp-login.php` pada mode utama mengarah ke admin baru. Ini tidak mengubah hosting WordPress sekarang.
- Konten artikel/deskripsi/kebijakan lama tetap dalam bahasa sumber. Terjemahan penuh dan tinjauan editorial belum selesai; label baru yang bilingual tidak membuktikan seluruh isi sudah diterjemahkan. Harga, checkout, countdown, dan klaim promosi yang belum terverifikasi tidak ditambahkan.
- Formulir kontak/reseller memiliki validasi server, batas JSON 24 KB, origin tetap, persetujuan penggunaan data, Turnstile server-side dengan hostname/action, dan kegagalan tertutup tanpa konfigurasi. Tidak menerima lampiran; klaim garansi tetap di support.
- Migrasi lokal `202610230001_main_site_leads.sql` menyediakan tabel privat dengan RLS, RPC idempotensi, batas 5/email/24 jam dan 200 total/jam, serta antrean notifikasi berlease. Belum diterapkan ke Supabase produksi.
- Inbox `/admin/main-site/inbox` menampilkan 50 kiriman per halaman dan status `new`, `in_progress`, `resolved`. GET dan PATCH memeriksa sesi; PATCH juga memeriksa origin dan badan permintaan terbatas. Respons privat memakai no-store.
- Pekerja notifikasi terpisah memakai TLS SMTP, lease database, dry run bawaan dan `--send` eksplisit. Email hanya berisi tautan admin/referensi tanpa data pelanggan. Kegagalan email tidak menghapus kiriman. SMTP/penerima/penjadwalan belum dikonfigurasi atau diuji nyata. Duplikasi tetap mungkin jika SMTP sukses sebelum acknowledgement database gagal.

### Dependensi dan keamanan

- Next.js dan eslint-config-next 16.4.2, parse5 8.0.1; perbaikan transitif dari sesi awal dipertahankan. shadcn berada pada devDependencies. sharp 0.35.5 dinyatakan sebagai dependensi skrip; nodemailer 10.2.1 untuk pekerja notifikasi.
- Audit produksi setelah tambahan dependensi: 0 temuan. Audit lengkap terakhir masih 9 high dari rantai alat pengembangan `braces`/micromatch/fast-glob/ESLint/shadcn; tidak diperbaiki dengan downgrade paksa. Jangan gunakan pola glob tidak tepercaya pada alat tersebut. Audit produksi bersih bukan jaminan keamanan total.
- Belum ada audit aktual terhadap akun WordPress, plugin terpasang, file server, rahasia, dump terbuka, atau konfigurasi hosting dalam sesi ini.

## Pekerjaan dan keputusan yang tersisa

1. Pulihkan konektor WordPress (API hosting umum sudah dapat dipakai). Pemilik sudah mencoba login; jangan menyamakan login hPanel dengan keberhasilan sesi konektor. Jangan meminta kredensial dalam chat.
2. Cocokkan sumber terautentikasi: halaman/draf, artikel asli versus spam, seluruh media, formulir/penerima, permalink/pengalihan, serta fitur WooCommerce yang benar-benar dipakai. Jangan menerbitkan seluruh snapshot publik secara otomatis.
3. Selesaikan keputusan per catatan dan terjemahan konten, lalu jalankan dry run dan pemindahan media penuh. Tinjau desain dengan konten nyata; fixture browser bukan desain final yang disetujui.
4. Konfigurasikan direktori rilis persisten, Supabase, Turnstile, SMTP/penerima, backup/retensi, dan worker setelah sumber/tujuan dikonfirmasi. Tidak ada akun/rahasia layanan yang dibuat oleh implementasi ini.
5. Tinjau dan terapkan migrasi produksi hanya melalui rilis yang diotorisasi. Jalankan penerimaan dengan database nyata dan provider sebenarnya, termasuk retry, batas pengiriman, inbox, dan antrean email.
6. Verifikasi Node versi hosting, pemisahan deployment utama dari docroot support/bantuan, dan semua URL lama sebelum cutover. Setelah deployment yang diotorisasi, buktikan build serta penanda live. Jangan menghapus WordPress sebelum rollback/cadangan dan kesetaraan alur terverifikasi.
7. Lanjutkan mitigasi dependensi alat pengembangan dan audit keamanan server. Belum ada dasar menyatakan "aman semuanya".

## Keputusan dan koreksi

Pemilik mengotorisasi implementasi penuh dan penggunaan Ruflo pada 23 Oktober 2026. Ruflo digunakan untuk pelacakan lintas sesi; tidak dianggap pengganti akses hosting. Pilihan agen dalam cakupan rekomendasi: mode deployment terpisah, rilis berbasis tinjauan, media lokal yang dikodekan ulang, penyimpanan privat Supabase, Turnstile, dan antrean SMTP. Pilihan tersebut adalah implementasi yang sudah diuji sebagian secara lokal, bukan konfigurasi produksi yang sudah diterima. Persyaratan permanen ada pada spesifikasi, bukan di catatan kemajuan ini.

## Verifikasi

Lingkungan lokal: Node 26.8.1, Next.js 16.4.2, 23 Oktober 2026.

- `npm run lint`: lulus tanpa error; dua warning lama pada `masalah/gascomp-site-tools/assets/widgets.js` mengenai variabel catch tidak digunakan.
- `npm run typecheck`: lulus.
- Sebelum push, tree Git terpilih diekspor ke direktori sementara tanpa perubahan pengguna lainnya dan tanpa `.env` produksi. Lint (tanpa warning), typecheck, tes (326 lulus, 7 dilewati), build support dan build situs utama semuanya lulus pada tree tersebut. Tautan Markdown lokal yang diubah juga diperiksa pada tree terisolasi; semuanya tersedia. `node_modules` memakai instalasi lokal yang sama.
- `npm run test`: pelaksanaan terakhir 333 tes, 326 lulus, 7 dilewati, 0 gagal. Pelaksanaan sebelumnya pada awal alur sempat gagal sekali pada tes waktu garansi; sumber garansi tidak diubah dan pengulangan penuh lulus.
- Build default support dan build `GASCOMP_MAIN_SITE_ENABLED=true`: keduanya lulus. Build akhir ruang kerja dikembalikan ke mode default support.
- HTTP mode support: `/` 200, `/site` 404, inbox tanpa sesi 307 ke login. Loading boundary publik dihapus setelah pengujian menemukan streamed not-found memberi status 200; pengulangan memverifikasi 404.
- Browser Chromium 1440/390 piksel memakai fixture konten sintetis `.data/main-site/browser-public` terpisah: menu, tampilan tanpa overflow, gambar lokal nyata, katalog/pagination 12 item, pencarian kosong, kategori/detail, bahasa, sitemap, redirect `/dll`, URL gambar lama, gambar tidak terdaftar 404, artikel karantina 404, dan formulir tanpa konfigurasi 503 lulus. Tidak ada request jaringan WordPress dari halaman uji dan tidak ada pageerror. Screenshot ponsel ditinjau; bukan bukti kesetaraan visual seluruh konten asli.
- Browser formulir/inbox ponsel: sukses/gagal, consent, mempertahankan input saat gagal, escape teks script, dan perubahan status lulus dengan Turnstile/API/database **tiruan**. Tidak mengirim email atau menyentuh produksi.
- Tes API dengan Supabase/Turnstile tiruan: menolak origin asing, badan besar, consent hilang, captcha gagal/hostname/action salah, serta akses admin tanpa sesi; sukses hanya sesudah validasi.
- PGlite menjalankan migrasi SQL nyata secara terisolasi: akses anon/authenticated ditolak, idempotensi dan batas email berlaku, worker notifikasi tidak mengambil lease yang sudah dimiliki worker lain. Ini bukan pengujian konkurensi banyak proses di produksi.
- Tes media menolak host asing/SVG/HTML dan menghasilkan WebP hash; tes rilis menolak keputusan stale/tidak lengkap; tes notifikasi tidak mengirim pada dry run dan tidak memasukkan data pelanggan ke email tiruan.
- `npm audit --omit=dev --json`: 0 temuan. Semua pemeriksaan tetap terbatas pada kode/lingkungan yang diuji.

## Tindakan selanjutnya

Pulihkan akses inventaris WordPress terautentikasi, lalu tuntaskan review konten, konfigurasi rilis, dan cadangan/cutover yang mempertahankan seluruh subfolder. Sebelum penimpaan, laporkan temuan docroot dan `.htaccess` serta minta konfirmasi sesuai AGENTS.md; izin deploy umum sudah diberikan. Perbarui tugas Ruflo yang sama; jangan menandai completed sebelum penerimaan penuh/live benar-benar tercapai.

## Referensi

- [Spesifikasi situs utama](../../product/features/main-site.md)
- [Penyiapan dan perintah](../../setup/main-site.md)
- [Konteks implementasi](../../../src/features/main-site/CONTEXT.md)
- [Eksporter publik](../../../scripts/main-site/export-public.mjs)
- [Persiapan rilis](../../../scripts/main-site/prepare-release.mjs)
- [Antrean email](../../../scripts/main-site/send-notifications.mjs)
- [Migrasi SQL](../../../supabase/migrations/202610230001_main_site_leads.sql)
- [Prosedur deployment Hostinger](../procedures/hostinger-deployment.md)
