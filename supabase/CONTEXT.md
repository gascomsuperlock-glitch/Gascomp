<a id="database-migration-workspace"></a>
# Ruang kerja migrasi database

[Peta ruang kerja ](../CONTEXT.md) · [Aturan akar ](../AGENTS.md)

<a id="context"></a>
## Konteks

Cakupan: `supabase` dan turunan-nya kecuali jika konteks yang lebih dekat terdaftar dalam peta ruang kerja.

File migrasi berurutan sendiri dan garis dasar rilis yang ditandai (pinned).

<a id="inputs"></a>
## Input

Baca referensi yang relevan untuk tugas yang diminta, bukan setiap dokumen yang terhubung.

- [Spesifikasi database dan migrasi ](../docs/product/integrations/supabase.md)
- [Pembentukan database ](../docs/setup/supabase.md)
- [Konteks skrip rilis ](../scripts/CONTEXT.md)

<a id="tasks"></a>
## Tugas

Ini adalah tanggung jawab yang dipicu oleh permintaan saat ini, bukan daftar tugas otomatis.

| Ketika diminta untuk bekerja pada | Proses | Hasil yang diharapkan |
| --- | --- | --- |
| migrations/ | Baca spesifikasi fitur yang terkena dampak dan garis dasar rilis; tambahkan migrasi berurutan untuk perubahan skema baru. | SQL yang dapat ditinjau kembali yang mempertahankan identitas historis dan kebijakan akses. |
| release-baseline.json | Selaraskan dengan protokol rilis yang didokumentasikan dan bukti aktual. | Perubahan garis dasar hanya ketika tugas rilis yang diminta membutuhkannya. |

<a id="boundaries"></a>
## Batasan

- Jangan rename atau tulis ulang migrasi yang dibekukan/terlaksana untuk konsistensi penamaan.
- Jangan menyimpulkan bahwa file SQL lokal telah diterapkan secara remote.
- Aplikasi produksi memerlukan otorisasi dan rekonsiliasi sejarah yang didokumentasikan.

<a id="outputs-and-verification"></a>
## Output dan verifikasi

Perubahan skema baru menggunakan file SQL berurutan dan tes skema lokal yang bermakna jika sesuai. Koordinasikan konsumen dalam fitur mereka sendiri.

Jalankan tes skema lokal yang berlaku dan pemeriksaan akar untuk konsumen yang berubah. Jangan gunakan migrasi live sebagai tes. Perubahan hanya dokumentasi menggunakan pemeriksaan link dan diff.

Untuk permintaan yang tidak terkait, kembali ke peta ruang kerja. Untuk pekerjaan yang belum selesai, gunakan
[indeks serah terima ](../docs/work/README.md) dan [aliran kelangsungan ](../docs/work/workflow.md).
