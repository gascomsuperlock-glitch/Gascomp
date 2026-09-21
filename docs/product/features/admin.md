<a id="admin-panel"></a>
# Panel Admin

[Indeks Spesifikasi](../spec.md)

<a id="content-management"></a>
## Manajemen Konten

Workspace terpisah **GascompCare** mengelola akun anggota pelanggan dan pratinjau kartu virtual. Lihat [GascompCare](gascomp-care.md) untuk pembuatan akun, penggantian kata sandi, persistensi instan, dan integrasi pembelian tertunda.

Tim Gascomp dapat membuat, melihat, memperbarui, mengarsipkan, dan menghapus konten produk. Alur kerjanya adalah draf → tinjauan → publikasi. Draf bersifat pribadi; produk yang dipublikasikan muncul dalam katalog publik. Produk yang pernah dipublikasikan harus diarsipkan agar URL QR cetak tetap valid. Penghapusan permanen ditujukan untuk draf atau entri yang salah.

Satu peran administrator sudah cukup untuk rilis awal. `/admin` dilindungi di server dan mengarahkan pengunjung tanpa sesi yang valid ke `/admin/login`. Kredensial berasal dari variabel lingkungan; cookie HTTP yang ditandatangani kadaluarsa setelah delapan jam.

Header halaman depan publik mencakup tautan **Admin login** pada desktop dan mobile. Tautan tersebut membuka `/admin/login`; administrator dengan sesi yang valid diarahkan ke `/admin` oleh rute login yang ada.

| Objek | Operasi yang didukung |
| --- | --- |
| Produk | Kelola SKU, nama, model, deskripsi, status, dan metadata sumber |
| Variasi | Tambah, edit, dan hapus nama dan SKU per produk |
| Gambar | Unggah, pratinjau, ganti, hubungkan ke variasi, tetapkan utama, dan hapus |
| Tutorial | Kelola dan urutkan tautan YouTube, Google Drive, TikTok, video langsung, unggah file, thumbnail yang dipilih administrator, judul, deskripsi, dan durasi |
| Panduan Masalah | Tambah, edit, urutkan, dan hapus judul masalah, ringkasan, langkah pemecahan masalah berurutan, dan peringatan keselamatan opsional |
| FAQ | Tambah, edit, urutkan, dan hapus pertanyaan dan jawaban |
| Pengaturan | Kelola tujuan WhatsApp dan jam dukungan |
| Pusat Layanan | Tambah, edit, aktifkan, nonaktifkan, dan hapus lokasi Indonesia; lihat [support](support.md) |
| Tiket Garansi | Tinjau pengajuan pribadi dan perbarui status |

Gambar menerima JPG, PNG, atau WebP hingga 8 MB masing-masing dan enam gambar per produk. Browser mengompresnya menjadi WebP sebelum unggah. Gambar yang dikelola administrator dan konten dipertahankan ketika data Duoke atau gudang diimpor kembali.

Dalam mode Supabase, penyimpanan lebih dahulu meminta izin unggah untuk satu jalur dari endpoint terlindungi `POST /admin/images/upload`, lalu mengirim setiap foto baru langsung ke Storage. Hanya URL dan jalur Storage hasil unggah yang masuk ke JSON penyimpanan katalog, sehingga badan permintaan base64 berukuran besar tidak melewati host aplikasi. Otorisasi menerima ID produk/gambar baru yang aman tanpa membuat baris database, memerlukan sesi admin dan asal permintaan tepercaya, serta membatasi badan JSON hingga 4 KB. Kegagalan transfer gambar menghentikan proses sebelum persistensi katalog dan mempertahankan edit. Unggahan yang selesai digunakan kembali saat percobaan ulang di tab yang sama; perubahan byte gambar memerlukan unggahan baru. Server masih menerima gambar inline dari tab lama. Unggahan tanpa rujukan dapat tersisa setelah **Cancel**.

Header dashboard menyediakan tombol **Save** yang terlihat. Edit tetap dalam tahap di formulir admin dan tidak mempengaruhi situs web pelanggan hingga administrator memilih Simpan. Tombol tersebut kemudian mempersistensi konten produk dan pengaturan saat ini serta melaporkan penyimpanan, sukses, atau kegagalan. Tidak ada penyimpanan konten otomatis.

Daftar produk **Manage content** mendukung publikasi massal dan pengarsipan. Administrator dapat menggunakan **Publish all** atau **Archive all**, cari berdasarkan nama/model/SKU untuk bertindak pada semua hasil yang cocok, atau pilih produk individu dengan kotak centang. Kotak centang pilih-semua memilih hasil saat ini dan menampilkan keadaan campuran untuk seleksi parsial. Mengubah pencarian menghapus seleksi; membuka editor tidak mengubahnya. Dengan seleksi, aksi berlaku hanya pada produk yang dipilih; jika tidak, mereka berlaku pada seluruh himpunan hasil yang terlihat. Jumlah tombol menunjukkan produk yang statusnya akan berubah. Hasil kosong dan aksi tanpa produk yang layak dinonaktifkan, dan kontrol massal dinonaktifkan saat menyimpan.

Pengarsipan massal melewati produk yang belum pernah diterbitkan serta mempertahankan slug dan tujuan QR yang ada. Penerbitan massal dapat memulihkan produk yang diarsipkan. Kedua tindakan ini hanya menyiapkan perubahan status, mempertahankan konten produk lainnya, dan melaporkan jumlah yang berubah sambil mengingatkan administrator untuk memilih **Save**. Alur penyimpanan yang ada menangani persistensi dan mempertahankan edit yang disiapkan jika penyimpanan gagal.

**Save** menggunakan endpoint JSON stabil `POST /admin/content`, yang memverifikasi asal permintaan dan sesi admin sebelum membaca hingga 40 MB dan menjalankan persistensi katalog. Permintaan browser tidak bergantung pada pengenal Server Action khusus build. Jika penyimpanan gagal, edit tetap ada di tab saat ini; pesan galat membedakan sesi kedaluwarsa, asal permintaan yang ditolak, deployment yang tidak tersedia, unggahan terlalu besar, dan batas waktu hosting. Respons yang hilang tidak membuktikan bahwa server gagal menyimpan. Setelah kegagalan transportasi, gateway, atau respons tidak valid, klien melakukan satu pemeriksaan database baca saja yang terautentikasi dan tidak memakai cache, dengan batas sepuluh detik. Status **Saved** hanya ditampilkan jika seluruh konten yang dikirim cocok dengan katalog tersimpan, termasuk pengaturan dan urutan konten bantuan. Pemeriksaan ini tidak mengulang penulisan dan tidak memakai data fallback lokal. Produk hilang, penyimpanan parsial, byte unggahan gambar tertunda yang tidak dapat diverifikasi, atau pembacaan ulang yang tidak tersedia mempertahankan edit dan menampilkan ketidakpastian. Diagnosis harus mencocokkan ID/SKU produk yang dilaporkan pemilik; keberhasilan produk lain tidak membuktikan permintaan yang gagal telah tersimpan.

Editor mengirim hanya produk baru atau berubah, ID produk yang dihapus secara eksplisit, dan pengaturan yang berubah sejak **Save** terakhir yang berhasil. Server menggabungkan perubahan itu dengan katalog tersimpan dan hanya menulis baris yang berubah. Pembacaan katalog dan kemampuan skema video opsional disatukan dalam satu snapshot database. Menambahkan produk baru tanpa konten bantuan memerlukan satu upsert produk, tanpa menghapus catatan anak atau menulis ulang produk lain. Aturan penghapusan dan pengarsipan yang ada serta alur **Save**/**Cancel** eksplisit tetap berlaku. Pembersihan Storage terbatas pada produk yang diganti atau dihapus permanen; pengarsipan mempertahankan gambar dan thumbnail tutorialnya.

Respons penyimpanan memakai panjang byte UTF-8 eksplisit dan menonaktifkan transformasi perantara agar proxy HTTP/2 Hostinger tidak perlu mengompresi ulang konfirmasi katalog. Log server memberi ID permintaan opak untuk tiap upaya, mencatat kedatangan sebelum pemrosesan sesi/badan permintaan, lalu status, durasi, ukuran permintaan, dan jumlah produk pada akhir proses. Nilai katalog dan kredensial tidak dicatat.

Dashboard dapat mengunduh satu kode QR per produk ketika `GASCOMP_PUBLIC_BASE_URL` dikonfigurasi dengan origin HTTPS produksi. Dashboard juga menyediakan tindakan Klaim Garansi, Gascomp Care, dan Pusat Layanan sesuai konteks produk dan SKU saat ini.

Ruang kerja **Service Centers** yang terpisah menggunakan tindakan **Save location** eksplisit untuk setiap lokasi. Edit dan persistensinya tidak bergantung pada **Save**/**Cancel** katalog. Lihat [administrasi Pusat Layanan](support.md#service-center-administration) untuk kolom wajib, pemilihan peta, dan visibilitas.

<a id="help-content-workspace"></a>
## Ruang kerja konten bantuan

Pemilih produk dan editor menggunakan tata letak daftar dan detail pada layar lebar (1280 px ke atas). Daftar produk tetap tersedia di samping editor, dengan area gulirnya sendiri yang dibatasi. Baris produk menampilkan nama yang terbaca, SKU, lencana status, dan keadaan aktif yang jelas.

Pada layar yang lebih kecil, ruang kerja menampilkan satu panel pada satu waktu. Memilih atau menambahkan produk langsung membuka editor dan memindahkan fokus ke judulnya. **Back to Products** mengembalikan fokus ke produk aktif dalam daftar, atau ke pencarian jika produk tersebut tidak ada dalam hasil saat ini. Teks pencarian, pilihan massal, bagian editor saat ini, dan edit produk yang belum disimpan tetap terjaga saat berpindah panel. Penambahan produk membuka bagian Information; pintasan dari ringkasan membuka bagian yang diminta.

Pemilih bawaan mengutamakan pencarian dan pembukaan panduan. **Bulk Actions** menampilkan kotak centang serta kontrol penerbitan dan pengarsipan; **Done Selecting** menutupnya dan menghapus pilihan. Perubahan pencarian juga menghapus pilihan. Membuka produk tidak mengubah pilihan massal. Cakupan tindakan massal, kelayakan, jumlah, dan aturan penyimpanan bertahap yang ada tetap berlaku.

Header editor menampilkan nama produk lengkap, SKU, model, status publikasi, dan tautan **Open Guide** untuk produk yang diterbitkan atau diarsipkan. Status copy mengingatkan administrator bahwa perubahan memerlukan Simpan. Informasi, Gambar, Video, Masalah, FAQ, dan Produk QR dikelompokkan terpisah dari tindakan dukungan pelanggan. Jumlah gambar, video, panduan masalah, dan FAQ muncul di samping label bagian mereka. Pada ponsel sempit, pemilih **Editor Section** yang dilabeli mengekspos setiap bagian tanpa gulir horizontal.

Pada ponsel di bawah 640 px, Konten Bantuan menggunakan jarak lebih rapat di sekitar notifikasi penyimpanan, header editor, kontrol publikasi, dan formulir. Simpan dan Batal tetap tersedia di header dashboard. Nama produk menempati hingga dua baris dalam pemilih; editor mempertahankan nama lengkap. Pemilih bagian dan bidang formulir editor menggunakan teks 16 px. Bidang FAQ merentang kartu mereka di bawah nomor dan kontrol hapus. Input langkah troubleshooting merentang baris mereka di bawah nomor dan tombol tindakan, meninggalkan cukup ruang untuk membaca dan mengedit teks.

Bagian **Issues** menjelaskan bahwa setiap panduan masalah mewakili satu gejala pelanggan yang ditampilkan di bawah **What is happening?** pada halaman produk publik. Administrator menyediakan judul, penjelasan singkat, langkah troubleshooting berurutan, dan peringatan keamanan opsional. Panduan masalah dan langkah individu dapat diurutkan ulang atau dihapus. Semua edit tetap dalam tahap hingga Simpan.

<a id="overview-workspace"></a>
## Ruang kerja Ringkasan

Ringkasan dimulai dengan tindakan **Manage Products** dan **Add Product** yang jelas, diikuti oleh kartu ringkasan untuk produk diterbitkan, video tutorial, jawaban FAQ, dan tiket garansi terbuka. Jumlah menggunakan format angka peka lokasi dan tetap informatif daripada bertindak sebagai target navigasi ambigu.

**Product Library** mendukung pencarian berdasarkan nama, model, atau SKU dan memfilter untuk semua, Produk Diterbitkan, Rancangan, dan Produk Diarsipkan. Setiap kartu produk menyajikan identitas produk, status, dan jumlah gambar/video/FAQ sebelum menawarkan tindakan **Edit Guide** dan **QR Tools** yang eksplisit. Memilih salah satu tindakan membuka bagian editor konten bantuan yang sesuai dan memindahkan fokus ke judul produk yang dipilih. **Manage Products** membuka pemilih produk konten bantuan tanpa memilih produk pertama secara implisit.

Perpustakaan merender delapan produk yang cocok pada awalnya dan menambahkan delapan kali melalui **Show More Products**. Pencarian atau perubahan status mereset grup yang terlihat. Katalog kosong dan keadaan tidak ada hasil menyediakan tindakan pemulihan langsung. Semua kontrol mempertahankan fokus keyboard yang terlihat, dan tata letak menumpik tanpa tumpah halaman horizontal pada layar kecil.

<a id="tutorial-order"></a>
## Urutan Tutorial

Tab Video termasuk daftar **Video Order** yang ringkas dan bernomor di atas editor video. Administrator dapat menarik pegangan ke baris lain untuk memindahkan video tersebut ke posisi target. Tombol atas/bawah menyediakan alternatif sentuhan dan keyboard; pegangan fokus juga mendukung tombol panah Atas dan Bawah. Posisi pertama dan terakhir menonaktifkan perpindahan yang tidak tersedia. Pengumuman langsung mengonfirmasi posisi baru dan mengingatkan administrator untuk memilih **Save**.

Pengurutan berlaku untuk file yang diunggah dan tutorial yang terhubung. Nomor daftar dan nomor editor mengikuti urutan array saat ini segera. ID Video, URL file, jalur penyimpanan, metadata, edit dalam tahap, dan komponen unggah aktif mempertahankan identitas mereka. Menjatuhkan di luar daftar atau membatalkan tarik meninggalkan urutan tidak berubah. Pengurutan dinonaktifkan saat menyimpan.

Ubah menggunakan alur kerja staged-save yang ada: Simpan mempertahankan urutan array sebagai nilai tutorial `position` berturut-turut (atau sebagai urutan array dalam penyimpanan lokal). Editor yang dimuat ulang dan panduan produk publik menggunakan urutan yang disimpan. Tidak diperlukan migrasi database atau pengunggahan ulang file.

<a id="uploaded-video-thumbnails"></a>
## Thumbnail video yang diunggah

Memilih file MP4/WebM menyiapkan empat pilihan frame lokal sebelum pengunggahan. Administrator memilih satu thumbnail dan secara eksplisit memulai pengunggahan; editor produk hanya diperbarui setelah thumbnail WebP, JPEG, atau PNG yang dihasilkan oleh browser yang dipilih dan video mencapai penyimpanan. Tutorial yang sudah diunggah menyediakan aksi **Choose another thumbnail** yang membaca frame dari video yang disimpan dan mengubah hanya thumbnailnya.

Perubahan thumbnail tetap dalam tahap hingga Simpan. Gambar yang dipilih terlihat dalam pratinjau editor video dan daftar Urutan Video, kemudian muncul dalam daftar tutorial pelanggan dan sebagai poster pemain asli setelah Simpan. Titik akhir pengunggahan thumbnail memeriksa asal permintaan, sesi administrator, identitas produk yang disimpan, tipe dan ukuran file, serta kolom thumbnail database sebelum mengeluarkan unggahan penyimpanan tanda tangan satu jalur.

<a id="dashboard-design"></a>
## Desain Dashboard

Panel menyesuaikan komponen **Dashboard with Collapsible Sidebar** oleh **uniquesonu** dari [21st.dev](https://21st.dev/community/components?q=panel+admin&preview=%2F%40uniquesonu%2Fcomponents%2Fdashboard-with-collapsible-sidebar).

- Pertahankan navigasi yang dapat dilipat, header dashboard, kartu statistik, bagian produk, dan perilaku responsif.
- Gunakan konvensi Tailwind CSS, TypeScript, shadcn, dan ikon `lucide-react`.
- Pertahankan aturan merek Gascomp yang ditujukan untuk pelanggan terpisah dari referensi dashboard administrator.
- Data operasional menggantikan data referensi/demo; komponen referensi tidak mendefinisikan persyaratan bisnis baru.

Status: alur administrator yang dilindungi, dashboard fitur, editor produk/konten, manajemen gambar, QR, pengaturan, dan tinjauan tiket garansi telah diimplementasikan. Supabase digunakan saat dikonfigurasi; cadangan lokal tetap tersedia untuk pengembangan.

Tombol **Cancel** pada header mengembalikan semua edit produk dan pengaturan ke Simpan terakhir yang berhasil (atau konten awal yang dimuat). Ini menghapus kesalahan simpan dan keadaan tidak disimpan tanpa menulis ke database. Batal dinonaktifkan saat menyimpan dan ketika tidak ada perubahan dalam tahap. File yang diunggah dapat tetap tidak teracu setelah pembatalan.
