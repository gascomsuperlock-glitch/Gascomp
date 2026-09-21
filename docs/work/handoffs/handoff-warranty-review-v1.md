<a id="warranty-handoff"></a>
# Penanganan garansi

Diperbarui: 2026-09-18
Status: Menunggu verifikasi

<a id="objective"></a>
## Tujuan

Menjaga dan membuat dapat dilanjutkan perubahan status tiket yang sudah ada sebelumnya. Implementasi yang diamati mengembalikan kontrol status eksplisit; permintaan implementasi asli dan hasil verifikasi sebelumnya tidak tersedia dalam tugas organisasi ini.

<a id="current-evidence"></a>
## Bukti saat ini

Perbedaan kerja yang ada menambahkan pemilih status simpan segera ke kotak masuk tiket, tindakan Server status terautentikasi, dan label terperinci untuk status tiket. Spesifikasi garansi sudah mendokumentasikan perilaku yang dimaksud di bawah "Kontrol status dipulihkan". Uji ekspor dimodifikasi dan `status-actions.test.mjs` tidak dilacak. Perubahan ini terjadi sebelum tugas dokumentasi organisasi dan dibiarkan utuh.

<a id="remaining-work-and-decisions"></a>
## Pekerjaan dan keputusan yang tersisa

Lihat implementasi terhadap spesifikasi pemilik, termasuk pemeliharaan solusi disimpan dan pilihan belum disimpan, simpan gagal, dan pengelompokan pending/selesai. Keadaan penyelesaian, komitmen, dan penyebaran saat ini harus diperiksa saat dilanjutkan; perbedaan yang belum berkomitmen bukan bukti penyebaran.

<a id="decisions-and-corrections"></a>
## Keputusan dan koreksi

Permintaan dokumentasi saat ini menambahkan prosedur verifikasi yang dapat digunakan kembali, bukan perilaku garansi baru. Persyaratan produk tetap "Kontrol status dipulihkan" dalam spesifikasi pemiliknya. Percakapan pemilik aslinya tidak tersedia; tidak ada koreksi historis atau alasan yang disimpulkan dari implementasi.

<a id="verification"></a>
## Verifikasi

Tingkat bukti: Terverifikasi sebagian.

Pada 2026-09-18, Node v26.8.1 menjalankan perintah berikut terhadap pohon kerja lokal:

```bash
node --test src/features/warranty/server/status-actions.test.mjs src/features/warranty/server/solution-actions.test.mjs src/features/warranty/model/ticket-export.test.mjs
```

Hasil: 6 tes lolos, 0 gagal. Node memancarkan peringatan tipe modul yang ada; perintah berakhir dengan sukses. Tes aksi menggunakan sesi palsu, validasi ulang cache, dan persistensi tiket. Mereka memverifikasi permintaan yang ditolak (tidak berotorisasi/tidak valid), argumen status/solusi yang dikirimkan, dan pelaporan kegagalan aksi. Tes ekspor memverifikasi kasus tanggal spesifik, CSV, dan normalisasi mereka masing-masing. Hasil ini tidak membuktikan pelestarian database nyata, pelestarian draf UI yang belum disimpan, semua label status, atau perilaku desktop/mobile.

Repository HEAD: `2eb4550ef570ad0006e92c4daf90e5172940223b`; file yang diuji termasuk perubahan yang belum berkomitmen.
Hash konten di bawah ini mengidentifikasi input tes yang diperiksa secara independen dari HEAD.

| File | SHA-256 saat verifikasi |
| --- | --- |
| `src/features/warranty/server/status-actions.test.mjs` | `f078d0a96b884755474809eb3e67fd9edd499e243093a0b7679c8e0994554688` |
| `src/features/warranty/server/solution-actions.test.mjs` | `af60b12993bcc405ba3559b76ea4a0f3936f2532b468623bd376b81167a45001` |
| `src/features/warranty/model/ticket-export.test.mjs` | `b0563f6b1c2428fbfeb0a172b21495edcee43852fda4e4ab0f4de2aa15768c66` |
| `src/features/warranty/server/admin-actions.ts` | `6ac90bb6a5022aa8243a885d3ed8444ca7313dd63a360bd7345f64dfd52e5b20` |
| `src/features/warranty/model/types.ts` | `264535d297a8496d9c2e7c6f40af2884ce0db73386bd97d3dc7a1cc7dca1f738` |
| `src/features/warranty/model/ticket-export.ts` | `580b2a52bf28a00a1aeb77330a4f92480249774cbf5addbab364680c9d69f179` |
| `src/features/warranty/model/ticket-mappers.ts` | `869b6bd590da9067d974c49009537d910e6a320aaee00e60bf40f5b774112f8e` |

Lint penuh, pengecekan tipe, suite tes, build, kasus penerimaan browser, dan verifikasi toko nyata tidak dijalankan dalam tugas dokumentasi ini. Mereka tetap wajib saat menyelesaikan implementasi. Prosedur baru hanya sebagian diverifikasi untuk pemeriksaan di atas; keadaan produksi/deploymen tetap belum diverifikasi.

<a id="next-action"></a>
## Tindakan selanjutnya

Saat diminta melanjutkan pekerjaan garansi, ikuti [prosedur status](../procedures/warranty-status.md), bandingkan file saat ini dengan bukti di atas, dan selesaikan pemeriksaan penerimaan yang tersisa. Jalankan ulang tes fokus ketika input berubah; selesaikan kegagalan dalam cakupan yang diminta.

<a id="references"></a>
## Referensi

- [Prosedur status yang dapat digunakan kembali](../procedures/warranty-status.md)
- [Spesifikasi garansi](../../product/features/warranty.md)
- [Kotak masuk tiket](../../../src/features/warranty/components/ticket-inbox.tsx)
- [Label status](../../../src/features/warranty/model/types.ts)
- [Aksi admin](../../../src/features/warranty/server/admin-actions.ts)
- [Tes aksi status](../../../src/features/warranty/server/status-actions.test.mjs)
- [Tes ekspor](../../../src/features/warranty/model/ticket-export.test.mjs)
