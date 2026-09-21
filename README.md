<a id="gascomp-product-help"></a>
# Bantuan Produk Gascomp

Website dukungan purna jual Gascomp. Pelanggan dapat membuka panduan produk dari kode QR, menonton tutorial YouTube yang tertanam, meninjau langkah perbaikan masalah dan pertanyaan yang sering diajukan (FAQ), mengajukan klaim garansi, dan menghubungi dukungan melalui WhatsApp.

<a id="pages"></a>
## Halaman

- `/` — katalog produk dan pintasan dukungan.
- `/produk/[slug]` — tutorial, perbaikan masalah, FAQ, akses garansi, dan dukungan WhatsApp untuk satu SKU.
- `/klaim-garansi` — formulir klaim garansi internal yang mengembalikan nomor tiket.
- `/admin` — manajemen produk, variasi, gambar, tutorial, FAQ, QR, pengaturan, dan tiket garansi.

Segmen rute berbahasa Indonesia adalah kontrak publik yang stabil. Segmen tersebut tetap sama agar tautan dan kode QR yang sudah dicetak terus berfungsi. Dokumen Markdown menggunakan bahasa Indonesia; kode aplikasi, komentar kode, keluaran sistem, serta nama dan nilai database tetap mengikuti kontrak teknis yang berlaku. Nama produk, SKU, header gudang, dan contoh pesan pelanggan mempertahankan bahasa sumbernya jika diperlukan untuk pencocokan persis.

<a id="storage-and-authentication"></a>
## Penyimpanan dan autentikasi

Supabase adalah penyimpanan utama ketika variabel lingkungannya dikonfigurasi. PostgreSQL menyimpan produk, konten bantuan, metadata gambar, tiket, dan metadata bukti. Supabase Storage menggunakan wadah `product-images` publik dan `warranty-evidence` privat. Tanpa Supabase, pengembangan lokal menggunakan penyimpanan browser untuk konten katalog dan `.data/warranty-tickets/` untuk tiket garansi.

Rute admin menggunakan autentikasi sisi server dan cookie bertanda tangan HTTP-only. Salin `.env.example` ke `.env.local` dan ganti setiap kredensial contoh sebelum deployment:

```bash
GASCOMP_ADMIN_USERNAME=admin
GASCOMP_ADMIN_PASSWORD=replace-with-a-strong-password-at-least-12-characters
GASCOMP_AUTH_SECRET=replace-with-a-random-secret-at-least-32-characters
```

Atur asal produksi publik yang digunakan dalam kode QR:

```bash
GASCOMP_PUBLIC_BASE_URL=https://support.gascompsuperlock.com
```

Pembuatan QR code dinonaktifkan ketika nilai tersebut hilang atau mengarah ke localhost.

Ikuti [panduan deployment](docs/product/operations/deployment.md) untuk menghubungkan hosting, Cloudflare DNS, dan HTTPS sebelum mencetak kode QR. Permintaan pada hostname lama `bantuan.gascompsuperlock.com` akan diarahkan ke `support.gascompsuperlock.com` setelah DNS, pengikatan hosting, dan HTTPS untuk hostname lama juga dikonfigurasi.

Konfigurasi Supabase dengan kredensial server. Kunci rahasia tidak boleh pernah menggunakan prefiks `NEXT_PUBLIC_`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
```

Jalankan migrasi berikut secara berurutan melalui Supabase SQL Editor:

1. `supabase/migrations/202609100001_catalog.sql`
2. `supabase/migrations/202609100002_warranty.sql`
3. `supabase/migrations/202609110001_english_system_defaults.sql`

`PGRST205` untuk tiket garansi berarti migrasi garansi hilang dari cache skema. Jalankan migrasi dan muat ulang `/admin`.

<a id="catalog-imports"></a>
## Impor katalog

Tangkap dan normalisasi produk Duoke, lalu dorong produk dan variasi tanpa menimpa tutorial, FAQ, masalah, atau gambar yang dikelola admin:

```bash
npm run duoke:import
npm run duoke:push
```

Normalisasi ekspor XLSX gudang dan impor hasilnya ke Supabase:

```bash
npm run warehouse:normalize -- "/path/SKU_Gudang.xlsx"
npm run warehouse:push
```

Pipeline gudang hanya membaca kolom sumber yang diperlukan untuk SKU, judul, kategori, URL gambar, dan kode produk. Produk baru tetap dalam draf. Konten SKU yang ada dipertahankan. Gambar sumber yang valid disalin ke `product-images`.

<a id="duoke-support-automation"></a>
## Dukungan Duoke untuk otomatisasi

Bangun basis pengetahuan runtime dari konten yang diterbitkan dan telah ditinjau:

```bash
npm run duoke:knowledge:export
npm run duoke:knowledge:query -- "customer question and SKU"
```

Indeks runtime disimpan di `data/knowledge/duoke-knowledge.json`; catatan terkait ditulis ke `obsidian/`. Hanya entri dengan `approval: approved` yang dapat menjadi jawaban aktif.

Sesi browser Duoke disimpan di `scraping/.private/browser-profile/` dan diabaikan oleh Git. Segarkan dan periksa sesi dengan:

```bash
npm run duoke:login
npm run duoke:inspect
```

Gunakan laporan inspeksi privat untuk mengonfigurasi pemilih `DUOKE_*` di `.env.local`, lalu jalankan satu kali pembacaan tanpa hak edit:

```bash
npm run duoke:reply:dry-run
```

Ambil percakapan historis yang disetujui dan buat kandidat tinjauan yang telah dianonimkan dengan:

```bash
npm run duoke:chat:capture
npm run duoke:knowledge:build
```

Data mentah tetap tersimpan di `scraping/.private/chat-captures/`. Kandidat akan menunggu hingga seorang peninjau menyediakan konten bahasa Inggris yang telah dianonimkan dan diverifikasi:

```bash
scraping/.venv/bin/python -m scraping.duoke.knowledge.approve_duoke_knowledge \
  --candidate history-xxxxxxxxxxxxxxxx \
  --product-id product-id \
  --question-file /path/anonymized-question.txt \
  --answer-file /path/approved-answer.txt \
  --reviewer reviewer-id
npm run duoke:knowledge:export
```

Pengiriman nyata memerlukan `--send` dan `DUOKE_AUTOREPLY_ENABLED=true`. Basis pengetahuan harus menggunakan asal HTTPS yang bukan localhost. Berhenti dan lanjutkan mode pemantauan dengan:

```bash
npm run duoke:stop
npm run duoke:resume
```

<a id="development"></a>
## Pengembangan

Aplikasi mengikuti arsitektur berbasis fitur di `src/app`, `src/features`, dan `src/shared`. Otomasi Python berada di `scraping`, skrip Node operasional di `scripts`, dan file persisten di `data`. Baca [struktur proyek](docs/architecture/project-structure.md), [standar bahasa](docs/architecture/language-standard.md), dan [indeks spesifikasi](docs/product/spec.md).

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

<a id="working-with-an-agent"></a>
## Bekerja dengan agen

Mulai dengan [AGENTS.md](AGENTS.md), [peta tugas](docs/product/spec.md), dan [peta konteks folder](CONTEXT.md). Setiap area pemilik mendefinisikan input, tugas, keluaran yang diharapkan, dan verifikasi dalam dokumen konteks yang terfokus.
Untuk pekerjaan berkelanjutan, baca [indeks serah terima](docs/work/README.md) dan ikuti [alur keberlanjutan pekerjaan](docs/work/workflow.md). Mintalah untuk melanjutkan topik tertentu atau menyimpan kemajuannya; alur kerja mendefinisikan apa yang harus dibaca dan dicatat.

<a id="verification"></a>
## Verifikasi

```bash
npm run lint
npm run typecheck
npm run test
npm run duoke:test
npm run build
```
