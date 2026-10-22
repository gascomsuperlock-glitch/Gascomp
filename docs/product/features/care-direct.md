# Laporan kendala Gascomp CareDirect

[Indeks spesifikasi](../spec.md) · [Dukungan](support.md) · [Supabase](../integrations/supabase.md)

## Keputusan pemilik

Sumber: percakapan 22 Oktober 2026. Pemilik meminta opsi pelaporan keluhan produk pada web yang ada, terpisah dari klaim garansi, untuk ditautkan melalui card attention Duoke. Dalam klarifikasi, pemilik memilih kelima isian wajib, penerimaan melalui admin dan WhatsApp, nomor WhatsApp admin yang sudah dikonfigurasi, pembukaan WhatsApp otomatis, serta catatan lengkap pada formulir dan halaman sukses. Ini tidak mengubah kelayakan atau tiket garansi, maupun keanggotaan GascompCare.

## Pelanggan

- Rute stabil `/lapor-kendala` dapat dibuka tanpa login dari navigasi, halaman depan, bantuan produk, atau QR. Semua isian wajib: nama, keluhan, nomor WhatsApp, nomor pesanan, dan satu video kendala. Tidak meminta faktur atau akun anggota.
- Antarmuka mengikuti pemilih bahasa Indonesia/Inggris yang ada. Teks pelanggan tersedia dalam kedua bahasa.
- Video maksimum 50 MiB menggunakan pemeriksaan kontainer dan decoder server bersama dengan garansi. Perangkat ponsel/terbatas melewati kompresi dan decoding berat di browser; desktop dapat mengirim salinan kompresi yang lebih kecil sambil mempertahankan pilihan asli. Batas dan pemeriksaan server tetap berlaku.
- Satu klik Kirim menunggu persiapan video, mengunggah, lalu menunggu penyimpanan. Progres unggah 100% bukan konfirmasi laporan tersimpan. Galat mempertahankan nilai dan pilihan video; kunci pengiriman menjaga pengulangan payload yang sama tidak membuat laporan ganda. Setelah hasil jaringan tidak pasti, isian dikunci dan tombol Kirim mengulang payload yang sama; galat validasi yang definitif membuka isian kembali.
- Formulir dapat dikirim di luar jam pelayanan. Jam operasional adalah informasi tindak lanjut, bukan pembatasan pengiriman.
- Konfirmasi hanya diberikan setelah video dan metadata berhasil disimpan. Halaman sukses menampilkan nomor laporan dan tiket lengkap, kemudian membuka WhatsApp admin yang dikonfigurasi. Tombol cadangan tersedia jika pembukaan otomatis gagal. Pelanggan sendiri menekan Kirim di WhatsApp; tidak ada API pengiriman pesan otomatis.
- Pesan WhatsApp berisi tiket lengkap dalam bahasa yang dipilih: nomor laporan, nama, nomor WhatsApp, nomor pesanan, keluhan utuh, nama video, tautan video admin privat, dan kedua persetujuan. Tersedia ringkasan tiket serta tombol salin; teks tidak dipotong oleh aplikasi. Kegagalan WhatsApp tidak menghapus laporan; tautan video tetap membutuhkan sesi admin, tanpa URL Storage publik atau bertanda tangan.

## Alur publik dua langkah — keputusan 22 Oktober 2026

Sumber: pemilik mengoreksi sasaran perubahan menjadi halaman publik ketika tombol Lapor Kendala diklik, lalu menyetujui rencana implementasi. Formulir admin tidak diubah. Dalam klarifikasi, pemilik mempertahankan semua catatan lama, memilih tautan video privat admin, dan memilih WhatsApp terbuka dengan pesan lengkap untuk dikirim sendiri oleh pelanggan.

- URL dan QR `/lapor-kendala` tetap. Dua langkah memakai state tampilan pada URL yang sama. Langkah pertama menampilkan judul dan pengantar, **Jam Operasional** tebal, jadwal Senin–Jumat 09.00–17.00 WIB beserta pengecualian libur, pesan singkat “Mohon ditunggu ya Kak, tim Gascomp CareDirect akan segera menghubungi Kakak untuk memberikan solusi terbaik.”, lalu tombol “Klik di sini untuk untuk isi formulir” sesuai teks pemilik.
- Langkah kedua mempertahankan pengantar dan lima isian wajib. Judul **Formulir** di kiri dan **Kirim laporan** di kanan sejajar, termasuk pada ponsel. Tidak ada tombol kirim kedua di bawah. Tombol Kembali mempertahankan isian/video selama halaman belum dimuat ulang; data tidak disimpan di localStorage.
- Checkbox wajib dan tidak dicentang secara bawaan: “Saya bersedia untuk tidak mengajukan pengembalian barang/dana sebelum mendapat arahan tim CareDirect.” dan “Saya bersedia untuk tidak memberikan ulasan terlebih dahulu agar proses penanganan berjalan lancar dan tuntas.”
- POST multipart memerlukan tepat satu nilai `true` untuk masing-masing `agreeNoReturn` dan `agreeNoReview`; server menolak nilai hilang, salah, atau ganda sebelum penyimpanan. Metadata JSON laporan mencatat `consent` dengan dua nilai benar, `version: 2026-10-22-v1`, dan `acceptedAt` dari waktu server. Pengulangan kirim mempertahankan waktu pertama. Laporan lama tidak diberi persetujuan secara retroaktif. Tidak memerlukan migrasi SQL.
- Kedua langkah dan tiket mendukung Indonesia/Inggris. Blok catatan lama di formulir dan sukses dihapus sesuai koreksi terbaru di bawah. Setelah tersimpan, halaman menyatakan pelanggan perlu menekan Kirim di WhatsApp; tidak mengklaim pesan telah dikirim. Tombol salin menyediakan teks yang dapat dipilih secara manual bila clipboard ditolak.

## Penghapusan blok catatan — koreksi 22 Oktober 2026

Sumber: pemilik memberikan teks empat paragraf beserta tangkapan layar dan meminta “Hapus bagian ini.” Blok catatan berlatar biru di formulir dan halaman sukses dihapus, termasuk terjemahan Inggrisnya. Keputusan ini menggantikan permintaan sebelumnya untuk mempertahankan catatan lengkap. Alasan tambahan tidak disebutkan.

Cakupan implementasi mengikuti komponen catatan bersama pada kedua tampilan. Informasi jam operasional dan pesan singkat pada langkah awal, dua checkbox persetujuan wajib, serta tiket WhatsApp tetap berlaku. Penerimaan: blok empat paragraf beserta wadahnya tidak lagi tampil dalam kedua bahasa pada formulir maupun konfirmasi sukses. Bukti verifikasi aktual dicatat pada [serah terima CareDirect](../../work/handoffs/handoff-care-direct-complete-v1.md).

## Admin dan penyimpanan

- Ruang kerja **CareDirect** terpisah menampilkan laporan terbaru, pencarian nomor laporan/nama/WhatsApp/pesanan, filter status, detail keluhan, video privat, dan tombol menghubungi WhatsApp pelanggan.
- Status tersimpan `new`, `in_progress`, dan `resolved` menggunakan label admin `New`, `In progress`, dan `Resolved`. Perubahan disimpan segera, tidak bergantung pada Simpan katalog. Kegagalan mempertahankan status terakhir yang dikonfirmasi.
- Tambahan permintaan pemilik 22 Oktober 2026: tombol `Delete report` pada detail admin menghapus satu laporan beserta video privat secara permanen, setelah konfirmasi yang menyebut ID laporan. Penghapusan memerlukan sesi admin dan asal permintaan yang valid; DELETE yang diulang untuk ID yang sudah tidak ada tetap berhasil. Pilihan hapus massal tidak ditambahkan.
- Bukti dihapus sebelum metadata. Jika pembersihan bukti gagal, laporan tetap tersedia untuk dicoba ulang. Jika penghapusan metadata gagal sesudah bukti dibersihkan, laporan sementara dapat terlihat tanpa video; ulangi hapus untuk menyelesaikannya. UI hanya menampilkan sukses setelah server mengonfirmasi keduanya selesai.
- Endpoint pengiriman multipart adalah `/care-direct/reports`. Endpoint admin adalah `/admin/care-direct/reports`, `/admin/care-direct/reports/[reportId]`, dan `/admin/care-direct/reports/[reportId]/video`.
- Penyimpanan Supabase dan bucket bukti terpisah dari garansi. Tabel dan objek privat hanya diakses server; pembacaan laporan/video memerlukan sesi admin. Mutasi memeriksa asal permintaan; video mendukung HEAD dan Range untuk pemutaran.
- Penyimpanan lokal hanya untuk pengembangan tanpa Supabase. Kegagalan Supabase terkonfigurasi tidak boleh dialihkan diam-diam ke penyimpanan lokal. Tidak ada formulir penelusuran publik, ekspor atau akun pelanggan pada versi awal.

## Tautan card attention

Tautan cetak adalah `https://support.gascompsuperlock.com/lapor-kendala`. Aset [QR PNG](../../../public/care-direct-qr.png) menggunakan koreksi kesalahan H, area kosong empat modul, dan tidak memakai logo di tengah. Admin dapat mengunduhnya dari ruang kerja CareDirect. Pemasangan card attention di Duoke berada di luar implementasi ini; rute live harus diverifikasi setelah rilis sebelum QR dibagikan.

## Bukti implementasi

Commit `0f58985` aktif di produksi sejak 22 Oktober 2026 pukul 10.24.31 WIB. Pengiriman sintetis, ulang kirim, status admin dan akses video privat diverifikasi live; laporan uji telah dibersihkan. Hasil pemeriksaan dan bukti rilis dicatat pada [serah terima CareDirect](../../work/handoffs/handoff-care-direct-complete-v1.md). Keberadaan kode dan migrasi lokal tidak membuktikan fitur sudah aktif di produksi.

Opsi hapus laporan dan video aktif pada commit `4ba3d5e` sejak 22 Oktober 2026 pukul 11.29.06 WIB. Konfirmasi/batal, penghapusan baris dan objek privat, serta pengulangan DELETE telah diperiksa di produksi menggunakan satu laporan sintetis yang sudah dibersihkan.

Alur publik dua langkah, persetujuan wajib, dan tiket WhatsApp lengkap aktif pada commit `7edf5d2` sejak 22 Oktober 2026 pukul 13.01.46 WIB. Uji browser live dan pengiriman/ulang kirim sintetis berhasil; data uji telah dibersihkan.
