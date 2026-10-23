# Migrasi situs utama

[Peta ruang kerja](../../../CONTEXT.md) · [Spesifikasi](../../../docs/product/features/main-site.md)

## Cakupan dan masukan

Pemilik meminta seluruh WordPress dan plugin PHP ditulis ulang ke JavaScript pada 23 Oktober 2026. Baca spesifikasi situs utama dan arsitektur sebelum mengubah fitur ini. Sumber PHP di `masalah/gascomp-site-tools` adalah referensi; jangan menjalankan operasi pembersihannya secara otomatis.

## Tugas dan keluaran

| Tugas | Proses | Keluaran |
| --- | --- | --- |
| Normalisasi | Perlakukan HTML lama sebagai input tidak tepercaya; hanya keluarkan simpul yang diizinkan. | Data konten tanpa kode executable. |
| Pratinjau | Periksa sesi admin sebelum membaca snapshot lokal. | React dengan rute pratinjau privat. |
| Rilis lokal | Cocokkan digest tinjauan setiap catatan; pindahkan hanya gambar raster tervalidasi. | Manifest privat dan media lokal untuk deployment terpisah. |
| Situs publik dan formulir | Pertahankan mode bantuan; periksa origin, Turnstile, sesi admin, dan RLS. | Rute publik, katalog, formulir, inbox, dan antrean notifikasi. |
| Migrasi penuh | Cocokkan inventaris publik dengan ekspor WordPress terautentikasi. | Kesetaraan konten, formulir, media, dan URL sebelum rilis. |

## Batasan dan verifikasi

Jangan menyalin kredensial, pengguna, atau kiriman formulir ke sumber. Tidak ada `dangerouslySetInnerHTML`, pemuatan JavaScript WordPress, atau akses database dari klien. Snapshot hasil impor berada di `.data/main-site`, tidak masuk Git. Gunakan path terpusat untuk skrip. Jalankan lint, typecheck, test, build, dan pemeriksaan browser untuk perubahan rendering.
