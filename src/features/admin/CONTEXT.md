<a id="admin-workspace-composition"></a>
# Komposisi ruang kerja Admin

[Rapet ruang kerja](../../../CONTEXT.md) · [Aturan akar](../../../AGENTS.md)

<a id="context"></a>
## Konteks

Cakupan: `src/features/admin` dan turunan-nya kecuali jika konteks yang lebih dekat terdaftar dalam peta ruang kerja.

Komposisi dashboard, navigasi, dan ringkasan lintas fitur milik sendiri.

<a id="inputs"></a>
## Input

Baca referensi yang relevan untuk tugas yang diminta, bukan setiap dokumen yang terhubung.

- [Spesifikasi Admin](../../../docs/product/features/admin.md)
- [Penempatan dan ketergantungan](../../../docs/architecture/project-structure.md)

<a id="tasks"></a>
## Tugas

Ini adalah tanggung jawab yang dipicu oleh permintaan saat ini, bukan daftar tugas otomatis.

| Ketika diminta untuk bekerja pada | Proses | Hasil yang diharapkan |
| --- | --- | --- |
| Dashboard atau navigasi | Identifikasi fitur pemilik untuk setiap ruang kerja dan pertahankan keadaan lokalnya. | Navigasi dan ringkasan yang konsisten. |
| Tampilan lintas fitur | Susun komponen fitur daripada memindahkan logika bisnis mereka di sini. | Ruang kerja dengan kepemilikan fitur yang jelas dan perilaku simpan yang benar. |

<a id="boundaries"></a>
## Batasan

- Pertahankan katalog tahap Simpan terpisah dari mutasi jaminan, Perawatan, dan pusat layanan segera.
- Fitur lain tidak boleh mengimpor admin; admin dapat menyusun mereka.
- Pertahankan logika bisnis di dalam fitur pemiliknya; hormati batas server/klien dan aturan verifikasi akar.
- Perlakukan status spesifikasi bertanggal sebagai bukti untuk diverifikasi, bukan bukti perilaku saat ini.

<a id="outputs-and-verification"></a>
## Output dan verifikasi

Gunakan `components/` untuk UI fitur, `model/` untuk tipe domain dan logika murni, `server/` untuk penyimpanan/aksi yang dilindungi, dan `hooks/` yang ada jika berlaku. Buat subfolder hanya ketika modul nyata membutuhkannya. Perbarui spesifikasi pemilik dan simpan kemajuan yang belum selesai.

Untuk perubahan TypeScript/JavaScript, jalankan `npm run lint`, `npm run typecheck`, dan `npm run test`. Tambahkan `npm run build` untuk perubahan rute/rendering/ketergantungan/build. Untuk perubahan yang terlihat, periksa alur desktop/mobile yang terpengaruh dan keadaan loading, kosong, dan kesalahan di browser jika tersedia. Laporkan pemeriksaan yang diblokir.

Untuk permintaan yang tidak terkait, kembali ke peta ruang kerja. Untuk pekerjaan yang belum selesai, gunakan
[indeks serah terima](../../../docs/work/README.md) dan [aliran kontinuitas](../../../docs/work/workflow.md).
