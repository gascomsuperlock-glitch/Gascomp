# Penyiapan migrasi situs utama

[Spesifikasi](../product/features/main-site.md) · [Serah terima](../work/handoffs/handoff-php-javascript-blocked-v1.md)

## Lingkungan dan data

Gunakan Node yang didukung Next.js 16.4.2. Pengujian lokal sesi ini memakai Node 26.8.1; Node hosting harus diuji saat rilis. Instalasi build/skrip membutuhkan devDependencies (`npm ci`), termasuk `sharp` untuk migrasi media. Jangan menjalankan alat glob/build dengan pola tidak tepercaya; audit alat pengembangan masih memiliki temuan `braces`.

Konfigurasi tersedia pada `.env.example`. Jangan menyimpan rahasia di Markdown atau Git. Nilai `GASCOMP_MAIN_SITE_ENABLED` harus sama pada build dan runtime. Aplikasi bantuan mempertahankan nilai false. Pilih deployment terpisah untuk situs utama setelah meninjau topologi hosting; jangan mengganti atau menghapus docroot support/bantuan.

- `GASCOMP_MAIN_SITE_ORIGIN`: origin HTTPS final, tanpa path/query. HTTP hanya diterima untuk loopback lokal.
- `GASCOMP_MAIN_SITE_DATA_DIR`: direktori absolut persisten berisi `release.json` dan `media/`. Bawaan lokal adalah `.data/main-site`. Lokasi ini harus berada di luar direktori statis publik, dicadangkan, dan dipertahankan saat deployment.
- `GASCOMP_MAIN_SITE_PREVIEW_ENABLED=true`: mengaktifkan pratinjau snapshot lokal di `/admin/main-site`, tetap memerlukan sesi admin.
- `GASCOMP_TURNSTILE_SITE_KEY` dan `GASCOMP_TURNSTILE_SECRET_KEY`: konfigurasi provider untuk hostname final. Kunci rahasia hanya berada di server.
- Konfigurasi Supabase mengikuti penyiapan yang sudah ada. Migrasi `202610230001_main_site_leads.sql` harus diterapkan melalui alur rilis yang diotorisasi sebelum formulir digunakan. File lokal bukan bukti migrasi produksi.

## Ekspor dan tinjauan

Dari akar proyek:

```bash
node scripts/main-site/export-public.mjs
node scripts/main-site/export-public.mjs --write
node scripts/main-site/prepare-release.mjs --review-template
```

Perintah pertama hanya melaporkan hasil pengambilan; `--write` menulis snapshot lokal, tidak mengubah WordPress. Template tinjauan memakai `wx` dan tidak menimpa `review.json` yang sudah ada. Setiap keputusan memerlukan kunci catatan, digest, `keep`/`drop`, dan alasan. Jangan menganggap konten aman hanya karena skrip sudah dibuang: artikel spam, placeholder, klaim produk, dan terjemahan perlu ditinjau. Preview lokal menampilkan konten sumber; jangan kirim screenshot berisi spam sebagai desain situs final.

Setelah semua keputusan terisi dan diverifikasi:

```bash
node scripts/main-site/prepare-release.mjs
node scripts/main-site/prepare-release.mjs --write
```

Tanpa `--write`, tidak ada unduhan media atau publikasi manifest. Dengan `--write`, media dipindahkan dan manifest lokal diganti atomik hanya setelah semuanya berhasil. Perintah ini tidak melakukan deployment. Pindahkan artefak yang sudah diverifikasi ke direktori persisten deployment melalui prosedur rilis, bukan ke `public/`.

## Build dan pemeriksaan

```bash
npm run lint
npm run typecheck
npm run test
npm run build
GASCOMP_MAIN_SITE_ENABLED=true npm run build
```

Build terakhir di `.next` menentukan konfigurasi routing saat `next start`; kembalikan build bawaan jika ruang kerja akan dipakai menjalankan aplikasi bantuan. Jalankan mode utama dengan environment yang sama dan direktori data yang sudah ditinjau. Periksa beranda, katalog, produk, kategori, artikel, kontak/reseller, kebijakan, sitemap, robots, URL gambar lama, dan redirect `/dll`.

Pengujian di `.data/main-site/browser-public` adalah fixture sintetis; jangan menyalinnya menjadi rilis. Snapshot publik asli tetap belum disetujui.

## Inbox dan email

Inbox: `/admin/main-site/inbox`. Tidak ada kiriman yang dapat dibaca melalui endpoint publik. Status dapat diubah oleh admin. Tanpa database/Turnstile yang terkonfigurasi, aplikasi menampilkan atau mengembalikan ketidaktersediaan; jangan mengklaim pengiriman berhasil.

Konfigurasi notifikasi opsional: `GASCOMP_SMTP_HOST`, `GASCOMP_SMTP_USERNAME`, `GASCOMP_SMTP_PASSWORD`, `GASCOMP_MAIN_SITE_NOTIFY_FROM`, dan `GASCOMP_MAIN_SITE_NOTIFY_TO`. Alamat penerima tunggal harus menjadi mailbox admin yang sah. SMTP memerlukan TLS pada port 465.

```bash
node scripts/main-site/send-notifications.mjs
```

Perintah tersebut membaca jumlah antrean saja. Varian `--send` benar-benar mengirim email dan hanya dijalankan ketika pengiriman diotorisasi. Penjadwalan pekerja, mailbox penerima, retensi, cadangan, dan pengiriman nyata belum diverifikasi. Lease database berakhir setelah 15 menit jika pekerja gagal; jangan menghapus kiriman untuk memulihkan antrean.

## Batas kesiapan

Akses WordPress/Hostinger terautentikasi diperlukan untuk mencocokkan inventaris lengkap, konfigurasi lama, dan keamanan server. Pemindahan konten privat, penghapusan WordPress, perubahan DNS/docroot, migrasi produksi, dan deployment adalah tindakan terpisah. Rilis harus mengikuti [prosedur Hostinger](../work/procedures/hostinger-deployment.md) dan membuktikan penanda live, bukan hanya build lokal.
