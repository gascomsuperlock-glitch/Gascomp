# Gascomp Product Help

Website bantuan purnajual Gascomp. Pelanggan dapat membuka panduan produk melalui QR, menonton video YouTube langsung di website, membaca solusi kendala dan FAQ, lalu menghubungi admin melalui WhatsApp.

## Halaman

- `/` — katalog produk dan pintasan bantuan.
- `/produk/[slug]` — tutorial, panduan kendala, FAQ, dan WhatsApp per SKU.
- `/klaim-garansi` — formulir tiket klaim garansi internal dengan nomor tiket.
- `/admin` — CRUD produk, variasi dan gambar, pengelolaan tautan YouTube, FAQ, QR, serta pemeriksaan tiket klaim garansi.

Supabase menjadi penyimpanan utama saat environment variable-nya tersedia. Produk, variasi, konten bantuan, dan metadata gambar disimpan di PostgreSQL; gambar produk disimpan di bucket publik `product-images`; tiket serta lampiran klaim disimpan di tabel privat dan bucket privat `warranty-evidence`. Tanpa konfigurasi Supabase, localhost tetap berjalan dalam mode lokal agar pengembangan UI tidak terhenti.

Gambar produk menerima JPG, PNG, atau WebP hingga 8 MB per file dan maksimal enam gambar per produk. Browser mengompres gambar ke WebP sebelum mengunggahnya. Produk yang pernah dipublikasikan dapat diarsipkan agar URL dari QR tetap aktif; penghapusan permanen tersedia untuk draft atau entri keliru.

Formulir klaim menerima nomor pesanan, harga, invoice, satu sampai empat foto, serta video kendala. Pelanggan menerima nomor `GWC-YYYYMMDD-XXXXXX`; tiket yang sama tampil di menu **Tiket garansi** pada admin. Saat Supabase belum dikonfigurasi, data localhost disimpan di `.data/warranty-tickets/` yang diabaikan Git.

Untuk mengaktifkan Supabase, isi variabel pada `.env.example` ke `.env.local`, lalu jalankan migrasi berikut secara berurutan melalui Supabase SQL Editor:

1. `supabase/migrations/202609100001_catalog.sql` untuk katalog dan riwayat impor Duoke (lewati jika sudah dijalankan).
2. `supabase/migrations/202609100002_warranty.sql` untuk tiket garansi dan bucket privat lampiran.

Error `PGRST205` pada tiket berarti tabel garansi belum tersedia di schema cache. Jalankan migrasi garansi, lalu muat ulang `/admin`. Dashboard tetap dapat dibuka saat tiket gagal dimuat dan menampilkan pemberitahuan.

Dashboard admin dilindungi dengan login server dan cookie HTTP-only bertanda tangan. Salin konfigurasi dari `.env.example` ke `.env.local`, lalu isi kredensial yang kuat:

```bash
GASCOMP_ADMIN_USERNAME=admin
GASCOMP_ADMIN_PASSWORD=password-kuat-minimal-12-karakter
GASCOMP_AUTH_SECRET=random-secret-minimal-32-karakter
```

Kredensial lokal proyek ini sudah tersedia di `.env.local` yang diabaikan Git. Ganti seluruh nilainya sebelum deployment.

Gunakan konfigurasi berikut untuk Supabase. Secret key hanya dibaca oleh modul server dan tidak boleh memakai awalan `NEXT_PUBLIC_`.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
```

Setelah hasil Duoke dinormalisasi, kirim produk dan variasi ke Supabase tanpa menimpa video, FAQ, atau panduan yang dikelola admin:

```bash
npm run duoke:import
npm run duoke:push
```

## Menjalankan proyek

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

## Pemeriksaan

```bash
npm run lint
npm run build
```
