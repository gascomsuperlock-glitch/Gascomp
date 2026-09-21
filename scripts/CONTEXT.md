<a id="node-operational-scripts"></a>
# Skrip operasional Node

[Workspace map](../CONTEXT.md) · [Root rules](../AGENTS.md)

<a id="context"></a>
## Konteks

Cakupan: `scripts` dan turunan-nya kecuali jika konteks yang lebih dekat terdaftar dalam peta workspace.

Pembuatan impor, ekspor berbasis Node, alat operasional lokal, dan infrastruktur skrip bersama.

<a id="inputs"></a>
## Input

Baca referensi yang relevan untuk tugas yang diminta, bukan setiap dokumen yang terhubung.

- [Placement and dependencies](../docs/architecture/project-structure.md)
- [Duoke catalog specification](../docs/product/integrations/duoke-catalog.md)
- [Knowledge and replies specification](../docs/product/integrations/duoke-support.md)
- [Warehouse import specification](../docs/product/integrations/warehouse.md)
- [Database and migration specification](../docs/product/integrations/supabase.md)
- [AI assistance specification](../docs/product/features/ai-assistance.md)
- [Available commands](../package.json)

<a id="tasks"></a>
## Tugas

Ini adalah tanggung jawab yang dipicu oleh permintaan saat ini, bukan daftar tugas otomatis.

| Ketika diminta untuk bekerja pada | Proses | Hasil yang diharapkan |
| --- | --- | --- |
| duoke/ | Baca spesifikasi katalog atau pengetahuan; periksa efek samping eksporter/importer. | Sinkronisasi atau perubahan ekspor yang divalidasi dengan identitas stabil. |
| warehouse/ | Periksa input normalisasi dan gunakan pratinjau impor bila diperlukan. | Aturan pemetaan SKU dan preservasi tetap utuh. |
| catalog/ | Cocokkan brosur ke SKU dan kontrak update hanya deskripsi. | Pratinjau berskala terbatas atau update deskripsi yang diotorisasi. |
| ai-assistance/ | Periksa perilaku peluncuran, pilot, dan pratinjau untuk operasi yang diminta. | Operasi pekerja lokal yang dapat direproduksi dan keadaan runtime eksplisit. |
| supabase/ | Baca aturan baseline migrasi dan periksa target/sejarah sebelum pekerjaan rilis. | Koneksi atau alat migrasi yang divalidasi; aplikasi produksi hanya bila diotorisasi. |
| shared/ | Gunakan jalur terpusat, parsing lingkungan, dan klien skrip. | Jalur relatif modul yang konsisten di seluruh skrip. |
| scratch/ | Periksa eksperimen hanya bila relevan dengan tugas saat ini. | Eksperimen terisolasi tanpa ketergantungan pada titik masuk aplikasi. |

<a id="boundaries"></a>
## Batasan

- Periksa perilaku perintah: ekspor atau pratinjau dapat mengakses layanan atau menimpa artefak lokal.
- Jangan terapkan impor/migrasi atau kirim balasan pelanggan tanpa otorisasi tugas.
- Pertahankan ID sumber dan konten yang dikelola admin; gunakan `shared/paths.mjs`.

<a id="outputs-and-verification"></a>
## Output dan verifikasi

Letakkan skrip dan tes Node bersebelahan di subfolder pemiliknya. Artefak output termasuk lokasi data/private yang didokumentasikan, bukan direktori baru sembarang.

Untuk perubahan TypeScript/JavaScript, jalankan `npm run lint`, `npm run typecheck`, dan `npm run test`. Tambahkan `npm run build` untuk perubahan rute/rendering/ketergantungan/build. Untuk perubahan yang terlihat, periksa alur desktop/mobile yang terpengaruh dan keadaan loading, kosong, dan kesalahan di browser bila tersedia. Laporkan pemeriksaan apa pun yang diblokir.

Untuk permintaan yang tidak terkait, kembali ke peta workspace. Untuk pekerjaan yang belum selesai, gunakan
[handoff index](../docs/work/README.md) dan [continuity workflow](../docs/work/workflow.md).
