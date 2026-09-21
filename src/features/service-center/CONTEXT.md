<a id="service-center-directory"></a>
# Direktori pusat layanan

[Peta ruang kerja ](../../../CONTEXT.md) · [Aturan akar ](../../../AGENTS.md)

<a id="context"></a>
## Konteks

Cakupan: `src/features/service-center` dan turunan-nya kecuali jika konteks yang lebih dekat terdaftar dalam peta ruang kerja.

Lokasi publik aktif milik sendiri, penyaringan, peta, dan administrasi lokasi yang dilindungi.

<a id="inputs"></a>
## Input

Baca referensi yang relevan untuk tugas yang diminta, bukan setiap dokumen yang terhubung.

- [Spesifikasi pusat layanan dan dukungan ](../../../docs/product/features/support.md)
- [Spesifikasi database dan migrasi ](../../../docs/product/integrations/supabase.md)
- [Bahasa dan kompatibilitas ](../../../docs/architecture/language-standard.md)

<a id="tasks"></a>
## Tugas

Ini adalah tanggung jawab yang dipicu oleh permintaan saat ini, bukan daftar tugas otomatis.

| Ketika diminta untuk bekerja pada | Proses | Hasil yang diharapkan |
| --- | --- | --- |
| Direktori publik atau peta | Jejak data hanya aktif, penyaringan pencarian/provinsi, dan sinkronisasi peta. | Aksi direktori dan kontak tetap dapat digunakan ketika tile gagal. |
| Administrasi lokasi | Periksa validasi, Simpan lokasi, penghapusan, dan preservasi draf. | Perubahan lokasi yang dipilih bertahan secara independen dari Simpan katalog. |
| Impor peta | Validasi tujuan eksternal dan tangani respons asinkron usang. | Hanya nilai lokasi yang divalidasi mencapai editor. |

<a id="boundaries"></a>
## Batasan

- Jangan tanam lokasi pusat layanan yang dibuat-buat.
- Database yang dikonfigurasi gagal tidak boleh ditampilkan sebagai hasil sukses kosong.
- Pertahankan logika bisnis dalam fitur pemiliknya; hormati batas server/klien dan aturan verifikasi akar.
- Anggap status spesifikasi berdate sebagai bukti untuk diverifikasi, bukan bukti perilaku saat ini.

<a id="outputs-and-verification"></a>
## Output dan verifikasi

Gunakan `components/` untuk UI fitur, `model/` untuk tipe domain dan logika murni, `server/` untuk penyimpanan/aksi yang dilindungi, dan `hooks/` yang ada jika berlaku. Buat subfolder hanya ketika modul nyata membutuhkannya. Perbarui spesifikasi pemilik dan simpan kemajuan yang belum selesai.

Untuk perubahan TypeScript/JavaScript, jalankan `npm run lint`, `npm run typecheck`, dan `npm run test`. Tambahkan `npm run build` untuk perubahan rute/rendering/gantung/build. Untuk perubahan yang terlihat, periksa alur desktop/mobile yang terpengaruh dan keadaan loading, kosong, dan kesalahan di browser jika tersedia. Laporkan pemeriksaan apa pun yang diblokir.

Untuk permintaan yang tidak terkait, kembali ke peta ruang kerja. Untuk pekerjaan yang belum selesai, gunakan
[indeks serah terima ](../../../docs/work/README.md) dan [aliran kontinuitas ](../../../docs/work/workflow.md).
