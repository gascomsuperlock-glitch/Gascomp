<a id="warranty-claims-and-tickets"></a>
# Klaim garansi dan tiket

[Indeks spesifikasi](../spec.md)

<a id="shared-product-and-ticket-data"></a>
## Data produk dan tiket yang dibagikan

Panel admin dan website pelanggan menggunakan data Supabase yang sama. Perubahan produk yang diterbitkan menjadi tersedia di semua perangkat tanpa duplikasi. Draf tetap pribadi. Ada cadangan lokal untuk pengembangan ketika Supabase tidak tersedia.

Klaim yang berhasil menerima nomor tiket `GWC-YYYYMMDD-XXXXXX` yang unik. Nomor yang sama muncul dalam tampilan Tiket Garansi Admin. Nama produk dan SKU disimpan sebagai tangkapan layar, sementara `product_id` terhubung ke produk saat ini jika ada cocoknya.

Alur kerja admin menampilkan Pending (Menunggu) dan Done (Selesai). Status tersimpan tetap kompatibel: `closed` berarti Done; `new`, `reviewing`, `approved`, dan `rejected` berarti Pending. Hanya administrator dengan sesi aktif yang dapat melihat data pribadi, mengunduh bukti pribadi, atau mengubah status. Sinkronisasi tiket WhatsApp dan Duoke berada di luar cakupan saat ini.

<a id="claim-submission"></a>
## Pengajuan klaim

<a id="product-search-for-shared-legacy-qr-codes"></a>
### Pencarian produk untuk kode QR warisan yang dibagikan

Formulir `/klaim-garansi` yang ada juga mendukung input tanpa parameter produk, termasuk tujuan kode QR warisan yang dibagikan. Nama produk dan SKU terhubung, pilihan pencarian didukung oleh katalog yang sama dengan halaman depan publik. Hanya produk yang diterbitkan dan tidak diarsipkan yang muncul; draf menjadi dapat dipilih setelah dipublikasikan dan memuat katalog yang diperbarui. Pencarian mencocokkan nama, model, atau SKU di salah satu bidang. Setiap hasil menampilkan nama dan SKU. Memilih salah satu bidang mengisi keduanya; mengetik nama unik yang tepat atau SKU juga menyelesaikan pasangan tersebut. Nama duplikat memerlukan pemilihan hasil eksplisit. Mengedit atau menghapus nilai yang dipilih menghapus pasangan lama hingga produk lain diselesaikan, dan teks pencarian yang tidak dipilih tidak dapat dikirim sebagai produk.

Tautan produk yang ada menyelesaikan SKU mereka ke nama katalog yang diterbitkan saat ini. Tautan hanya-nama menyelesaikan hanya nama unik yang tepat. Produk terhubung yang tidak diketahui, belum diterbitkan, atau diarsipkan menampilkan pemberitahuan pemilihan daripada menerima teks URL sembarang. Pemilihan bertahan dari pengiriman yang gagal bersama sisa formulir. Pilihan tersebut mendukung navigasi keyboard dan pemuatannya yang dilokalisasi, serta umpan balik kosong dan validasi. Bidang klaim lain, pemrosesan bukti, dan perilaku pengiriman tetap tidak berubah.

Header formulir dan layar sukses menggunakan tautan **Back to home** ke `/`, yang merupakan `https://support.gascompsuperlock.com/` dalam produksi. Setelah halaman klaim terpasang, entri riwayat URL yang sama juga merutekan satu langkah browser/telepon Kembali ke depan rumah daripada halaman produk referensi atau website warisan. Status riwayat kerangka kerja yang ada dipertahankan, remount/reload tidak menumpuk entri tambahan, dan tautan depan rumah yang terlihat mengonsumsi entri yang sama. Tujuan depan rumah menggantikan entri klaim asli sehingga Kembali dari depan rumah lain dapat keluar dengan normal. Penerima didorong ketika meninggalkan halaman klaim. Perilaku ini memerlukan JavaScript dan browser yang menghormati entri riwayat yang ditambahkan; menutup aplikasi scan atau melompat beberapa entri riwayat berada di luar kendali halaman.
Arahkan Cloudflare yang dimaksud untuk URL `/dll/` yang dicetak adalah `https://support.gascompsuperlock.com/klaim-garansi`. Mengaktifkan aturan eksternal tersebut dan menerapkan aplikasi adalah operasi terpisah.

<a id="claim-processing"></a>
### Pemrosesan klaim

Di perangkat mobile dan desktop, navigasi WhatsApp yang berhasil dimulai langsung di dalam penanganan respons setelah server mengonfirmasi tiket yang tersimpan.
Pelanggan tidak perlu menekan tombol Lanjut kedua dalam alur normal.
Konfirmasi pertama menampilkan status pembukaan. Tautan WhatsApp manual muncul hanya jika halaman tetap bertahan selama 2,5 detik, atau segera jika navigasi gagal.
Pesan pemulihan mengonfirmasi bahwa tiket sudah disimpan dan tidak boleh dikirim ulang. Pengiriman yang gagal, tidak lengkap, atau belum dikonfirmasi tidak pernah membuka WhatsApp. Nomor yang dikonfigurasi hilang menjaga konfirmasi tiket. Peramban, webview dalam aplikasi, dan sistem operasi mungkin masih memerlukan konfirmasi untuk membuka aplikasi WhatsApp eksternal; situs tidak dapat melewati kontrol tersebut.

Setiap halaman produk terhubung ke `/klaim-garansi` dengan nama produk dan SKU diisi secara otomatis. Klaim dibuat hanya setelah formulir dan setiap file bukti disimpan dengan sukses. Setelah pengiriman berhasil, peramban membuka nomor WhatsApp admin yang dikonfigurasi di tab yang sama dengan pesan pembukaan `kak, aku sudah claim garansi`, diikuti oleh nomor tiket yang disimpan dan tautan absolut ke `/admin/login?ticket=...` pada asal website saat ini. Tautan mempertahankan pilihan tiket melalui login dan membuka tampilan Tiket Jaminan Dilindungi dengan nomor tersebut diisi secara otomatis di pencarian dan detailnya terlihat. Parameter tiket yang tidak valid jatuh kembali ke dashboard normal; tiket yang tidak cocok menampilkan keadaan kotak masuk kosong. Pelanggan mengirim pesan di WhatsApp. Pengiriman yang gagal atau ditolak tetap berada di formulir. Layar sukses mempertahankan nomor tiket dan tautan WhatsApp manual jika navigasi otomatis diblokir; tanpa nomor yang dikonfigurasi, ia menjaga konfirmasi tiket.

| Data yang Diperlukan | Aturan |
| --- | --- |
| Pelanggan | Nama, email, dan nomor WhatsApp |
| Produk | Pemilihan produk/nama dan SKU |
| Pembelian | Toko, tanggal pembelian, nomor pesanan, dan harga |
| Masalah | Deskripsi masalah pelanggan |
| Faktur | Satu file JPG, PNG, WebP, atau PDF hingga 4 MB |
| Foto | Satu hingga empat file JPG, PNG, atau WebP hingga 4 MB masing-masing |
| Video | Satu file video hingga 50 MB: MP4/M4V, MOV, WebM/MKV, AVI, 3GP/3G2, MPEG, TS/MTS/M2TS, WMV/ASF, FLV, atau OGV |

Bukti divalidasi segera saat file dipilih. File yang hilang, file kosong, format tidak didukung, jumlah foto berlebihan, dan file di atas batas ukuran menampilkan kesalahan di samping bidang unggah yang terpengaruh dan memblokir pengiriman. Tidak ada ukuran minimum dalam KB atau MB yang didefinisikan; setiap file yang dipilih harus tidak kosong. Video 1 MB dan 23 MB diterima jika format dan pemutaran mereka valid. Validasi yang sama berjalan di server. Validasi gagal atau pengiriman mempertahankan semua detail yang dimasukkan, persetujuan, dan file yang dipilih sehingga pelanggan hanya perlu memperbaiki bidang yang terpengaruh. Konfirmasi tiket menggantikan formulir hanya setelah pengiriman berhasil.

Pilihan video dan drag-and-drop menggunakan validasi yang sama. Browser memeriksa tanda tangan kontainer dan mencoba memuat frame video sebelum mengaktifkan pengiriman. Kehadiran codec browser yang hilang atau timeout pratinjau menunda validasi pemutaran ke server; ini tidak mengklasifikasikan file sebagai rusak. Selama pemeriksaan, formulir menampilkan pesan kemajuan; memilih file lain menggantikan hasil sebelumnya. File kosong dan kontainer yang tidak dikenali ditolak saat pemilihan. Kerusakan yang memerlukan dekoding penuh dilaporkan di samping bidang video pada pengiriman. Picker menerima tipe MIME video dan ekstensi video umum ketika browser menghilangkan metadata MIME. Server mendeteksi kontainer asli dari byte dan menyimpan tipe MIME video kanoniknya; mengubah nama file tidak dapat menghindari dekoding. Validasi gambar dan PDF masih memeriksa tipe MIME, ukuran, dan jumlah; ini tidak mendekode isinya.

Sebelum membuat tiket atau menyimpan bukti, server menggunakan FFmpeg yang dikompilasi ke WebAssembly dalam pekerja Node terisolasi untuk mendekode seluruh video dan audio, menolak kesalahan dekoder, media terpotong, file hanya audio, dan file tanpa frame video. Output verifikasi mempertahankan basis waktu input dan timestamp frame variabel sehingga rekaman layar MOV yang valid tidak gagal karena pembulatan timestamp output. Verifikasi memiliki batas pemrosesan 30 detik; timeout meminta salinan lebih pendek, dan dekoder yang hilang melaporkan kegagalan verifikasi sementara. Pemeriksaan ini menggunakan memori saja, tanpa eksekutif native atau file sementara disk; pekerja dihentikan setelah setiap pemeriksaan. Pemeriksaan ini tidak dapat mengembalikan bukti rusak yang sudah disimpan; pelanggan harus menyediakan pengganti utuh. Dekode yang sukses tidak menjamin bahwa semua browser mendukung codec video tersebut. Kotak masuk admin menyediakan link unduh video pribadi sehingga bukti juga dapat dibuka di pemutar perangkat yang kompatibel.

Formulir klaim mengirim bukti multipart ke Node Route Handler pada
`POST /warranty/claims`, yang menggunakan validasi klaim dan layanan tiket yang ada. Titik akhir memeriksa asal permintaan dan menerapkan batas tubuh 72 MB, termasuk permintaan streaming tanpa header Content-Length. Server Action legacy mempertahankan batas yang sama. Ini mengakomodasi video 50 MB, faktur 4 MB, empat foto 4 MB, dan overhead multipart. Batas per-file masih berlaku.

<a id="submission-progress-and-bounded-storage"></a>
### Progress pengiriman dan penyimpanan terbatas

Browser melaporkan persentase unggah aktual, lalu beralih ke verifikasi video dan menyimpannya. Mencapai 100% unggah tidak menyiratkan klaim disimpan. Pengiriman yang berjalan lebih lama menjelaskan bahwa file besar dapat memakan beberapa menit pada jaringan seluler. Formulir tetap terpasang dan mempertahankan detail, persetujuan, dan file terpilih setelah validasi atau kegagalan transportasi. Kesalahan menerima fokus sehingga pelanggan yang mengirimkan dari bagian bawah formulir panjang dapat segera melihat penjelasan. Klik ganda diblokir secara sinkron.

Unggah yang macet berhenti setelah 45 detik tanpa kemajuan; permintaan browser lengkap dibatasi sepuluh menit. Setelah unggah, konfirmasi memiliki batas 105 detik. Respons yang hilang atau timeout melaporkan bahwa hasil pengiriman tidak diketahui dan meminta pelanggan untuk memeriksa dengan dukungan sebelum mencoba lagi. Browser tidak pernah secara otomatis mengunggah ulang atau menciptakan tiket sukses. Titik akhir juga membatasi inaktivitas unggah masuk selama 45 detik dan durasi unggah total selama sepuluh menit.

Server-side full video decoding dan privasi bukti tetap tidak berubah. Supabase storage memulai bukti terbesar terlebih dahulu dan mengunggah paling banyak tiga file sekaligus. Metadata bukti disisipkan dalam satu batch setelah setiap pengunggahan berhasil. Permintaan penyedia memiliki batas waktu individual (15 detik untuk panggilan database, 40 detik untuk Storage) dalam anggaran total penyimpanan 50 detik. Kegagalan menunggu unggahan yang dimulai selesai sebelum mencoba membersihkan jalur dan tiket pengiriman ini, dengan anggaran pembersihan independen delapan detik. Kegagalan pembersihan mencatat diagnosa operator umum tanpa data pelanggan dan mungkin memerlukan rekonsiliasi.

Perubahan ini memerlukan rilis aplikasi dan tidak memerlukan migrasi database. Video pelanggan 46,4 MB memicu investigasi; tanpa rekaman asli dan log permintaan, tahap kegagalan pastinya belum dikonfirmasi. Progress unggahan dan permintaan terbatas mengatasi keadaan menunggu yang sebelumnya tidak transparan; penyimpanan paralel mengurangi putaran penyedia berurutan. Bandwidth koneksi dan kompleksitas decoding video masih mempengaruhi total waktu pengiriman.

<a id="video-compression-before-upload"></a>
### Kompresi video sebelum pengunggahan

Pilihan video memulai kompresi opsional pada perangkat pelanggan, sementara sisa formulir tetap dapat diedit. Pilihan asli harus melewati pemeriksaan ukuran 50 MB dan kontainer/penayangan yang ada terlebih dahulu. File hingga 2 MiB sudah kecil dan melewatkan kompresi. File besar yang didukung dijalankan di worker khusus menggunakan Mediabunny dan encoder WebCodecs browser; perpustakaan media dimuat hanya ketika worker dimulai. Tidak ada video yang diunggah selama persiapan.

Kompresi mempertahankan durasi penuh, orientasi, rasio aspek, dan audio. Output muat dalam 1280 x 720 piksel (atau 720 x 1280 untuk potret), tanpa upscaling, dengan target bitrate video 1,2 Mbps. Audio AAC yang kompatibel disalin; jika tidak, audio dikodekan dengan target 96 kbps. MP4/H.264 lebih disukai, dengan WebM/VP8 sebagai alternatif perangkat yang didukung. HDR, kode kontainer yang tidak didukung, dan jalur video/audio multiple mempertahankan asli daripada kehilangan bukti. Jalur mungkin tidak dapat dibuang secara diam-diam. Durasi output dan jumlah jalur diperiksa, dan file kompresi hanya digunakan ketika tidak kosong dan setidaknya 10% lebih kecil. Penulisan MP4 terfragmentasi media secara inkremental, memungkinkan penjaga ukuran output menghentikan konversi yang tumbuh melebihi ukuran berguna sebelum finalisasi.

Formulir menampilkan persentase persiapan dan ukuran sebelum/sesudah dalam kedua bahasa. Submit tetap tersedia selama video terpilih sedang disiapkan. Satu klik valid mengunci pengiriman, mempertahankan snapshot formulir tersebut, menunggu tugas validasi/kompresi video saat ini, dan secara otomatis mengunggah hasilnya. Status persiapan ditampilkan terpisah dari persentase unggahan; persiapan tidak pernah menampilkan persentase unggahan sebelum permintaan dimulai. Bukti yang tidak valid menghentikan pengiriman antrian dengan kesalahan dan mempertahankan formulir. Klik selanjutnya tidak dapat memasukkan permintaan lain, dan meninggalkan formulir membatalkan kelanjutan sebelum pengunggahan dimulai. Pemberitahuan pending meminta pelanggan menunggu hingga selesai dan menjelaskan bahwa WhatsApp terbuka setelah klaim disimpan; klik kedua tidak diperlukan. Pelanggan dapat melewatkan kompresi dan mengirim asli. Persiapan dibatasi 60 detik; kesalahan worker, browser yang tidak didukung, dan aset worker yang tidak tersedia juga jatuh kembali ke asli dengan pemberitahuan eksplisit. Mengganti pilihan atau meninggalkan formulir menghentikan worker-nya; hasil usang tidak dapat menggantikan file yang lebih baru. File kecil atau fallback tetap tunduk pada validasi server penuh.

Hanya upload multipart yang menggunakan salinan yang sudah disiapkan. File asli tetap berada di pemilih, dan baik formulir maupun salinan yang sudah disiapkan bertahan dari pengiriman yang gagal sehingga retry tidak memerlukan kompresi lagi. Server masih sepenuhnya mendekode video yang diunggah sebelum menyimpan tiket dan bukti dalam penyimpanan pribadi; hanya metadata yang disimpan di database. WhatsApp terbuka hanya setelah penyimpanan berhasil. Kompresi mengurangi byte yang ditransfer atau disimpan jika didukung; waktu total dan rasio kompresi bergantung pada rekaman, perangkat, dan jaringan. Tidak ada jaminan kecepatan universal yang berlaku.

<a id="admin-video-preview"></a>
## Pratinjau video Admin

Kotak masuk tiket membuka pratinjau video secara inline dengan kontrol pemutaran asli dan pemutaran inline mobile. Memilih **Preview video** segera menempelkan URL bukti yang sudah dilindungi yang ada ke pemain browser dengan pra-pemuatan metadata; tidak ada pengambilan JavaScript file penuh awal atau konversi server. Pemuat awal berakhir ketika metadata tersedia, termasuk pada browser yang menunda frame media hingga Play. Video tidak auto-play. Pencarian asli menggunakan rentang byte tunggal yang telah diverifikasi. Menutup atau beralih pratinjau melepaskan pemain dan membatalkan permintaan medianya.

Alur bukti Supabase melalui aplikasi tanpa membufffer objek lengkapnya. Setiap permintaan memeriksa sesi admin dan status penghapusan tiket, termasuk permintaan HEAD dan rentang. Kredensial penyimpanan pribadi tetap berada di server; tidak ada URL yang ditandatangani atau redirect penyedia yang terekspos. Pemanggilan metadata memiliki batas waktu 15 detik dan streaming penyimpanan memiliki batas 120 detik. Panjang konten yang salah, rentang upstream yang tidak valid, dan stream yang terpotong atau terlalu besar ditolak. Bukti lokal mempertahankan respons rentang memori dalam yang ada. Unduhan asli tetap tidak berubah.

Jika browser melaporkan format yang tidak didukung atau tidak dapat didekode, klien terlebih dahulu memeriksa akses dengan HEAD, kemudian secara otomatis meminta `preview=1` sekali. Akses HTTP dan kegagalan jaringan menampilkan kesalahan yang sesuai tanpa memicu konversi. Sesi yang kadaluarsa meminta administrator untuk masuk kembali. Fallback menciptakan salinan MP4 pribadi di memori dengan FFmpeg: video H.264 yang kompatibel diremux; kodek lain dikonversi ke H.264 dalam dimensi maksimum 1280 piksel, dengan audio AAC dan metadata sebelum media. Membaca file asli sepenuhnya dibatasi hingga 30 detik, dan konversi menjadi satu tugas konkuren per proses server, 30 detik, dan output 64 MB. Pengambilan fallback klien memiliki batas waktu 75 detik, setelah pemeriksaan akses paling lama 10 detik. Pemuat metadata asli memiliki batas waktu 30 detik. Kesalahan menyediakan Pratinjau retry dan Unduh video; retry dimulai dengan yang asli lagi.

Konversi fallback menggunakan URL objek sementara yang dicabut saat ditutup, diulang, atau gagal. Konversi tidak pernah menimpa bukti asli atau menulis ke Penyimpanan. Semua respons bukti menggunakan penyangkalan pribadi tanpa penyimpanan; respons asli mendukung rentang byte tunggal (`206`, `Content-Range`, dan `Accept-Ranges`), rentang yang tidak dapat dipenuhi (`416`), dan HEAD tanpa mengunduh tubuh objek Penyimpanan.

Inspeksi video dan pekerja pratinjau berjalan sebagai entri masuk Node asli dalam pengembangan dan produksi. Konstruktornya `node:worker_threads` mereka diimpor pada waktu runtime dengan `webpackIgnore: true`; pelacakan output masih mencakup file pekerja dan aset FFmpeg. Ini memungkinkan FFmpeg menginisialisasi impor WASM-nya sendiri daripada memiliki bundler menyelesaikan ruang nama impor WASM sebagai paket npm.

Supabase menyimpan bukti dalam bucket pribadi `warranty-evidence`. Pengembangan lokal menyimpannya di bawah `.data/warranty-tickets/`, yang diabaikan oleh Git.

<a id="admin-notifications"></a>
## Pemberitahuan Admin

Header admin yang dilindungi mencakup lonceng notifikasi garansi. Ini memeriksa tiket baru dan diperbarui setiap 30 detik saat tab daskboran terlihat, serta memeriksa segera ketika tab menjadi terlihat kembali. Sebuah badge menampilkan pembaruan yang belum dibaca, sebuah dropdown memuat aktivitas tiket terbaru, dan peringatan dalam aplikasi muncul ketika perubahan dideteksi saat daskboran terbuka.

Keadaan baca disimpan di browser administrator dan merekam status terbaru dan waktu stempel pembaruan yang diamati untuk setiap tiket. Pada kunjungan pertama, tiket yang ada dengan status `new` belum dibaca. Membuka tiket atau memilih **Mark all read** menghapus badge yang bersesuaian. Perubahan status yang dibuat di daskboran saat ini menggunakan waktu stempel server segera sehingga mereka tidak membuat notifikasi redundan pada refresh berikutnya.

Notifikasi tetap berada di dalam panel admin yang dilindungi. Email, WhatsApp, notifikasi push sistem operasi, dan pengiriman latar belakang saat daskboran tertutup berada di luar cakupan saat ini.

<a id="warranty-rules"></a>
## Aturan garansi

Pengajuan tidak menyiratkan persetujuan. Klaim baru dibatasi satu per nomor pesanan dan SKU produk, dibandingkan secara case-insensitif setelah memotong spasi di sekitarnya. Semua status tiket yang ada dihitung, termasuk tiket ditolak dan ditutup; pesanan atau SKU lain tetap memenuhi syarat. Tidak ada nomor seri unit, sehingga beberapa unit dari SKU yang sama dalam satu pesanan berbagi batas ini.

Tanggal pembelian harus valid, tidak boleh di masa depan, dan harus berada dalam satu tahun kalender menggunakan zona waktu Asia/Jakarta. Perayaan pertama tahun tetap memenuhi syarat; perayaan 29 Februari jatuh pada 28 Februari di tahun non-kabisat. Validasi server menolak klaim kadaluarsa sebelum menyimpan bukti. Administrator masih memverifikasi faktur dan cakupan.

Migrasi `202609140003_warranty_claim_eligibility.sql` menambahkan penegakan database yang menserikat pengajuan konkuren untuk identitas yang sama tanpa mengubah tiket historis. Ini disiapkan secara lokal dan memerlukan aplikasi sebelum perlindungan konkuren produksi aktif. Periksa aplikasi mencakup tiket yang ada; penyimpanan lokal menggunakan kunci eksklusif per-identitas. Proses lokal yang hancur dapat meninggalkan kunci yang memerlukan pembersihan operator.

Status: validasi formulir, validasi bukti, nomor tiket, Supabase/penyimpanan lokal, akses admin pribadi, daftar tiket, unduh bukti, pembaruan status, dan notifikasi admin dalam aplikasi telah diimplementasikan.

<a id="ticket-selection-and-deletion"></a>
## Pemilihan dan penghapusan tiket

Kotak masuk menggunakan daftar klaim ringkas dan panel detail terpisah pada layar lebar.
HP dan tablet menampilkan daftar atau tiket yang dipilih, dengan Kembali ke Tiket
memulihkan fokus ke baris yang dipilih. Pencarian mencakup nomor tiket, nama pelanggan,
email, telepon, produk, SKU, dan nomor pesanan. Semua, Menunggu, dan Selesai filter dapat
dikombinasikan dengan pencarian. Hasil menampilkan 20 baris awalnya dengan Tampilkan Tiket Lainnya untuk
hasil tambahan. Hasil kosong menawarkan Bersihkan Filter; kotak masuk baru menjelaskan di mana
klaim akan muncul. Tanggal dan waktu menggunakan Asia/Jakarta secara konsisten.

Pada HP di bawah 640 px, kotak masuk menggunakan judul ringkas dan badge Menunggu,
ringkasan ekspor yang dilipat, dan jarak yang lebih rapat sehingga baris tiket muncul lebih cepat.
Pencarian mempertahankan label yang dapat diakses, dan teks input dan pilih menggunakan teks 16 px.
Header tiket mobile menyembunyikan kontrol Katalog Simpan/Batalkan yang tidak aktif dan notifikasi penyimpanan normal. Perubahan katalog yang belum disimpan, menyimpan, dan kegagalan simpan menjaga kontrol tersebut tersedia; kesalahan penyimpanan tetap terlihat. Tata letak lebih lebar mempertahankan kontrol daskboran yang ada dan presentasi ruang kerja.

Rincian tiket mengelompokkan masalah yang dilaporkan, kontak pelanggan, informasi pembelian, bukti pribadi, dan resolusi. Kartu bukti menampilkan nama file, tipe, dan ukuran; pratinjau video dimuat saat diminta. Pilihan solusi yang belum disubmit tetap tersedia saat beralih antar tiket atau filter di dalam kotak masuk. Laporan ekspor dapat dilipatgantung dan menggunakan semua tiket secara independen dari filter daftar. Menampilkan Tiket mengungkapkan centang bulk dan kontrol penghapusan, memisahkannya dari tinjauan tiket biasa.

Kotak masuk admin mendukung centang individu, memilih semua hasil pencarian, menghapus pilihan, menghapus satu tiket, dan menghapus hingga 100 tiket yang dipilih per permintaan. Perubahan pencarian menghapus pilihan. Penghapusan memerlukan konfirmasi dan berlaku segera, secara independen dari Simpan/Batal katalog. Kontrol dinonaktifkan selama penghapusan atau pembaruan status. Kegagalan parsial hanya menghapus tiket yang berhasil dihapus dan mempertahankan pilihan sisanya untuk percobaan ulang.

Penghapusan menandai tiket sebagai terhapus daripada menghapus riwayat klaim. Tiket yang terhapus dikeluarkan dari kotak masuk dan notifikasi; akses bukti pribadi ditolak. Identitas urutan/SKU mereka dan bukti pribadi tetap disimpan, sehingga aturan satu-klaim masih berlaku. Kolom `deleted_at` dari `202609150001_warranty_ticket_deletion.sql` ditambahkan ke produksi pada 15 September 2026 dengan otorisasi sekali pakai untuk kolom tersebut saja. Tidak ada migrasi lain atau penulisan migration-history yang dilakukan. Verifikasi baca-hanya mengonfirmasi bahwa API dapat membaca kolom, semua tujuh tiket yang ada tidak berubah, dan tidak ada tiket yang ditandai terhapus. Otorisasi telah habis; setiap penulisan produksi selanjutnya memerlukan otorisasi eksplisit baru. Catatan lokal menggunakan `deletedAt` dengan perilaku yang sama.

Setelah penghapusan individu atau bulk selesai, modal melaporkan keberhasilan, kegagalan, atau keberhasilan parsial dengan jumlah terhapus/permintaan dan detail kesalahan apa pun. Modal juga muncul untuk kegagalan transport tanpa mengklaim bahwa server benar-benar tidak menghapus tiket. Modal tetap terbuka hingga OK atau Escape, lalu mengembalikan fokus ke pencarian kotak masuk. Membatalkan konfirmasi awal tidak menampilkan modal hasil. Pemberitahuan inline yang ada tetap tersedia setelah pembatalan.

<a id="solutions-and-spreadsheet-export"></a>
## Solusi dan ekspor spreadsheet

Administrator memilih salah satu dari tujuh label solusi yang diminta pemilik: `Klaim Garansi`, `Kirim Barang Kurang`, `Kirim Barang Salah`, `Retur/Refund`, `Kirim sparepart`, `Refund dana sebagian`, atau `Edukasi cara pemakaian/kendala`. Label eksak ini secara eksplisit merupakan pengecualian dari salinan operator Inggris; nilai database tetap dalam bahasa Inggris. Selesai adalah satu-satunya tindakan simpan utama: ia menyimpan solusi yang dipilih dan menetapkan status tersimpan menjadi `closed`, mengonfirmasi penyelesaian. Selesai tetap tersedia tanpa solusi yang dipilih. Tidak ada tombol Simpan solusi terpisah. Setelah penyelesaian, Edit solusi mengekspos dropdown dan Selesai menyimpan koreksi sambil mempertahankan status penyelesaian. Edit solusi mengubah hanya solusi dan timestamp pembaruan, termasuk pada tiket Selesai; ia tidak membuka ulang tiket atau mengedit submisi pelanggan. Tiket terhapus tidak dapat diperbarui. Semua penulisan memerlukan sesi administrator aktif.

Migration `202609150002_warranty_ticket_solution.sql` menambahkan kolom solusi yang dapat bernilai null dengan batasan. Solusi historis tetap tidak diset; status historis dipertahankan. Pada 15 September 2026, migrasi ini diterapkan ke produksi di bawah otorisasi eksplisit untuk kolom solusi. Baca-only SQL dan pemeriksaan API aplikasi mengonfirmasi kolom teks yang dapat bernilai null dan semua enam nilai yang diperbolehkan. Ceksum mengonfirmasi bahwa semua tujuh tiket yang ada dan 19 catatan metadata bukti tidak berubah; semua solusi historis tetap null. Hanya SQL migrasi ini yang dieksekusi; tidak ada migrasi lain atau pembaruan riwayat migrasi yang diterapkan. Catatan verifikasi disimpan secara lokal di `.data/warranty-solution-migration/`.

Migration `202609160002_warranty_usage_guidance_solution.sql` memperluas batasan solusi yang ada dengan nilai tersimpan bahasa Inggris `usage_guidance`. Dropdown admin, solusi yang disimpan, dan ekspor spreadsheet menampilkan label pemilik-peminta persis `Edukasi cara pemakaian/kendala`. Semua enam nilai sebelumnya, solusi null, status tiket, dan catatan historis tetap tidak berubah. Migrasi penambah ini disiapkan secara lokal dan belum diterapkan ke produksi; terapkan sebelum menyimpan opsi baru dalam deploymen yang didukung Supabase. Pemeriksaan baca-only dari database Supabase yang dikonfigurasi mengonfirmasi nama batasan yang diharapkan dan enam nilai yang ada; tidak ada skema produksi atau data tiket yang diubah.

Inbox mengekspor CSV UTF-8 kompatibel dengan Excel dan Google Sheets melalui endpoint `/admin/warranty-tickets/export?start=YYYY-MM-DD&end=YYYY-MM-DD` yang dilindungi. Administrator memilih tanggal mulai dan akhir, awalnya mencakup dari yang paling awal hingga hari ini di Asia/Jakarta. Tanggal paling awal mengikuti pengiriman pertama yang tersedia; kedua input tanggal hanya mengizinkan tanggal dari hari itu hingga hari ini, secara independen dari pencarian atau pemilihan inbox. Batas hari saat ini diperbarui sementara panel terbuka dan ketika menjadi terlihat lagi. Tanpa data, ekspor dinonaktifkan. Server memvalidasi tanggal asli dan menolak rentang terbalik dan tanggal akhir masa depan. Laporan mencakup kedua hari yang dipilih: tengah malam pada hari pertama hingga, tetapi tidak termasuk, tengah malam setelah hari terakhir di Asia/Jakarta. Ekspor mencakup semua tiket aktif terlepas dari status, pencarian inbox, atau pemilihan kotak centang; tiket yang dihapus dan URL bukti pribadi dikeluarkan. Baca database dibagikan halaman. Kolom dimulai dengan tanggal, nama, telepon, nomor pesanan/pelacakan, masalah, produk, status, dan solusi, diikuti oleh nomor tiket, SKU, email, toko, tanggal pembelian, harga, dan waktu diperbarui. Rentang tanggal kosong mengekspor header dengan pesan hasil kosong eksplisit. Kesalahan ekspor dan sesi kadaluarsa tetap terlihat di inbox. Nilai pelanggan seperti rumus diekapsi. Impor kolom telepon dan pesanan sebagai teks untuk mempertahankan nol depan dan ID panjang.

Formulir klaim menggunakan label persis `order number/No.Resi/No Pesanan` pemilik pada kedua bahasa antarmuka. Kolom ini mempertahankan kunci yang ada dan aturan identitas klaim.

<a id="submission-performance-verification-on-september-16-2026"></a>
## Verifikasi kinerja pengiriman pada 16 September 2026

Verifikasi lokal lulus lint, typecheck, build produksi, dan 160 tes Node; empat tes SQL opsional dilewati karena runtime tes tidak dikonfigurasi. Penutup regresi mencakup batas waktu upload/pemrosesan, kegagalan transport, batas multipart browser sensitif huruf besar-kecil, batas badan stream, pemeriksaan asal, permintaan provider terbatas, unggahan konkuren, dan pembersihan kegagalan.

Chromium melakukan uji coba build produksi terhadap simulasi Supabase yang hanya menerima loopback. Sebuah file MP4 sintetis berukuran 46,4 MiB melewati decoder penuh yang ada dan menyelesaikan semua unggah bukti enam sebelum konfirmasi. Penundaan jaringan browser memverifikasi persentase unggah parsial dan tahap pemrosesan terpisah. File sintetis ini menggunakan rekaman valid pendek ditambah kotak bebas MP4 untuk menguji ukuran transport; tidak mereproduksi rekaman, durasi, atau biaya decoding pelanggan. Pemeriksaan mobile dan desktop mencakup fokus kesalahan, pelestarian semua bidang dan file terpilih, kesalahan bidang video, serta tidak ada tumpahan horizontal atau kesalahan JavaScript halaman.

Pemeriksaan baca-tulis saja terpisah mencapai database Supabase yang dikonfigurasi dan membatasi bakit bukti pribadi sebesar 50 MiB. Semua tulis sintetis tetap berada dalam simulasi lokal; tidak ada catatan pelanggan atau objek Penyimpanan produksi yang diubah. Bukti disimpan secara lokal di bawah `.data/warranty-speed/`. Pemilik kemudian mengizinkan mendorong perubahan ini ke GitHub dan menyalurkannya ke Hostinger. Lihat [catatan rilis](../operations/deployment.md#warranty-submission-performance-release-on-september-16-2026) untuk cakupan verifikasi produksi.

<a id="compression-and-usage-guidance-verification-on-september-16-2026"></a>
## Verifikasi kompresi dan panduan penggunaan pada 16 September 2026

Lint, pengecekan tipe, build produksi, dan semua 197 uji coba Node lulus, termasuk migrasi solusi baru yang dilakukan dalam PGlite PostgreSQL terisolasi. Chromium memverifikasi sembilan alur browser lokal, termasuk kompresi, unggah multipart aktual ke rute build-produksi, decoding server penuh, simulasi penyimpanan pribadi, sukses sebelum navigasi WhatsApp, kegagalan retensi, lompat, pembatalan seleksi kadaluarsa, validasi 50 MB, kedua bahasa, dan fallback browser tidak didukung. WebKit juga mengompresi sumber yang sama dan memungkinkan pengiriman tanpa kesalahan JavaScript.

Rekaman sintetis 1080p delapan detik dengan nada terdengar berukuran 22.196.824 byte sebelum kompresi dan sekitar 1,3 MB setelah kompresi Chromium (1280 x 720, dengan audio AAC dipertahankan). Persiapan memakan waktu sekitar satu detik pada komputer uji coba. Pada koneksi unggah simulasi 256 KiB/s, pengiriman dan konfirmasi server/penyimpanan lokal memakan waktu sekitar 7,4 detik. Ini adalah pengukuran lokal, bukan jaminan kecepatan produksi atau telepon. File terpisah yang dipadatkan 46,4 MiB memverifikasi kompatibilitas dengan ukuran unggah yang dilaporkan semula.

Admin browser menyimpan dan me-reload `usage_guidance` serta mengekspor label persisnya terhadap simulasi layanan lokal. Uji coba SQL memverifikasi secara terpisah migrasi kendala nyata dan pelestarian nilai, status, dan baris yang ada. Semua klaim sintetis dan tulis admin tetap berada di lokal; navigasi WhatsApp ditahan tanpa mengirim pesan. Laporan dan tangkapan layar disimpan di bawah `.data/warranty-compression/`. Pemilik mengizinkan mendorong perubahan yang diverifikasi ke GitHub setelah verifikasi lokal. Migrasi solusi produksi masih tertunda, dan penyaluran harus diverifikasi secara terpisah dari dorongan GitHub.

<a id="single-click-submission-and-direct-preview-verification-on-september-16-2026"></a>
## Verifikasi pengiriman satu-klik dan pratinjau langsung pada 16 September 2026

Pemilik melaporkan bahwa ia mengklik Submit saat persiapan video masih aktif dan perlu mengklik lagi setelahnya. Sekarang pengiriman menunggu tugas persiapan yang sama tersebut dan melanjutkan secara otomatis. Pemeriksaan Chromium lokal mengonfirmasi tepat satu permintaan multipart bahkan setelah peristiwa submit tambahan, menampung salinan upload yang dikompresi, dan mencapai WhatsApp hanya setelah validasi/server menyimpan berhasil. Kegagalan jaringan mempertahankan pilihan asli dan semua detail formulir. Menavigasi menjauh selama persiapan mencegah pengiriman klaim manapun.

Pemeriksaan browser produksi juga mencakup pratinjau MP4 langsung, pencarian (seeking), penutupan, konversi AVI usang, kesalahan sesi kadaluarsa tanpa konversi, dan tata letak mobile. Rekam lokal 21 MB mencapai pratinjau native sebelum transfer penuh; waktu-waktu lokal ini tidak menetapkan kecepatan produksi. WebKit memuat metadata tanpa spinner yang bertahan lama dan memainkan MP4 yang sama setelah Play. Pemeriksaan loopback HTTP-only-nya menggunakan sesi berumur pendek yang ditandatangani dengan rahasia simulasi lokal; pengaturan cookie aman produksi tidak diubah.

Lint, pengecekan tipe, build produksi, dan semua 206 uji Node telah lulus. Regresi streaming baru melatih SDK Supabase terpasang, rentang (ranges), HEAD, akses tiket dihapus, kegagalan upstream, jumlah byte terbatas, dan pembatalan sebelum header dan selama transfer. Pemeriksaan baca-tulis saja melalui aplikasi lokal terhadap Supabase yang dikonfigurasi mengembalikan 401 anonim, HEAD 200 otentikasi tanpa badan, dan 206 Range dengan tepat dua byte. Penyimpanan privat dan ketiadaan redirect telah diverifikasi. Tidak ada catatan pelanggan atau objek Storage yang ditulis. Tulis browser sintetik tetap dalam simulasi loopback dan navigasi WhatsApp ditahan tanpa mengirim pesan. Laporan berada di bawah `.data/warranty-preview/` dan `.data/warranty-preview-speed/`. Perbaikan ini belum dipush atau dideploy.

<a id="restored-status-controls"></a>
## Kontrol status dipulihkan

Detail tiket mengekspos dropdown **Ticket status** simpan-segera dengan New, Under review, Approved, Rejected, dan Closed. Label yang sama muncul pada badge tiket, notifikasi, dan ekspor CSV. Filter All/Pending/Done yang ada tetap menjadi kelompok penyelesaian: Pending berisi setiap status selain tertutup, dan Done berisi Closed.

Mengubah status mempertahankan solusi yang disimpan dan pilihan solusi yang belum disimpan, termasuk saat membuka kembali tiket tertutup. Aksi Done dari Penyelesaian masih menyimpan solusi yang dipilih dan menutup klaim. Kontrol status dinonaktifkan selama mutasi tiket, menampilkan umpan balik sukses atau kesalahan, dan mempertahankan nilai sebelumnya yang disimpan jika permintaan gagal. Pembaruan status memerlukan administrator yang terautentikasi dan validasi sisi server; tidak diperlukan migrasi database.
