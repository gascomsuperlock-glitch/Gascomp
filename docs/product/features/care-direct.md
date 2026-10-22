# Laporan kendala Gascomp CareDirect

[Indeks spesifikasi](../spec.md) · [Dukungan](support.md) · [Supabase](../integrations/supabase.md)

## Keputusan pemilik

Sumber: percakapan 22 Oktober 2026. Pemilik meminta opsi pelaporan keluhan produk pada web yang ada, terpisah dari klaim garansi, untuk ditautkan melalui card attention Duoke. Dalam klarifikasi, pemilik memilih kelima isian wajib, penerimaan melalui admin dan WhatsApp, nomor WhatsApp admin yang sudah dikonfigurasi, pembukaan WhatsApp otomatis, serta catatan lengkap pada formulir dan halaman sukses. Ini tidak mengubah kelayakan atau tiket garansi, maupun keanggotaan GascompCare.

## Pelanggan

- Rute stabil `/lapor-kendala` dapat dibuka tanpa login dari navigasi, halaman depan, bantuan produk, atau QR. Semua isian wajib: nama, keluhan, nomor WhatsApp, nomor pesanan, dan satu video kendala. Tidak meminta faktur atau akun anggota.
- Antarmuka mengikuti pemilih bahasa Indonesia/Inggris yang ada. Teks Indonesia di bawah dipertahankan persis; versi Inggris menerjemahkan maknanya.
- Video maksimum 50 MiB menggunakan pemeriksaan kontainer dan decoder server bersama dengan garansi. Perangkat ponsel/terbatas melewati kompresi dan decoding berat di browser; desktop dapat mengirim salinan kompresi yang lebih kecil sambil mempertahankan pilihan asli. Batas dan pemeriksaan server tetap berlaku.
- Satu klik Kirim menunggu persiapan video, mengunggah, lalu menunggu penyimpanan. Progres unggah 100% bukan konfirmasi laporan tersimpan. Galat mempertahankan nilai dan pilihan video; kunci pengiriman menjaga pengulangan payload yang sama tidak membuat laporan ganda. Setelah hasil jaringan tidak pasti, isian dikunci dan tombol Kirim mengulang payload yang sama; galat validasi yang definitif membuka isian kembali.
- Formulir dapat dikirim di luar jam pelayanan. Jam operasional adalah informasi tindak lanjut, bukan pembatasan pengiriman.
- Konfirmasi hanya diberikan setelah video dan metadata berhasil disimpan. Halaman sukses menampilkan nomor laporan dan seluruh catatan, kemudian membuka WhatsApp admin yang dikonfigurasi. Tombol cadangan tersedia jika pembukaan otomatis gagal. Pelanggan sendiri menekan Kirim di WhatsApp; tidak ada API pengiriman pesan otomatis.
- Pesan Indonesia: `Halo Kak, saya sudah mengirim laporan kendala ke Gascomp CareDirect. Nomor laporan: {id}.` Versi Inggris tersedia. Kegagalan WhatsApp tidak menghapus laporan; video tetap privat di admin dan tidak dikirim sebagai URL publik.

## Catatan pelanggan Indonesia

Mohon berkenan untuk menunggu ya Kak, tim khusus kami dari Gascomp CareDirect akan segera menghubungi Kakak untuk memberikan solusi terbaik dan penanganan langsung.

🕒 Catatan Operasional: Tim kami aktif melayani pada hari Senin s.d. Jumat pukul 09.00 - 17.00 WIB (Weekend & Tanggal Merah libur). Pesan di luar jam tersebut akan kami balas pada hari kerja berikutnya.

Agar proses kendala Kakak dapat kami selesaikan dengan cepat dan tuntas, kami mohon bantuan Kakak untuk tidak melakukan pengajuan pengembalian barang/dana atau memberikan ulasan terlebih dahulu sebelum mendapatkan arahan langsung dari tim CareDirect kami.

Kenyamanan dan keamanan dapur Kakak adalah prioritas utama kami. Terima kasih banyak atas kesabaran dan kerja samanya, Kak! 🙏✨

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
