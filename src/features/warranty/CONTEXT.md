<a id="warranty-claims-and-tickets"></a>
# Klaim garansi dan tiket

[Peta ruang kerja ](../../../CONTEXT.md) · [Aturan akar ](../../../AGENTS.md)

<a id="context"></a>
## Konteks

Cakupan: `src/features/warranty` dan turunan-nya kecuali jika konteks yang lebih dekat terdaftar dalam peta ruang kerja.

Kelayakan klaim sendiri, pengiriman bukti, bukti pribadi, status tiket, resolusi, dan ekspor.

<a id="inputs"></a>
## Input

Baca referensi yang relevan untuk tugas yang diminta, bukan setiap dokumen yang terhubung.

- [Spesifikasi garansi ](../../../docs/product/features/warranty.md)
- [Spesifikasi admin ](../../../docs/product/features/admin.md)
- [Spesifikasi database dan migrasi ](../../../docs/product/integrations/supabase.md)
- [Bahasa dan kompatibilitas ](../../../docs/architecture/language-standard.md)

<a id="tasks"></a>
## Tugas

Ini adalah tanggung jawab yang dipicu oleh permintaan saat ini, bukan daftar tugas otomatis.

| Ketika diminta untuk bekerja pada | Proses | Hasil yang diharapkan |
| --- | --- | --- |
| Pengiriman klaim atau bukti | Jejak validasi input, transportasi, dekoding, dan konfirmasi penyimpanan. | Klaim dikonfirmasi hanya setelah penyimpanan yang diperlukan berhasil. |
| Status tiket atau solusi | Periksa kondisi kotak masuk, tindakan terautentikasi, dan persistensi status/solusi bersama-sama. | Perubahan mengikuti spesifikasi pemilik dan mempertahankan nilai disimpan/rancangan yang tidak terkait. |
| Ekspor atau unduhan pribadi | Periksa filter, label, otorisasi, dan akses bukti. | Ekspor yang benar dan akses bukti yang dilindungi. |

Untuk pekerjaan status dan solusi, ikuti [prosedur konkret ](../../../docs/work/procedures/warranty-status.md) dan periksa buktinya sebelum digunakan kembali.

<a id="boundaries"></a>
## Batasan

- Pertahankan identifikasi tiket, label kompatibilitas, dan batas penyimpanan pribadi.
- Jangan menyimpulkan persyaratan status-label saat ini dari paragraf yang berumur; selaraskan bagian spesifikasi yang relevan dan permintaan saat ini.
- Pekerjaan garansi biasa tidak secara otomatis mengalokasikan penggunaan GascompCare.
- Pertahankan logika bisnis dalam fitur pemiliknya; hormati batas server/klien dan aturan verifikasi akar.
- Anggap status spesifikasi berumur sebagai bukti untuk diverifikasi, bukan bukti perilaku saat ini.

<a id="outputs-and-verification"></a>
## Output dan verifikasi

Gunakan `components/` untuk antarmuka fitur, `model/` untuk tipe domain dan logika murni, `server/` untuk penyimpanan/tindakan dilindungi, dan `hooks/` yang ada jika berlaku. Buat subfolder hanya ketika modul nyata membutuhkannya. Perbaiki spesifikasi pemilik dan simpan kemajuan yang belum selesai.

Untuk perubahan TypeScript/JavaScript, jalankan `npm run lint`, `npm run typecheck`, dan `npm run test`. Tambahkan `npm run build` untuk perubahan rute/rendering/gantung/pembangunan. Untuk perubahan yang terlihat, periksa alur desktop/mobile yang terpengaruh dan keadaan loading, kosong, dan kesalahan di browser jika tersedia. Laporkan pemeriksaan yang diblokir.

Pekerjaan yang ada: [pindahan kendali status ](../../../docs/work/handoffs/handoff-warranty-review-v1.md). Verifikasi pengamatannya berumur sebelum melanjutkan.

Untuk permintaan yang tidak terkait, kembali ke peta ruang kerja. Untuk pekerjaan yang belum selesai, gunakan
[indeks pindahan ](../../../docs/work/README.md) dan [aliran kontinuitas ](../../../docs/work/workflow.md).
