<a id="gascomp-specification-index"></a>
# Indeks spesifikasi Gascomp

Spesifikasi dikelompokkan berdasarkan topik untuk menjaga setiap konteks kerja tetap kecil. Baca dokumen yang relevan dengan tugas dan buka topik lain hanya ketika ada ketergantungan yang mengharuskannya.

<a id="task-contexts"></a>
## Konteks tugas

| Topik | Dokumen | Dibaca untuk | Dimulai di |
| --- | --- | --- | --- |
| Tinjauan produk dan cakupan | [ikhtisar](overview.md) | Tujuan, pengguna, cakupan awal, indikator keberhasilan, keputusan terbuka | [README](../../README.md) |
| Katalog produk dan bantuan | [katalog](features/catalog.md) | Pencarian, halaman produk, masalah, FAQ, video tutorial | [katalog](../../src/features/catalog/) |
| Panel admin | [admin](features/admin.md) | Otentikasi, CRUD, draf/penerbitan, gambar, dashboard | [admin](../../src/features/admin/), [auth](../../src/features/auth/), [katalog](../../src/features/catalog/) |
| Kode QR produk dan URL | [QR](features/qr.md) | QR per-SKU, URL stabil, retensi panduan arsip | [komponen QR](../../src/features/catalog/components/qr-code-card.tsx), [rute](../../src/app/) |
| Saluran dukungan pelanggan | [dukungan](features/support.md) | WhatsApp, Gascomp Care, Pusat Layanan | [katalog](../../src/features/catalog/), [service center](../../src/features/service-center/) |
| Bantuan AI | [bantuan AI](features/ai-assistance.md) | Percakapan berbasis Obsidian, pekerja Hermes, serah terima WhatsApp, kontrol runtime | [fitur](../../src/features/ai-assistance/), [pekerja](../../scraping/ai_assistance/), [operasi](../../scripts/ai-assistance/) |
| Klaim garansi dan tiket | [garansi](features/warranty.md) | Formulir, bukti, nomor tiket, status, akses pribadi, kebijakan | [garansi](../../src/features/warranty/) |
| Keanggotaan GascompCare | [GascompCare](features/gascomp-care.md) | Akun anggota, login, kartu virtual, perpanjangan garansi berbayar yang direncanakan | [GascompCare](../../src/features/gascomp-care/) |
| Sinkronisasi katalog Duoke | [katalog Duoke](integrations/duoke-catalog.md) | Pengumpulan data, kolom sumber, impor idempoten, jaringan catatan produk Obsidian | [pengambilan data](../../scraping/duoke/catalog/), [skrip](../../scripts/duoke/) |
| Penyimpanan Supabase | [Supabase](integrations/supabase.md) | Database bersama, Supabase Storage, aturan akses, migrasi | [klien](../../src/shared/integrations/supabase/), [migrasi](../../supabase/migrations/) |
| Impor SKU gudang | [gudang](integrations/warehouse.md) | Normalisasi XLSX, pencocokan SKU, gambar, hasil impor | [normalisasi](../../scraping/warehouse/), [impor](../../scripts/warehouse/) |
| Pengetahuan Duoke dan balasan | [dukungan Duoke](integrations/duoke-support.md) | Percakapan historis, ulasan, persetujuan, pengambilan, pelari, audit, kontrol henti | [pengetahuan](../../scraping/duoke/knowledge/), [pelaksana balasan](../../scraping/duoke/reply/), [ekspor](../../scripts/duoke/export-duoke-knowledge.mjs) |
| Identitas merek dan desain publik | [merek](design/brand.md) | Referensi Gascomp, logo, warna, tipografi, desain mobile | [komponen bersama](../../src/shared/components/), [rute dan gaya](../../src/app/), [aset](../../public/) |
| Domain dan deployment | [deployment](operations/deployment.md) | Hostinger, hostname, DNS, HTTPS, runtime server, lingkungan produksi | [konfigurasi](../../next.config.ts), [perintah paket](../../package.json) |
| Struktur proyek | [arsitektur](../architecture/project-structure.md) | Penempatan file, ketergantungan, penamaan, metodologi | [sumber](../../src/), [skrip](../../scripts/), [scraping](../../scraping/) |
| Standar bahasa | [bahasa](../architecture/language-standard.md) | Aturan bahasa dan pengecualian kompatibilitas | [instruksi agen](../../AGENTS.md) |

Untuk kelancaran pekerjaan, gunakan [alur kerja](../work/workflow.md) dan [indeks serah terima](../work/README.md). Jika sebuah tugas tidak cocok dengan baris, gunakan dokumen struktur proyek untuk menemukan pemiliknya sebelum memperluas pencarian.

Gunakan [peta konteks folder](../../CONTEXT.md) untuk input, tugas, output, dan verifikasi area implementasi yang dipilih.

<a id="maintenance-rules"></a>
## Aturan pemeliharaan

- Pertahankan `spec.md` sebagai indeks ringkas. Masukkan detail ke dalam dokumen yang memiliki topik tersebut.
- Baca `overview.md` hanya ketika tugas memerlukan konteks produk secara keseluruhan.
- Ikuti tautan antar-topik sesuai kebutuhan; jangan muat seluruh set spesifikasi secara default.
- Catat perubahan keputusan dan status dalam satu dokumen pemilik tanpa menduplikasinya di tempat lain.
- Tambahkan dokumen baru yang berfokus dan baris indeks ketika muncul topik independen baru.
- Perlakukan status implementasi sebagai catatan bertanggal dan verifikasi perilaku saat ini di kode.
- Gunakan bahasa Indonesia untuk dokumen Markdown (`.md`) milik proyek. Pertahankan nama database, folder, file, path, perintah, pengenal, dan nilai kompatibilitas apa adanya. Kode, konfigurasi, komentar, pengujian, log, serta keluaran non-Markdown tetap mengikuti [standar bahasa](../architecture/language-standard.md).
- Pengalaman produk yang ditujukan untuk pelanggan harus mendukung Bahasa Indonesia dan Inggris serta menyediakan pemilih bahasa.
- Pertahankan nilai eksternal secara persis sesuai pengecualian kompatibilitas dalam [standar bahasa](../architecture/language-standard.md).
