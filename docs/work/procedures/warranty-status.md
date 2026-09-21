<a id="warranty-status-work-procedure"></a>
# Prosedur kerja status garansi

[Konteks fitur](../../../src/features/warranty/CONTEXT.md) · [Alur pembelajaran](../learning.md)

<a id="trigger-and-scope"></a>
## Pemicu dan cakupan

Digunakan ketika diminta untuk mengubah, memperbaiki, meninjau, atau memverifikasi kontrol status tiket, label status, atau interaksi mereka dengan solusi yang disimpan dan belum disimpan. Laporan status hanya membaca bukti yang relevan; implementasikan perubahan hanya saat diminta.

Sumber persyaratan: [Kontrol status dipulihkan](../../product/features/warranty.md#restored-status-controls).
Prosedur ini diturunkan dari spesifikasi tersebut dan kode yang diperiksa. Percakapan pemilik asli di balik kontrol tersebut tidak tersedia. Jangan mengaitkan koreksi hipotetis dengan pemilik.

Bukti saat ini: [catatan serah terima garansi](../handoffs/handoff-warranty-review-v1.md).
Gunakan bagian verifikasi terbarunya; prosedur ini sendiri tidak memvalidasi fitur tersebut.

<a id="inputs-and-entrypoints"></a>
## Input dan titik masuk

| Input | Periksa untuk |
| --- | --- |
| [Kotak masuk tiket](../../../src/features/warranty/components/ticket-inbox.tsx) | `changeStatus`, `changeSolution`, `solutionDrafts`, filter, dan umpan balik |
| [Aksi admin](../../../src/features/warranty/server/admin-actions.ts) | `setWarrantyTicketStatusAction` versus `updateWarrantyTicketStatusAction`, autentikasi, dan validasi |
| [Layanan tiket](../../../src/features/warranty/server/ticket-service.ts) | Argumen status/solusi dan penyaluran penyimpanan |
| [Penyimpanan lokal](../../../src/features/warranty/server/local-ticket-store.ts) dan [Penyimpanan Supabase](../../../src/features/warranty/server/supabase-ticket-store.ts) | Pembaruan bersyarat dan perilaku persistensi nyata saat terpengaruh |
| [Tipe dan label](../../../src/features/warranty/model/types.ts) | Nilai status yang disimpan, label tampilan, dan identitas solusi |
| [Solusi UI](../../../src/features/warranty/components/ticket-solution.tsx) | Pemilihan draf dan perilaku penyimpanan solusi eksplisit/Selesai |
| [Logika CSV](../../../src/features/warranty/model/ticket-export.ts) | Label dan nilai kompatibilitas dalam output ekspor |

<a id="ordered-work"></a>
## Pekerjaan berurutan

1. Periksa status Git saat ini dan catatan serah terima garansi. Identifikasi perubahan pengguna yang ada. Baca bagian persyaratan dan catat koreksi baru menggunakan alur pembelajaran; jangan terapkan aturan penulisan status lama di atas aturan cakupan yang lebih baru.
2. Lacak satu transisi status yang diminta dari kotak masuk ke aksi ke penyimpanan. Perbedaan yang diharapkan: perubahan hanya status melewatkan solusi pengganti; penyimpanan hanya solusi tidak mengganti status; Selesai dapat menyimpan solusi dan menutup tiket.
3. Periksa keadaan UI secara terpisah dari penyimpanan. Solusi database yang dipertahankan tidak membuktikan bahwa `solutionDrafts` bertahan melalui rerendering, filtering, atau pembukaan ulang.
4. Jika perbaikan diminta, ubah lapisan bertanggung jawab terkecil dan tambahkan cakupan regresinya untuk kegagalan yang diamati. Baca panduan Next.js yang relevan sebelum perubahan kode kerangka kerja. Pertahankan identifikasi tiket dan solusi yang ada.
5. Jalankan tes fokus di bawah ini, kemudian pemeriksaan akar yang diperlukan untuk perubahan implementasi. Pemeriksaan yang gagal atau tidak tersedia tetap menjadi pekerjaan belum selesai yang eksplisit.
6. Untuk verifikasi UI, gunakan tiket sintetik dalam lingkungan lokal terisolasi. Konfirmasi aplikasi tidak menulis ke penyimpanan produksi yang dikonfigurasi sebelum mutasi. Jangan kirim klaim nyata atau mengirim pesan WhatsApp sebagai tes.
7. Bandingkan hasil yang diamati dengan kasus penerimaan. Perbarui aturan dalam dokumen pemilik hanya jika keputusan perilaku berubah. Simpan bukti terbaru dan langkah berikutnya dalam catatan serah terima, termasuk pemeriksaan yang gagal, cakupan browser yang tersisa, dan keadaan rilis.

<a id="acceptance-cases"></a>
## Kasus penerimaan

Kasus ini merinci implikasi yang dapat diuji dari persyaratan terkait; bukan kebijakan produk tambahan. Gunakan tiket fiktif dan bedakan solusi A yang disimpan dengan pilihan B yang belum disimpan.

| Aksi | Pengamatan yang diharapkan |
| --- | --- |
| Ubah tiket dari New menjadi Under review | Penyimpanan berhasil, label diperbarui, dan tiket tetap dalam Pending |
| Ubah status saat solusi A disimpan dan B dipilih namun belum disimpan | Solusi tersimpan tetap A dan editor mempertahankan B |
| Buka kembali tiket yang Closed | Status yang dipilih disimpan, solusi tersimpan dipertahankan, dan pengelompokan Pending/Done mengikuti status |
| Simpan solusi B tanpa Done | Perubahan solusi terjadi tanpa perubahan status yang tidak terkait |
| Pilih Done dengan solusi B | Solusi B disimpan dan tiket menjadi Closed |
| Tolak status yang tidak valid atau permintaan yang belum terautentikasi | Tidak ada mutasi yang dikirim |
| Kembali ke kegagalan penyimpanan atau kehilangan respons | Kegagalan dilaporkan; nilai antarmuka UI yang dikonfirmasi sebelumnya dipertahankan dan ketidaktentuan persistensi diperiksa sebelum percobaan ulang |
| Mulai mutasi lain selama penyimpanan pending | Kontrol Busy mencegah mutasi pengguna yang tumpang tindih |
| Ekspor tiket | Label status terperinci dan nilai kompatibilitas solusi terdokumentasi dipertahankan |

Untuk pemeriksaan browser, tutup desktop dan mobile, filter kosong, permintaan gagal, dan kontrol pending. Pemeriksaan ini terpisah dari uji aksi menggunakan mock.

<a id="focused-verification"></a>
## Verifikasi berfokus

Jalankan dari akar repositori:

```bash
node --test src/features/warranty/server/status-actions.test.mjs src/features/warranty/server/solution-actions.test.mjs src/features/warranty/model/ticket-export.test.mjs
```

Uji tindakan memverifikasi validasi dan argumen yang diteruskan ke layanan tiket tiruan.
Mereka tidak menguji toko nyata atau merender kotak masuk. Uji ekspor mencakup contoh spesifik CSV/tanggal/normalisasi, bukan semua status di setiap lokasi antarmuka.

Setelah perubahan implementasi, jalankan `npm run lint`, `npm run typecheck`, dan `npm run test`; sertakan `npm run build` untuk perubahan rendering/rute dan alur browser yang terpengaruh. Pembaruan prosedur hanya dokumentasi memerlukan pemeriksaan link dan diff.

## Hasil yang diharapkan

Perbaikan atau tinjauan berskala terbatas, hasil penerimaan, tautan ke keputusan kanonik yang diperbarui, dan serah terima yang membedakan perilaku diamati, asumsi, dan jalur yang belum diverifikasi. Jangan melaporkan penyelesaian produksi dari hasil uji lokal.
