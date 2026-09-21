<a id="customer-ai-assistance"></a>
# Bantuan AI pelanggan

[Peta ruang kerja](../../../CONTEXT.md) · [Aturan akar](../../../AGENTS.md)

<a id="context"></a>
## Konteks

Cakupan: `src/features/ai-assistance` dan turunannya, kecuali jika peta ruang kerja menunjukkan konteks yang lebih dekat.

Fitur ini memiliki panel percakapan publik, kontrol runtime admin, handler API, sesi, dan kontrak database yang digunakan worker.

<a id="inputs"></a>
## Masukan

Baca rujukan yang relevan dengan tugas, bukan semua dokumen tertaut.

- [Spesifikasi bantuan AI](../../../docs/product/features/ai-assistance.md)
- [Spesifikasi database dan migrasi](../../../docs/product/integrations/supabase.md)
- [Penyiapan worker](../../../docs/setup/ai-assistance.md)
- [Bahasa dan kompatibilitas](../../../docs/architecture/language-standard.md)

<a id="tasks"></a>
## Tugas

Tanggung jawab berikut berlaku sesuai permintaan saat ini, bukan daftar pekerjaan otomatis.

| Saat diminta mengerjakan | Proses | Hasil yang diharapkan |
| --- | --- | --- |
| Percakapan pelanggan | Telusuri keadaan sesi klien, permintaan, dan kepemilikan respons. | Keadaan sesuai bahasa pilihan dan percakapan baru tanpa balasan usang. |
| Kontrak worker/API | Selaraskan perubahan skema dan protokol dengan worker Python. | Permintaan, siklus pekerjaan, dan penanganan kegagalan tetap kompatibel. |
| Perilaku jawaban | Baca kebijakan jawaban berbasis sumber dan kontrak sumber pengetahuan yang berlaku. | Fakta produk tetap bersumber dan tindakan handoff mengikuti kebijakan. |

<a id="boundaries"></a>
## Batasan

- Jaga kerahasiaan data percakapan pelanggan dan patuhi validasi sesi serta asal permintaan.
- Modul ini terpisah dari runner balasan otomatis Duoke.
- Percakapan pelanggan tidak dapat menyetujui pengetahuan atau mengklaim tindakan operasional telah terjadi.
- Simpan logika bisnis dalam fitur pemiliknya; patuhi batas server/klien dan aturan verifikasi akar.
- Perlakukan status spesifikasi bertanggal sebagai bukti yang perlu diperiksa, bukan bukti perilaku saat ini.

<a id="outputs-and-verification"></a>
## Keluaran dan verifikasi

Gunakan `components/` untuk UI fitur, `model/` untuk tipe domain dan logika murni, `server/` untuk penyimpanan dan tindakan terlindungi, serta `hooks/` yang sudah ada bila sesuai. Buat subfolder hanya ketika modul nyata memerlukannya. Perbarui spesifikasi pemilik dan simpan kemajuan yang belum selesai.

Untuk perubahan TypeScript/JavaScript, jalankan `npm run lint`, `npm run typecheck`, dan `npm run test`. Tambahkan `npm run build` untuk perubahan rute, rendering, dependensi, atau build. Untuk perubahan yang terlihat, periksa alur desktop/ponsel dan keadaan memuat, kosong, serta galat di browser bila tersedia. Laporkan pemeriksaan yang terhalang.

Untuk permintaan yang tidak terkait, kembali ke peta ruang kerja. Untuk pekerjaan yang belum selesai, gunakan [indeks serah terima](../../../docs/work/README.md) dan [alur keberlanjutan](../../../docs/work/workflow.md).
