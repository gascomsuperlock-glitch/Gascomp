<a id="catalog-and-product-help"></a>
# Katalog dan bantuan produk

[Peta ruang kerja ](../../../CONTEXT.md) · [Aturan akar ](../../../AGENTS.md)

<a id="context"></a>
## Konteks

Cakupan: `src/features/catalog` dan turunan-nya kecuali jika konteks yang lebih dekat terdaftar dalam peta ruang kerja.

Bantuan produk sendiri, pencarian, editor konten bantuan, penanganan media, publikasi, dan komponen QR produk.

<a id="inputs"></a>
## Input

Baca referensi yang relevan untuk tugas yang diminta, bukan setiap dokumen yang terhubung.

- [Spesifikasi katalog ](../../../docs/product/features/catalog.md)
- [Spesifikasi admin ](../../../docs/product/features/admin.md)
- [QR dan URL stabil ](../../../docs/product/features/qr.md)
- [Bahasa dan kompatibilitas ](../../../docs/architecture/language-standard.md)

<a id="tasks"></a>
## Tugas

Ini adalah tanggung jawab yang dipicu oleh permintaan saat ini, bukan daftar tugas otomatis.

| Ketika diminta untuk bekerja pada | Proses | Hasil yang diharapkan |
| --- | --- | --- |
| Bantuan produk publik | Jejak data produk tersimpan melalui komponen pencarian dan bantuan produk. | Konten spesifik model dengan kondisi kosong/error yang dilokalisasi. |
| Editor konten dan unggahan | Jejak pengeditan tahap akhir, validasi unggahan, dan penyimpanan konten eksplisit. | Pengeditan bertahan melalui jalur penyimpanan terdokumentasi tanpa kehilangan draf. |
| QR atau publikasi | Periksa slug stabil, asal produksi, dan perilaku arsip. | Tujuan cetak yang ada tetap dapat digunakan. |

<a id="boundaries"></a>
## Batasan

- Pertahankan identitas sumber dan bidang yang dimiliki admin selama perubahan impor.
- Jangan membuat fakta produk atau panduan perbaikan.
- Pertahankan logika bisnis dalam fitur pemiliknya; hormati batas server/klien dan aturan verifikasi akar.
- Perlakukan status spesifikasi bertanggal sebagai bukti untuk diverifikasi, bukan sebagai bukti perilaku saat ini.

<a id="outputs-and-verification"></a>
## Output dan verifikasi

Gunakan `components/` untuk UI fitur, `model/` untuk tipe domain dan logika murni, `server/` untuk penyimpanan/aksi yang dilindungi, dan `hooks/` yang ada jika berlaku. Buat subfolder hanya ketika modul nyata membutuhkannya. Perbaiki spesifikasi pemilik dan simpan kemajuan yang belum selesai.

Untuk perubahan TypeScript/JavaScript, jalankan `npm run lint`, `npm run typecheck`, dan `npm run test`. Tambahkan `npm run build` untuk perubahan rute/rendering/gantung/build. Untuk perubahan yang terlihat, periksa alur desktop/mobile yang terpengaruh dan kondisi loading, kosong, dan error di browser jika tersedia. Laporkan pemeriksaan yang terhambat.

Untuk permintaan yang tidak terkait, kembali ke peta ruang kerja. Untuk pekerjaan yang belum selesai, gunakan
[indeks serah terima ](../../../docs/work/README.md) dan [aliran kontinuitas ](../../../docs/work/workflow.md).
