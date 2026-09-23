<a id="douke-web-workspace-context"></a>
# Ruang kerja Douke Web

[Aturan akar](AGENTS.md) · [Peta tugas produk](docs/product/spec.md) · [Serah terima pekerjaan](docs/work/README.md)

<a id="purpose"></a>
## Tujuan

Jaga aplikasi bantuan produk Gascomp dan katalognya, serta alur klaim garansi, anggota, pusat layanan, dan dukungan. Permintaan saat ini dari pemilik menyediakan misi; konteks folder menentukan di mana dan bagaimana pekerjaan tersebut ditangani.

<a id="select-a-folder-context"></a>
## Pilih konteks folder

Baca spesifikasi produk yang sesuai, lalu hanya baca konteks untuk area yang akan Anda periksa atau ubah. Setiap konteks mencantumkan masukan, tugas yang didukung, batas, keluaran, dan verifikasi. Ikuti konteks lain hanya jika ada ketergantungan nyata.

| Ruang lingkup folder | Konteks | Tanggung jawab |
| --- | --- | --- |
| `src/app/` | [Baca konteks](src/app/CONTEXT.md) | Rute dan komposisi |
| `src/shared/` | [Baca konteks](src/shared/CONTEXT.md) | Infrastruktur yang dapat digunakan kembali |
| `src/features/auth/` | [Baca konteks](src/features/auth/CONTEXT.md) | Otentikasi admin |
| `src/features/catalog/` | [Baca konteks](src/features/catalog/CONTEXT.md) | Katalog dan bantuan produk |
| `src/features/warranty/` | [Baca konteks](src/features/warranty/CONTEXT.md) | Klaim garansi dan tiket |
| `src/features/gascomp-care/` | [Baca konteks](src/features/gascomp-care/CONTEXT.md) | Keanggotaan GascompCare |
| `src/features/service-center/` | [Baca konteks](src/features/service-center/CONTEXT.md) | Direktori pusat layanan |
| `src/features/ai-assistance/` | [Baca konteks](src/features/ai-assistance/CONTEXT.md) | Bantuan AI pelanggan |
| `src/features/admin/` | [Baca konteks](src/features/admin/CONTEXT.md) | Komposisi ruang kerja admin |
| `scripts/` | [Baca konteks](scripts/CONTEXT.md) | Operasi Node |
| `scraping/` | [Baca konteks](scraping/CONTEXT.md) | Alur kerja Python |
| `supabase/` | [Baca konteks](supabase/CONTEXT.md) | Skema dan garis dasar rilis |
| `docs/` | [Baca konteks](docs/CONTEXT.md) | Dokumentasi |
| `data/` | [Baca konteks](docs/architecture/folder-contexts/data.md) | Konteks eksternal untuk data |
| `public/` | [Baca konteks](docs/architecture/folder-contexts/public.md) | Konteks eksternal untuk publik |

<a id="dispatch-and-inheritance"></a>
## Penugasan dan pewarisan

- `src/` merute ke kepemilikan aplikasi, bersama, atau fitur di atas. `src/features/` merute berdasarkan fitur; ia tidak memiliki logika bisnis lintas fitur.
- Turunan teknis seperti `components/`, `model/`, `server/`, segmen rute, dan subpaket operasional mewarisi konteks terdekat yang terdaftar. Konteks skrip, scraping, dan dokumen berisi baris tugas untuk folder anak mereka.
- Konteks untuk data dan aset publik berada di bawah dokumentasi untuk menjaga instruksi agen di luar konten yang dihasilkan, dimakan, atau disajikan secara publik. Vault pengetahuan berada di luar repositori ini, di `douke-chat/knowledge/approved/Douke Knowledge Base`, dan dapat ditimpa dengan `DOUKE_VAULT_DIR`.
- Pekerjaan konfigurasi akar dimulai dengan [struktur proyek](docs/architecture/project-structure.md), [perintah paket](package.json), dan spesifikasi topik yang berlaku. Periksa konsumen sebelum mengubah konfigurasi build, lint, ketergantungan, atau deployment.
- Folder ketergantungan, cache, state runtime privat, internal Git, dan checkout referensi pihak ketiga bukan tujuan tugas untuk membuat kerangka. Periksa mereka hanya ketika diperlukan untuk pekerjaan yang diminta. `awesome-codex-subagents/` yang ada adalah bahan referensi yang kepemilikannya dicatat dalam indeks handoff.
- Jika tidak ada folder yang cocok, kembali ke peta tugas produk, identifikasi area pemilik terkecil, dan tambahkan konteks hanya jika ada tanggung jawab baru. Jangan cari setiap folder secara default.
- Pekerjaan otomasi Duoke dimulai di [konteks Python](scraping/CONTEXT.md) dan mengikuti [target balasan otomatis Hermes Desktop](docs/product/integrations/duoke-support.md#target-automatic-replies-through-hermes-desktop). Celah implementasi saat ini harus berada dalam handoff pekerjaan yang terkait.
- [Konsep Duoke yang dikoreksi](docs/product/integrations/duoke-support.md#reference-based-replies-and-continuous-operation) menggunakan database admin Q&A Obsidian penuh sebagai referensi jawaban, Hermes sebagai kerangka kerja, dan Chrome headless untuk layanan pelanggan berkelanjutan. Optimasi sapaan adalah sekunder; kesiapan 24/7 memerlukan verifikasi operasional terpisah.

<a id="tasks-and-current-state"></a>
## Tugas dan kondisi saat ini

Tabel Tugas sebuah konteks adalah kontrak kerja yang dapat digunakan kembali, bukan permintaan untuk menjalankan setiap baris. Permintaan tugas dan otorisasi pengguna saat ini mendefinisikan tugas tersebut. Gunakan indeks handoff untuk pekerjaan belum selesai yang sebenarnya; jangan ciptakan item backlog per folder.

File `CONTEXT.md` dimuat secara eksplisit melalui tautan ini dan instruksi akar; alur kerja ini tidak bergantung pada editor memuat nama file tersebut secara otomatis.
Gunakan [alur kerja kontinuitas](docs/work/workflow.md) untuk menyimpan kemajuan, dan verifikasi file saat ini sebelum menganggap setiap handoff sebagai kebenaran saat ini.

Tangkap koreksi yang dapat digunakan kembali dengan [alur kerja pembelajaran](docs/work/learning.md).
Untuk tugas berulang, gunakan prosedur konkret yang ditautkan oleh konteks foldernya; periksa bukti berlabel sebelum menganggap bahwa metode tersebut terverifikasi.
