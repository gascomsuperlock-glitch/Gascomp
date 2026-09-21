<a id="product-catalog-and-help"></a>
# Katalog produk dan bantuan

[Indeks spesifikasi](../spec.md)

<a id="customer-flow"></a>
## Alur pelanggan

Dari halaman depan, seorang pelanggan mencari berdasarkan nama produk, model, atau SKU, memilih sebuah produk, dan membuka halaman bantuannya. Kode QR yang dicetak membuka halaman per-produk yang sama secara langsung. Pelanggan tidak memerlukan akun.

Halaman depan dan halaman bantuan produk menyediakan pemilih bahasa yang terlihat dengan opsi Bahasa Indonesia dan Inggris. Bahasa yang dipilih berlaku untuk navigasi yang ditujukan kepada pelanggan, konten bantuan, FAQ, formulir, tindakan dukungan, dan label aksesibilitas di mana terjemahan tersedia. Preferensi disimpan untuk kunjungan berikutnya; Inggris digunakan ketika tidak ada preferensi atau terjemahan.

Pelanggan mengonfirmasi gambar produk, nama, dan SKU, kemudian menonton tutorial atau membaca panduan masalah dan FAQ. Dukungan WhatsApp dan tindakan klaim garansi tetap tersedia ketika konten layanan mandiri tidak menyelesaikan masalah.

Jika produk atau tutorial tidak tersedia, halaman menyajikan keadaan kosong yang jelas dan jalur dukungan. Produk draf tetap pribadi. Produk yang diarsipkan dihapus dari katalog tetapi tetap dapat diakses melalui URL stabil mereka untuk kode QR yang ada.

<a id="product-help-page"></a>
## Halaman bantuan produk

| Bagian | Konten |
| --- | --- |
| Identitas produk | Gambar utama, galeri, nama, model, dan SKU |
| Tindakan utama | Pintasan tutorial dan pemecahan masalah |
| Tutorial penggunaan | YouTube, Google Drive, TikTok, atau file video yang diunggah |
| Bantuan berbasis masalah | Ringkasan masalah spesifik model, langkah, dan peringatan |
| FAQ | Pertanyaan umum dan jawaban yang diverifikasi |
| Dukungan | WhatsApp, Klaim Garansi, Gascomp Care, dan Pusat Layanan |

Konten tersedia dalam Bahasa Indonesia dan Inggris yang jelas dan tetap spesifik untuk setiap model. Pemecahan masalah teknis harus diverifikasi oleh tim Gascomp dan harus mengidentifikasi kapan pelanggan harus berhenti dan menghubungi dukungan.

Bagian publik **What is happening?** memuat panduan masalah yang dimasukkan untuk produk tersebut di editor admin **Issues**. Membuka sebuah panduan mengungkapkan langkah pemecahan masalah berurutan, peringatan keselamatan opsional, dan tindakan dukungan WhatsApp kontekstual. Ketika sebuah produk tidak memiliki panduan masalah, bagian tersebut menampilkan keadaan kosong terjemah yang eksplisit alih-alih ruang kosong.

Deskripsi produk pendek dapat berasal dari brosur Gascomp yang diverifikasi dan cocok dengan produk admin yang ada berdasarkan SKU. Impor brosur memperbarui hanya bidang `description`; tidak membuat produk atau mengubah nama, status, gambar, tutorial, panduan masalah, FAQ, atau identitas sumber. Alias katalog eksplisit dapat mencakup perbedaan format dan varian model yang didokumentasikan.

Hasil impor pada 11 September 2026: 21 produk admin yang ada menerima deskripsi pendek dari brosur 2026. Pemetaan berisi 13 kecocokan SKU yang tepat, dua kecocokan yang dinormalisasi format, dua alias katalog yang diverifikasi, dan empat varian katalog yang didokumentasikan. Lainnya 40 SKU brosur tidak ada dalam katalog admin saat ini dan tidak dibuat. Verifikasi database mengonfirmasi bahwa tidak ada bidang produk selain `description` yang berubah.

Keluarga masalah prioritas mencakup produk yang tidak menyala, penyesuaian nyala api, dan regulator yang tidak terkunci. Kategori-kategori ini memandu persiapan konten; mereka tidak mengotorisasi saran perbaikan yang tidak diverifikasi.

<a id="tutorial-videos"></a>
## Video tutorial

- Administrator menambahkan HTTPS YouTube, Google Drive, TikTok, atau URL MP4/WebM langsung, atau unggah file MP4/WebM hingga 50 MB masing-masing (52.428.800 byte).
- Satu produk dapat memiliki beberapa tutorial. Tutorial YouTube yang ada tetap kompatibel.
- YouTube, Google Drive, dan link video TikTok lengkap menggunakan pemutar tertanam; file langsung dan unggahan menggunakan kontrol browser asli dengan pemutaran mobile inline. Pemutar tidak autoplay.
- File Google Drive harus mengizinkan siapa pun dengan link untuk melihatnya; kunci sumber daya dipertahankan. Penyedia dapat membatasi pemutaran atau memerlukan cookie pihak ketiga. Setiap sumber yang dikenali termasuk **Open original video** fallback.
- Link berbagi TikTok pendek membuka halaman penyedia. Gunakan link `/@user/video/` lengkap untuk pratinjau tertanam.
- Pratinjau admin menggunakan pemutar yang sama dengan halaman produk publik, termasuk keadaan memuat, sumber tidak valid, dan kesalahan pemutaran asli.
- Memilih file MP4/WebM baru membuat empat pilihan thumbnail dari frame di dalam video tersebut sebelum unggahan dimulai. Administrator memilih satu frame; thumbnail WebP, JPEG, atau PNG yang dihasilkan browser dan video yang dipilih kemudian diunggah bersama. Tutorial yang sudah ada dapat menghasilkan set pilihan frame baru tanpa mengunggah ulang video.
- Thumbnail yang dipilih muncul dalam urutan video admin, daftar tutorial pelanggan, dan sebagai poster pemutar video asli. Video yang baru diunggah tidak dijadwalkan dalam konten produk hingga video dan thumbnail yang dipilih selesai diunggah.
- Video manual langsung masuk ke bucket `product-videos` publik dan thumbnail yang dipilih masuk ke bucket `product-images` publik menggunakan URL unggah bertanda yang diterbitkan setelah memeriksa sesi admin dan asal permintaan. Produk baru harus disimpan sebelum diunggah. Hanya URL video dan thumbnail yang selesai dijadwalkan dalam editor; pilih **Save** untuk menempatkannya pada produk. Membatalkan atau menghapus tutorial dapat meninggalkan unggahan yang tidak teracu; pembersihan file yang tidak digunakan adalah operasi administratif.
- Mode hanya lokal mendukung link video; unggahan file memerlukan Supabase. File tutorial yang diunggah bersifat publik, termasuk sebelum produknya diterbitkan.

Referensi penyedia: [Pemutar tertanam TikTok](https://developers.tiktok.com/docs/en/embed-player), [Berbagi Google Drive](https://support.google.com/drive/answer/2494822?hl=en), dan [Unggah bertanda Supabase](https://supabase.com/docs/reference/javascript/file-buckets-uploadtosignedurl).

Status: katalog, pencarian, halaman produk, galeri gambar, tutorial, panduan masalah, FAQ, tindakan dukungan, dan pilihan bahasa antarmuka Indonesia/Inggris yang tersimpan telah diimplementasikan. Konten produk menggunakan bahasa yang disimpan hingga terjemahannya tersedia.
