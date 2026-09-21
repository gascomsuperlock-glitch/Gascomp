<a id="admin-authentication"></a>
# Autentikasi Admin

[Workspace map](../../../CONTEXT.md) · [Root rules](../../../AGENTS.md)

<a id="context"></a>
## Konteks

Cakupan: `src/features/auth` dan turunan-nya kecuali jika konteks yang lebih dekat terdaftar dalam peta workspace.

Login administrator sendiri, verifikasi sesi, dan logout. Autentikasi anggota milik GascompCare.

<a id="inputs"></a>
## Input

Baca referensi yang relevan untuk tugas yang diminta, bukan setiap dokumen yang terhubung.

- [Spesifikasi Admin](../../../docs/product/features/admin.md)
- [Penempatan dan ketergantungan](../../../docs/architecture/project-structure.md)

<a id="tasks"></a>
## Tugas

Ini adalah tanggung jawab yang dipicu oleh permintaan saat ini, bukan backlog otomatis.

| Ketika diminta untuk bekerja pada | Proses | Hasil yang diharapkan |
| --- | --- | --- |
| Login atau logout | Jejak pengiriman formulir melalui aksi server dan helper sesi. | Arahkan dengan benar dan siklus sesi. |
| Operasi dilindungi | Periksa baik titik masuk maupun mutasi server yang memiliki hak milik. | Permintaan yang tidak berotorisasi tetap ditolak. |

<a id="boundaries"></a>
## Batasan

- Pertahankan kredensial dan penandatangan cookie di sisi server.
- Jangan gabungkan kontrak sesi administrator dan anggota.
- Pertahankan logika bisnis dalam fitur yang memilikinya; hormati batas server/klien dan aturan verifikasi akar.
- Perlakukan status spesifikasi bertanggal sebagai bukti untuk diverifikasi, bukan sebagai bukti perilaku saat ini.

<a id="outputs-and-verification"></a>
## Output dan verifikasi

Gunakan `components/` untuk UI fitur, `model/` untuk tipe domain dan logika murni, `server/` untuk penyimpanan/aksi dilindungi, dan `hooks/` yang ada jika berlaku. Buat subfolder hanya ketika modul nyata membutuhkannya. Perbarui spesifikasi yang memiliki hak milik dan simpan kemajuan yang belum selesai.

Untuk perubahan TypeScript/JavaScript, jalankan `npm run lint`, `npm run typecheck`, dan `npm run test`. Tambahkan `npm run build` untuk perubahan rute/rendering/ketergantungan/build. Untuk perubahan yang terlihat, periksa alur desktop/mobile yang terpengaruh dan status loading, kosong, dan kesalahan di browser jika tersedia. Laporkan pemeriksaan yang terhambat.

Untuk permintaan yang tidak terkait, kembali ke peta workspace. Untuk pekerjaan yang belum selesai, gunakan
[indeks serah terima](../../../docs/work/README.md) dan [aliran kontinuitas](../../../docs/work/workflow.md).
