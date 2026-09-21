<a id="shared-infrastructure"></a>
# Infrastruktur bersama

[Peta ruang kerja ](../../CONTEXT.md) · [Aturan akar ](../../AGENTS.md)

<a id="context"></a>
## Konteks

Cakupan: `src/shared` dan turunan-nya kecuali jika konteks yang lebih dekat terdaftar dalam peta ruang kerja.

Kembangkan UI yang dapat digunakan kembali, infrastruktur bahasa, helper umum, dan klien Supabase yang hanya untuk server.

<a id="inputs"></a>
## Input

Baca referensi yang relevan untuk tugas yang diminta, bukan setiap dokumen yang terhubung.

- [Penempatan dan ketergantungan ](../../docs/architecture/project-structure.md)
- [Bahasa dan kompatibilitas ](../../docs/architecture/language-standard.md)
- [Spesifikasi merek ](../../docs/product/design/brand.md)
- [Spesifikasi database dan migrasi ](../../docs/product/integrations/supabase.md)

<a id="tasks"></a>
## Tugas

Ini adalah tanggung jawab yang dipicu oleh permintaan saat ini, bukan daftar tugas otomatis.

| Ketika diminta untuk bekerja pada | Proses | Hasil yang diharapkan |
| --- | --- | --- |
| components/ | Periksa fitur yang mengonsumsi dan aksesibilitas sebelum mengubah UI yang dapat digunakan kembali. | Komponen yang dapat digunakan kembali tanpa impor fitur. |
| lib/ | Identifikasi semua situs panggilan dan pertahankan kontrak helper yang didokumentasikan. | Utilitas umum dengan cakupan regresinya yang sesuai. |
| integrations/supabase/ | Jejak konsumen server dan penanganan lingkungan. | Infrastruktur klien hanya untuk server tanpa rahasia yang terekspos. |

<a id="boundaries"></a>
## Batasan

- Jangan impor fitur atau rute ke dalam modul bersama.
- Pertahankan modul klien dan server diimpor langsung daripada mencampurnya dalam satu file (barrel).

<a id="outputs-and-verification"></a>
## Output dan verifikasi

Perbarui modul bersama dan penyesuaian konsumen yang diperlukan; pertahankan kebijakan domain pada fitur.

Untuk perubahan TypeScript/JavaScript, jalankan `npm run lint`, `npm run typecheck`, dan `npm run test`. Tambahkan `npm run build` untuk perubahan rute/rendering/ketergantungan/build. Untuk perubahan yang terlihat, periksa alur desktop/mobile yang terpengaruh serta status loading, kosong, dan kesalahan dalam browser jika tersedia. Laporkan pemeriksaan yang terhambat.

Untuk permintaan yang tidak terkait, kembali ke peta ruang kerja. Untuk pekerjaan yang belum selesai, gunakan
[indeks serah terima ](../../docs/work/README.md) dan [aliran kontinuitas ](../../docs/work/workflow.md).
