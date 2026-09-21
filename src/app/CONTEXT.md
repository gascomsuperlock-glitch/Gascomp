<a id="application-routes"></a>
# Rute aplikasi

[Peta ruang kerja](../../CONTEXT.md) · [Aturan akar](../../AGENTS.md)

<a id="context"></a>
## Konteks

Cakupan: `src/app` dan seluruh turunannya, kecuali jika peta ruang kerja menunjukkan konteks yang lebih dekat.

Folder ini memiliki kontrak URL, komposisi halaman dan tata letak, route handler, metadata, serta keadaan memuat dan galat pada tingkat rute.

<a id="inputs"></a>
## Masukan

Baca rujukan yang relevan dengan tugas, bukan seluruh dokumen tertaut.

- [Penempatan dan ketergantungan](../../docs/architecture/project-structure.md)
- [QR dan URL stabil](../../docs/product/features/qr.md)
- [Bahasa dan kompatibilitas](../../docs/architecture/language-standard.md)

<a id="tasks"></a>
## Tugas

Tanggung jawab berikut berlaku saat diminta dalam tugas saat ini, bukan daftar pekerjaan yang harus dijalankan otomatis.

| Saat diminta mengerjakan | Proses | Hasil yang diharapkan |
| --- | --- | --- |
| Perubahan halaman atau navigasi | Temukan rute dan baca konteks fitur yang dirangkainya. Simpan komposisi rendering di sini. | Rute menggunakan fitur pemilik dan mempertahankan URL yang didokumentasikan. |
| Endpoint API atau formulir | Telusuri permintaan hingga handler fitur dan pertahankan pemeriksaan asal permintaan serta sesi. | Kontrak rute tipis dengan validasi dan penyimpanan milik fitur. |
| Metadata atau keadaan rute | Periksa panduan Next.js terpasang untuk konvensi file terkait. | Metadata yang benar serta perilaku memuat dan galat yang sesuai bahasa. |

<a id="boundaries"></a>
## Batasan

- Baca panduan terkait di `node_modules/next/dist/docs/` sebelum mengubah framework.
- Pertahankan tujuan QR yang sudah dicetak dan segmen rute yang didokumentasikan.
- Letakkan perilaku bisnis yang dapat digunakan kembali di fitur, bukan di folder rute.

<a id="outputs-and-verification"></a>
## Keluaran dan verifikasi

Simpan file rute di sini dan perubahan implementasi dalam fitur terpilih; perbarui spesifikasi pemilik ketika perilaku berubah.

Untuk perubahan TypeScript atau JavaScript, jalankan `npm run lint`, `npm run typecheck`, dan `npm run test`. Tambahkan `npm run build` untuk perubahan rute, rendering, dependensi, atau build. Untuk perubahan yang terlihat, periksa alur desktop dan ponsel serta keadaan memuat, kosong, dan galat di browser jika tersedia. Laporkan pemeriksaan yang terhalang.

Untuk permintaan yang tidak terkait, kembali ke peta ruang kerja. Untuk pekerjaan yang belum selesai, gunakan [indeks serah terima](../../docs/work/README.md) dan [alur keberlanjutan](../../docs/work/workflow.md).
