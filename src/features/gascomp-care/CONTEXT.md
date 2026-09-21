<a id="gascompcare-membership"></a>
# Keanggotaan GascompCare

[Peta ruang kerja](../../../CONTEXT.md) · [Aturan akar](../../../AGENTS.md)

<a id="context"></a>
## Konteks

Cakupan: `src/features/gascomp-care` dan turunannya, kecuali jika peta ruang kerja menunjukkan konteks yang lebih dekat.

Fitur ini memiliki akun dan sesi anggota, kartu virtual, pembelian, serta penggunaan perlindungan yang dicatat secara manual.

<a id="inputs"></a>
## Masukan

Baca rujukan yang relevan dengan tugas, bukan semua dokumen yang tertaut.

- [Spesifikasi GascompCare](../../../docs/product/features/gascomp-care.md)
- [Spesifikasi database dan migrasi](../../../docs/product/integrations/supabase.md)
- [Bahasa dan kompatibilitas](../../../docs/architecture/language-standard.md)

<a id="tasks"></a>
## Tugas

Tanggung jawab berikut berlaku sesuai permintaan saat ini, bukan daftar pekerjaan otomatis.

| Saat diminta mengerjakan | Proses | Hasil yang diharapkan |
| --- | --- | --- |
| Akses anggota | Telusuri sesi anggota, perubahan kata sandi, dan data halaman server. | Anggota hanya melihat data miliknya yang diizinkan. |
| Perhitungan perlindungan | Periksa tanggal pembelian, identitas barang, batas kalender, masa berlaku, dan sisa klaim. | Perlindungan mengikuti spesifikasi serta memiliki pengujian regresi untuk kasus tepi. |
| Akun atau pembelian oleh administrator | Periksa autentikasi, validasi permintaan, dan penyimpanan langsung. | Perubahan terverifikasi hanya memengaruhi anggota atau pembelian yang dipilih. |

<a id="boundaries"></a>
## Batasan

- Jangan tampilkan riwayat penggunaan internal atau kredensial pribadi pada halaman pelanggan.
- Pisahkan garansi bawaan dan perlindungan Care berbayar; integrasi yang ditunda memerlukan keputusan produk eksplisit.
- Simpan logika bisnis dalam fitur pemiliknya; patuhi batas server/klien dan aturan verifikasi akar.
- Perlakukan status spesifikasi bertanggal sebagai bukti yang perlu diperiksa, bukan bukti perilaku saat ini.

<a id="outputs-and-verification"></a>
## Keluaran dan verifikasi

Gunakan `components/` untuk UI fitur, `model/` untuk tipe domain dan logika murni, `server/` untuk penyimpanan dan tindakan terlindungi, serta `hooks/` yang sudah ada bila sesuai. Buat subfolder hanya ketika modul nyata memerlukannya. Perbarui spesifikasi pemilik dan simpan kemajuan yang belum selesai.

Untuk perubahan TypeScript/JavaScript, jalankan `npm run lint`, `npm run typecheck`, dan `npm run test`. Tambahkan `npm run build` untuk perubahan rute, rendering, dependensi, atau build. Untuk perubahan yang terlihat, periksa alur desktop/ponsel dan keadaan memuat, kosong, serta galat di browser bila tersedia. Laporkan pemeriksaan yang terhalang.

Untuk permintaan yang tidak terkait, kembali ke peta ruang kerja. Untuk pekerjaan yang belum selesai, gunakan [indeks serah terima](../../../docs/work/README.md) dan [alur keberlanjutan](../../../docs/work/workflow.md).
