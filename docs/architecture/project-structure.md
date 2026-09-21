<a id="project-structure"></a>
# Struktur proyek

Proyek ini menggunakan **arsitektur berbasis fitur**. Tanggung jawab bisnis menentukan batas modul; Next.js menyediakan lapisan routing dan komposisi.

```text
src/
  app/                            # Halaman, tata letak, metadata, route handler, CSS global
  features/
    auth/                         # Login admin, sesi, dan logout
    catalog/                      # Katalog publik, bantuan produk, editor, QR, konten
    warranty/                     # Klaim, tiket, status, dan bukti
    gascomp-care/                 # Akun anggota, sesi, dan kartu virtual
    service-center/               # Lokasi Indonesia, peta publik, dan administrasi lokasi
    ai-assistance/                # Percakapan pelanggan berbasis sumber, kontrak pekerja, kontrol runtime
    admin/                        # Dashboard, navigasi, ringkasan lintas fitur
  shared/
    components/                   # Merek, header, dan UI yang dapat digunakan kembali
    lib/                          # ID, nama kelas, pembantu YouTube/WhatsApp, tipe ikon
    integrations/supabase/        # Pembuatan klien hanya di server
scraping/
  ai_assistance/                  # Indeks Obsidian khusus dan pekerja Hermes lokal
  duoke/{catalog,chat,knowledge,reply}/
  warehouse/                      # Pembacaan dan normalisasi XLSX
  shared/                         # Pembantu path, JSON, lingkungan, dan privasi
  tests/                          # Tes unit dan fixture sementara
  .private/                       # Data runtime privat; diabaikan Git
  .venv/                          # Lingkungan Python lokal; diabaikan Git
scripts/
  duoke/                          # Impor Supabase dan ekspor pengetahuan
  warehouse/                      # Pratinjau dan impor gudang
  supabase/                       # Pemeriksaan koneksi
  shared/                         # Path, lingkungan, dan klien skrip
  scratch/                        # Percobaan manual; bukan titik masuk aplikasi
data/{catalog,knowledge,reports}/
docs/{architecture,product,reference,setup,brand,work}/
obsidian/                         # Vault pengetahuan; lokasi tetap
public/                           # Aset URL publik; lokasi tetap
supabase/migrations/              # Migrasi database berurutan; lokasi tetap
```

<a id="placement-and-dependency-rules"></a>
## Aturan penempatan dan ketergantungan

- `app` menyusun fitur dan memiliki kontrak rute Next.js. Logika bisnis dan Server Actions milik fitur pemiliknya.
- `admin` dapat menyusun modul katalog, garansi, GascompCare, pusat layanan, dan autentikasi. Fitur tidak boleh mengimpor `app` atau `admin`.
- `shared` tidak boleh mengimpor fitur atau rute. ESLint menegakkan batas ketergantungan alias utama.
- Fitur dapat menggunakan `components`, `hooks`, `model`, dan `server` ketika folder tersebut berisi modul nyata. Jangan buat folder konvensi kosong.
- Impor modul klien dan server secara langsung. Jangan gabungkan mereka dalam ekspor barrel. Modul database dan filesystem menggunakan `server-only`; Server Actions menggunakan `use server`.
- `@/*` terurai ke `src/*`; `@data/*` terurai ke akar `data/*`. Impor relatif diperbolehkan dalam satu modul koheren. Gunakan `import type` untuk ketergantungan tipe-hanya.
- File TypeScript dan JavaScript menggunakan `kebab-case`; komponen React menggunakan `PascalCase`; file Python dan paket menggunakan `snake_case`. File yang dipreservasi oleh framework, migrasi, file sumber, dan aset publik mempertahankan nama yang diperlukan mereka.

<a id="data-ownership-and-compatibility"></a>
## Kepemilikan data dan kompatibilitas

| Lokasi | Isi |
| --- | --- |
| `data/catalog` | Katalog Duoke dan gudang yang dinormalisasi |
| `data/knowledge` | Pengetahuan runtime, entri yang ditinjau, pesan bot |
| `data/reports` | Sinkronisasi, impor, dan laporan pratinjau |
| `.data/warranty-tickets` | Tiket lokal dan bukti; diabaikan oleh Git |
| `scraping/.private` | Sesi browser, tangkapan, audit, keadaan, penanda berhenti |
| `obsidian` | Catatan produk dan pengetahuan |

Jalan Python terpusat di `scraping/shared/paths.py`; skrip Node menggunakan `scripts/shared/paths.mjs`. Jalan terurai dari lokasi modul daripada direktori kerja proses.

URL publik, nama perintah npm, argumen CLI, cookie sesi, kunci local-storage, skema JSON, identifikasi skema database, dan nilai penyedia sumber tetap kompatibel. Pemanggilan Python langsung menggunakan modul:

```bash
scraping/.venv/bin/python -m scraping.duoke.knowledge.approve_duoke_knowledge --help
```

<a id="language-standard"></a>
## Standar bahasa

Gunakan bahasa Indonesia untuk semua dokumen Markdown milik proyek. Kode, konfigurasi, komentar kode, pengujian, log, pesan CLI, kesalahan validasi, serta keluaran non-Markdown mengikuti kontrak teknis berbahasa Inggris. Pertahankan nama dan nilai database, nama folder dan file, path, perintah, pengenal, serta nilai sumber eksternal secara persis. Lihat [standar bahasa](language-standard.md) untuk aturan dan pengecualian lengkap. Segmen rute Indonesia tetap stabil agar tautan dan kode QR yang sudah dicetak terus berfungsi.

<a id="verification"></a>
## Verifikasi

```bash
npm run lint
npm run typecheck
npm run test
npm run duoke:test
npm run build
```

Model uji coba Node berjalan di samping modulnya sebagai `*.test.mjs`. Uji coba Python menggunakan lingkungan virtual proyek. Penutupan browser mencakup katalog, detail produk, login/logout, editor, QR, pengajuan garansi, status tiket, dan akses bukti pribadi.

Persyaratan produk dikelompokkan dalam [indeks topik](../product/spec.md). Pengaturan dokumentasi database ada di [pengaturan Supabase](../setup/supabase.md).

<a id="folder-context-contracts"></a>
## Kontrak konteks folder

Akar [CONTEXT.md](../../CONTEXT.md) memetakan tanggung jawab ke konteks folder.
Sebelum bekerja di area yang dipilih, muat konteksnya secara eksplisit melalui peta tersebut.
Sebuah konteks memiliki tujuan area, referensi input, tabel tugas/proses/output yang didukung, batas, dan verifikasi. Akar AGENTS.md tetap pemilik aturan global; spesifikasi produk tetap pemilik perilaku. Konteks menghubungkan sumber-sumber tersebut dan harus diperbarui bersama perubahan tanggung jawab atau penempatan.

Rute aplikasi, infrastruktur bersama, setiap fitur, skrip, scraping, Supabase, dan dokumentasi memiliki file `CONTEXT.md` lokal. Turunan teknis mereka mewarisi konteks tersebut; skrip, scraping, dan dokumentasi termasuk baris dispatch untuk folder anak. Tambahkan konteks yang lebih spesifik hanya ketika anak itu membutuhkan panduan yang berbeda, dan hubungkan dari induknya atau peta ruang kerja. Tidak diasumsikan penemuan otomatis editor `CONTEXT.md`.

Konteks Data, Obsidian, dan aset publik hidup di `docs/architecture/folder-contexts/`
untuk menghindari menyisipkan instruksi agen ke dalam data yang dihasilkan, asupan pengetahuan, atau aset yang diserve secara publik. Folder ketergantungan, cache, keadaan runtime pribadi, dan repositori referensi pihak ketiga tidak menerima kerangka konteks proyek.

Pertahankan nama file konteks tetap stabil. Konvensi penamaan status dan versi catatan serah terima tidak berlaku untuk kontrak folder yang persisten. Tabel Tugas sebuah konteks menjelaskan pekerjaan yang dapat diminta; hanya pekerjaan yang benar-benar diminta yang termasuk dalam catatan serah terima bertanggal.

<a id="work-continuity-documents"></a>
## Dokumen kelanjutan kerja

`docs/work/workflow.md` berisi prosedur memulai dan menyerahkan pekerjaan.
`docs/work/README.md` mengindeks catatan berfokus di `docs/work/handoffs/`.
Buat satu catatan per alur kerja aktual ketika keberlanjutan diperlukan; jangan buat kerangka catatan kosong untuk setiap fitur. Catatan serah terima mencatat pengamatan bertanggal dan langkah selanjutnya, bukan persyaratan produk atau pengetahuan pelanggan. Gunakan [alur kerja](../work/workflow.md) untuk aturan kepemilikan, pemeliharaan, dan verifikasi. Artefak serah terima menggunakan `handoff-<topic>-<status>-v<version>.md`; alur kerja tersebut memiliki pemetaan status dan prosedur penamaan. File instruksi yang stabil dan spesifikasi topik mempertahankan nama yang ada.

<a id="reusable-work-procedures"></a>
## Prosedur kerja yang dapat digunakan kembali

`docs/work/learning.md` menjelaskan cara mengambil tujuan, koreksi, sumber, alasan, asumsi, dan bukti penerimaan dari dialog. Metode terfokus berada di `docs/work/procedures/` dengan nama deskriptif yang stabil dan ditautkan dari konteks pemilik. Keputusan produk tetap berada dalam spesifikasi topik; hasil pelaksanaan tetap berada dalam catatan serah terima. Prosedur menjelaskan langkah kerja, bukan duplikasi backlog.

<a id="decision-derive-procedures-from-observed-work"></a>
### Keputusan: turunkan prosedur dari pekerjaan yang diamati

Dicatat: 2026-09-18

Sumber: pemilik menyediakan penjelasan dialog/konteks Jake dan meminta bahwa bagian yang hilang dari workflow proyek ini diselesaikan dan diperjelas.

Keputusan: pertahankan konteks folder yang ada dan lengkapi tugas berulang dengan keputusan yang memiliki atribusi sumber, prosedur konkret, kasus penerimaan, dan verifikasi bertanggal. Mulai dengan pekerjaan status/penyelesaian di garansi.

Alasan: Diskusi sebelumnya mengidentifikasi kesenjangan antara tanggung jawab folder dan metode yang didukung oleh pekerjaan aktual. Memilih garansi sebagai contoh awal adalah usulan agen dalam diskusi tersebut; ini bukan persyaratan produk garansi yang baru ditemukan.

Menggantikan: Tidak ada. Ini memperluas kontrak folder dan dokumentasi kelanjutan.

Penerimaan: Permintaan status/penyelesaian dapat mencapai prosedur melalui konteks garansi, kemudian menemukan persyaratan, titik masuknya, hasil yang diharapkan, dan bukti-bukti terkait. Lihat [prosedur](../work/procedures/warranty-status.md) dan [bukti garansi tertanggal](../work/handoffs/handoff-warranty-review-v1.md).

<a id="methodology-references"></a>
## Referensi Metodologi

Struktur yang disepakati mengikuti arsitektur berbasis fitur dan referensi metodologi repositori:

- https://www.skool.com/cliefnotes/classroom/036893d9?md=3dfa0ebc083349e4928e6b8e3b54b7fd
- https://www.skool.com/cliefnotes/classroom/d3907117?md=f7a33a9888604a08a7e48bb876682691
- https://www.skool.com/cliefnotes/classroom/2a86a1d1?md=c7a59d0fa0c145549dc9126470b7f82f

Halaman publik mengekspos judul modul dan memerlukan akun terautentikasi untuk konten pelajaran. Kesepakatan implementasi tetap berlaku: routing di `src/app`, fitur di `src/features`, modul yang dapat digunakan kembali di `src/shared`, dan aset statis di `public`.
