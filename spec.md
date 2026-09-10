# Spesifikasi Website Bantuan Gascomp

Status: versi awal telah diimplementasikan dan sudah terhubung ke Supabase untuk katalog, gambar, serta tiket klaim. Prioritas tahap berikutnya adalah mengambil katalog Duoke melalui sesi resmi agar data SKU, variasi, detail produk, dan catatan Obsidian dapat diisi dari sumber; lihat bagian 17.

## 1. Latar belakang

Pelanggan yang sudah membeli produk Gascomp membutuhkan panduan penggunaan, video tutorial, dan jawaban atas kendala yang sering dialami. Sebelumnya, video tutorial tidak dapat dikirim melalui marketplace yang digunakan tim.

Menurut tim Gascomp, tingkat retur tinggi karena pelanggan belum memahami cara menggunakan produk. Barang yang dikembalikan telah diperiksa dan ternyata berfungsi normal. Website ini akan menyediakan bantuan yang mudah ditemukan melalui scan kode QR pada produk atau kemasan.

## 2. Tujuan dan target pengguna

- Membantu pelanggan menggunakan produk dengan benar setelah pembelian.
- Mengurangi retur akibat kebingungan penggunaan.
- Memudahkan pelanggan menemukan tutorial dan FAQ sesuai model produk.
- Menyediakan akses chat admin ketika panduan belum menyelesaikan masalah.
- Memungkinkan tim Gascomp mengelola konten sendiri melalui halaman admin.

Target pengguna utama adalah pelanggan yang sudah membeli produk Gascomp. Pengguna halaman admin adalah tim Gascomp yang mengelola konten bantuan.

Website menggunakan Bahasa Indonesia saja pada versi awal.

## 3. Cakupan awal

Daftar produk bersifat dinamis dan dapat bertambah sesuai kebutuhan. Admin dapat menambahkan SKU beserta konten bantuannya melalui halaman admin tanpa perubahan kode. Jumlah SKU tidak ditetapkan sebagai batas tetap dalam spesifikasi. Pengisian awal dapat diprioritaskan pada produk yang paling sering mengalami kendala.

Kebutuhan yang telah disepakati:

- Halaman bantuan sesuai SKU produk.
- Pengelolaan daftar SKU secara dinamis melalui halaman admin, termasuk menambahkan dan memperbarui produk.
- Video tutorial dari tautan YouTube yang ditonton langsung di website.
- FAQ dan bantuan untuk kendala penggunaan.
- Chat langsung ke admin melalui WhatsApp.
- Halaman admin untuk menambahkan video dan mengubah FAQ sendiri.

Setiap SKU memiliki halaman bantuan dan panduannya masing-masing. SKU tercantum pada nomor produk yang dibeli pelanggan. Identitas SKU menjadi acuan pencarian, pengelolaan konten, dan tujuan QR.

Setiap SKU menggunakan QR berbeda. Satu QR dapat digunakan pada seluruh unit dengan SKU yang sama; tidak diperlukan QR unik per unit berdasarkan kebutuhan saat ini.

## 4. Alur pelanggan

### Melalui URL utama

1. Pelanggan membuka URL utama dan melihat halaman daftar produk.
2. Pelanggan mencari produk menggunakan SKU yang tercantum pada nomor produk yang dibeli.
3. Pelanggan memilih produk yang sesuai dan menekan tombol tutorial.
4. Website membuka halaman bantuan khusus SKU tersebut, berisi video tutorial, FAQ, dan kendala yang sering ditanyakan.
5. Jika masalah belum selesai, pelanggan menghubungi admin melalui WhatsApp.

### Melalui QR

1. Pelanggan scan QR pada produk atau kemasan.
2. Website langsung membuka halaman bantuan SKU terkait tanpa perlu mencari produk lagi.
3. Pelanggan memastikan foto, nama, dan SKU sesuai dengan produk yang dibeli.
4. Pelanggan menonton tutorial atau membaca bantuan kendala dan FAQ, lalu menghubungi admin melalui WhatsApp bila masih membutuhkan bantuan.

Usulan akses: pelanggan tidak perlu login. Daftar produk menampilkan foto untuk memudahkan pengenalan produk.

Pencarian di pusat bantuan menggunakan SKU. Pencarian berdasarkan nama produk tidak termasuk cakupan saat ini. Nama produk yang ditampilkan pada daftar dan halaman bantuan harus sesuai dengan produk pada SKU terkait.

### Ketika bantuan belum tersedia

- Jika pencarian SKU tidak menemukan produk, tampilkan keterangan yang jelas, arahan untuk memeriksa kembali nomor produk, dan tombol WhatsApp.
- Jika tutorial produk belum lengkap atau belum tersedia, tampilkan keterangan tersebut dan tombol WhatsApp agar pelanggan tetap dapat memperoleh bantuan.

## 5. Halaman bantuan produk

Susunan halaman yang diusulkan:

| Bagian | Isi |
| --- | --- |
| Identitas produk | Foto, nama produk, dan SKU |
| Pilihan utama | “Lihat cara penggunaan” dan “Saya mengalami kendala” |
| Tutorial penggunaan | Video penggunaan pertama kali dan langkah teks singkat |
| Bantuan berdasarkan kendala | Masalah dan panduan yang relevan dengan model tersebut |
| FAQ | Pertanyaan yang sering diterima admin beserta jawabannya |
| Bantuan/chat admin | Tombol Klaim Garansi, Gascomp Care, dan Service Center sesuai bagian 9 |

Bahasa pertanyaan menggunakan istilah yang mudah dikenali pelanggan. Konten disesuaikan dengan setiap model karena fitur dan cara penggunaannya dapat berbeda.

### Kendala prioritas

| Kendala | Konten yang perlu disiapkan |
| --- | --- |
| Produk tidak menyala | Panduan pengecekan sesuai model |
| Api terlalu kecil atau terlalu besar | Penjelasan fungsi, lokasi, dan penggunaan adjuster pada model yang memilikinya |
| Regulator tidak bisa mengunci | Panduan pemasangan sesuai jenis regulator dan arahan menghubungi admin bila diperlukan |

Langkah teknis harus mengikuti panduan yang telah diverifikasi tim Gascomp. Panduan perlu menjelaskan pengecekan yang aman dilakukan pelanggan dan kondisi ketika pelanggan harus berhenti mencoba serta menghubungi tim.

## 6. Video tutorial

- Video sudah tersedia dan akan diunggah ke YouTube oleh tim.
- Admin memasukkan tautan YouTube secara manual untuk masing-masing SKU; tidak diperlukan unggah file video langsung ke website.
- Satu produk/SKU dapat memiliki beberapa video tutorial.
- Video ditampilkan menggunakan pemutar YouTube yang disematkan (embed).
- Pelanggan dapat menonton langsung di halaman Gascomp; alur utama tidak mengarahkan pelanggan keluar ke YouTube untuk menonton.
- Pemutar tetap milik YouTube. Penghilangan seluruh branding atau tautan menuju YouTube bukan persyaratan yang dapat dijamin.
- Pratinjau sebelum publikasi membantu admin memeriksa video yang dipilih.

## 7. Halaman admin

Desain panel admin menggunakan komponen **Dashboard with Collapsible Sidebar** dari 21st.dev yang dilampirkan pengguna. Ketentuan integrasi terdapat pada bagian 16.

Kebutuhan yang disepakati adalah kemampuan tim menambahkan video dan mengubah FAQ sendiri, serta menyimpan konten sebagai draft, melihat pratinjau, dan menerbitkannya ketika siap.

Alur pengelolaan konten: admin menyiapkan draft, memeriksa pratinjau, lalu melakukan publikasi agar konten tampil kepada pelanggan. Draft tidak ditampilkan kepada pelanggan.

Halaman admin dikelola oleh satu orang pada versi awal. Pembagian peran antaranggota tim tidak diperlukan untuk cakupan ini.

Panel admin wajib menyediakan CRUD (tambah, lihat, ubah, dan hapus) untuk produk dan gambar produk. Produk baru yang telah dipublikasikan tersedia di daftar produk dan pencarian SKU.

### CRUD produk dan gambar yang disepakati

| Objek | Tambah | Lihat | Ubah | Hapus |
| --- | --- | --- | --- | --- |
| Produk | Membuat produk beserta SKU, nama, detail, dan variasinya | Melihat daftar dan detail produk beserta variasi | Memperbarui SKU, nama, detail, variasi, dan status draft/publikasi | Menghapus produk yang tidak diperlukan |
| Gambar produk | Mengunggah gambar dan mengaitkannya dengan produk/SKU terkait | Melihat daftar gambar dan pratinjau | Mengganti gambar dan memperbarui keterkaitannya dengan produk atau variasi | Menghapus gambar yang tidak digunakan |

- Pengelolaan produk berlaku untuk produk yang dibuat manual maupun hasil impor Duoke.
- Perubahan identitas atau gambar produk tidak mengubah URL bantuan dan QR yang sudah ada.
- Fitur hapus produk harus tetap memenuhi ketentuan retensi panduan pada bagian 8. Usulan teknis: arsipkan produk yang panduannya sudah digunakan pelanggan; penghapusan permanen ditujukan untuk draft atau entri keliru yang belum digunakan.
- Gambar yang dihapus atau diganti tidak meninggalkan referensi gambar rusak pada halaman pelanggan.
- Gambar produk menerima JPG, PNG, dan WebP hingga 8 MB per file, maksimal enam gambar per produk. Gambar dikompres ke WebP di browser, kemudian diunggah ke Supabase Storage ketika backend aktif. `localStorage` hanya digunakan oleh fallback pengembangan. Impor ulang Duoke tidak menimpa gambar yang dikelola admin.
- CRUD produk dan gambar menjadi kebutuhan fungsional pada desain panel admin yang telah dipilih di bagian 16.

Status: CRUD produk dan gambar telah diterapkan dan menggunakan Supabase saat backend dikonfigurasi. Admin dapat membuat, melihat, memperbarui, mengarsipkan, dan menghapus draft produk; mengelola variasi; serta mengunggah, melihat pratinjau, mengganti, mengaitkan ke variasi, menentukan gambar utama, dan menghapus gambar. Produk arsip tidak tampil di katalog, tetapi URL bantuan dan QR-nya tetap aktif.


Admin juga dapat mengunduh QR untuk setiap SKU langsung dari halaman admin agar dapat dicetak pada produk atau kemasan.

Setelah tab **QR produk**, panel admin menyediakan akses layanan per produk melalui tiga kartu: **Klaim Garansi**, **Gascomp Care**, dan **Service Center**. Setiap kartu menampilkan konteks produk/SKU serta tombol **Ajukan tiket**. Klaim Garansi membuka halaman internal `/klaim-garansi`; Gascomp Care dan Service Center tetap membuka kanal kontak Gascomp.

Halaman `/klaim-garansi` memiliki formulir khusus yang menerima nama, email, nomor WhatsApp, produk, SKU, toko, tanggal pembelian, nomor pesanan, harga pembelian, penjelasan kendala, invoice, satu sampai empat foto, dan video kendala. Pelanggan menerima nomor tiket berformat `GWC-YYYYMMDD-XXXXXX`. Invoice dan setiap foto maksimal 4 MB; video menerima MP4, WebM, atau MOV maksimal 12 MB. Jika Supabase tersedia, tiket masuk ke database dan bukti masuk ke bucket privat. Mode lokal `.data/warranty-tickets/` tetap tersedia untuk pengembangan tanpa konfigurasi backend dan tidak dimasukkan ke Git.

Rincian fitur pendukung berikut merupakan usulan cakupan versi awal dan perlu dipastikan saat finalisasi:

| Fitur | Kegunaan |
| --- | --- |
| Login admin | Membatasi akses pengelolaan konten |
| Kelola video | Menambah, mengganti, menghapus, dan mengurutkan video per SKU melalui tautan YouTube |
| Kelola panduan kendala | Mengatur masalah dan solusi yang relevan untuk setiap model |
| Kelola FAQ | Menambah, mengubah, menghapus, dan mengurutkan pertanyaan per SKU |
| Pengaturan WhatsApp | Menentukan nomor tujuan bantuan |

Login admin telah diterapkan pada versi awal. URL `/admin` dilindungi di sisi server dan mengarahkan pengunjung tanpa sesi ke `/admin/login`. Kredensial dibaca dari environment variable, sesi disimpan dalam cookie HTTP-only bertanda tangan, dan sesi berakhir otomatis setelah delapan jam. Tautan admin tidak ditampilkan pada navigasi pelanggan.

## 8. QR dan URL produk

Website harus dihubungkan ke domain yang sudah dimiliki pengguna di Hostinger. Nama domain dan pilihan penggunaan domain utama atau subdomain masih perlu dipastikan. Lokasi hosting aplikasi ditentukan berdasarkan layanan yang tersedia; kepemilikan domain di Hostinger tidak otomatis menetapkan tempat aplikasi dijalankan.

- Setiap SKU memiliki QR berbeda yang langsung mengarah ke halaman bantuan SKU tersebut, bukan ke daftar produk atau video YouTube.
- Admin dapat mengunduh QR untuk setiap SKU langsung dari halaman admin agar dapat dicetak pada produk atau kemasan.
- URL halaman produk dipertahankan agar QR yang sudah dicetak tetap dapat digunakan.
- Perubahan video, FAQ, atau panduan tidak mengubah URL tujuan QR.
- Panduan produk yang sudah tidak dijual tetap tersedia pada URL yang sama agar QR milik pelanggan lama tetap berfungsi. Berhentinya penjualan produk tidak menjadi alasan untuk menghapus halaman bantuannya.

## 9. Bantuan dan chat admin di website

Bagian bantuan/chat admin pada website menyediakan tiga tombol berikut:

| Tombol | Tujuan |
| --- | --- |
| Klaim Garansi | Membuka alur pengajuan klaim garansi sesuai bagian 20 |
| Gascomp Care | Akses layanan bantuan pelanggan Gascomp; kanal dan tujuan tombol perlu ditentukan |
| Service Center | Akses layanan service center; halaman atau kontak tujuan perlu ditentukan |

Nama merek pada tombol ditulis “Gascomp”. Tujuan Gascomp Care dan Service Center belum diasumsikan menggunakan nomor WhatsApp yang sama.

### Bantuan melalui WhatsApp

Pelanggan dapat menghubungi admin jika tutorial dan FAQ belum membantu. Untuk saat ini, tombol WhatsApp membuka chat ke nomor admin tanpa format atau pesan yang terisi otomatis. Pelanggan menulis pesannya sendiri.

Nomor WhatsApp tujuan belum ditentukan dalam brainstorming.

## 10. Batasan versi awal yang diusulkan

- Tidak memerlukan akun atau login pelanggan.
- Tidak menyediakan forum atau pertanyaan publik antarpelanggan; bantuan lanjutan melalui admin.
- Video tutorial menggunakan tautan YouTube. Unggah file video untuk bukti klaim garansi diatur terpisah pada bagian 20.
- Pengisian konten awal dapat diprioritaskan pada produk yang paling sering mengalami kendala; daftar SKU dapat terus ditambah melalui halaman admin.

## 11. Indikator keberhasilan

Indikator yang diusulkan:

- Penurunan retur yang berkaitan dengan kesalahan atau kebingungan penggunaan.
- Berkurangnya pertanyaan berulang yang diterima admin.

Target angka, data awal, periode evaluasi, dan cara pengukuran belum ditentukan.

## 12. Hal yang masih perlu dipastikan

- Daftar SKU untuk pengisian konten awal beserta foto dan namanya; daftar ini tidak membatasi penambahan produk ke depannya.
- Tautan YouTube dan pemetaan satu atau beberapa video ke setiap SKU serta kendala terkait.
- Isi FAQ dan panduan teknis yang telah diverifikasi tim Gascomp.
- Nomor WhatsApp admin.
- Finalisasi fitur pendukung admin yang masih diusulkan.
- Supabase telah dipilih untuk database dan penyimpanan gambar. Skema data, konfigurasi akses, migrasi, dan hosting aplikasi masih perlu difinalisasi.
- Detail desain visual dan aset merek perlu ditentukan berdasarkan website referensi Gascomp.

Dokumen ini mencatat hasil brainstorming dan usulan yang masih terbuka. Implementasi awal telah dimulai.


## 13. Acuan susunan folder

Susunan folder diminta mengikuti metodologi folder pada materi berikut:

- https://www.skool.com/cliefnotes/classroom/036893d9?md=3dfa0ebc083349e4928e6b8e3b54b7fd
- https://www.skool.com/cliefnotes/classroom/d3907117?md=f7a33a9888604a08a7e48bb876682691
- https://www.skool.com/cliefnotes/classroom/2a86a1d1?md=c7a59d0fa0c145549dc9126470b7f82f

Jika tautan materi tidak dapat diakses langsung, acuan alternatif adalah https://www.skool.com/cliefnotes/classroom pada bagian The Foundation, Implementation Playbooks, dan Building Your Stack.

Tautan publik hanya menampilkan judul modul dan memerlukan login untuk membuka isi pelajaran. Implementasi awal mempertahankan struktur App Router yang sudah tersedia di proyek: route di `app`, komponen di `components`, logika dan tipe data di `lib`, serta aset statis di `public`.

## 14. Catatan implementasi versi awal

- Halaman utama, halaman bantuan per SKU, tutorial YouTube, panduan kendala, FAQ, WhatsApp, dan dashboard admin telah dibuat.
- Admin dapat menambah SKU, mengubah informasi produk, mengatur status tayang, menambahkan tautan video YouTube, mengubah FAQ, mengatur WhatsApp, serta membuat QR per produk.
- Supabase PostgreSQL menjadi penyimpanan utama ketika kredensial tersedia. Panel admin dan halaman pelanggan membaca sumber yang sama sehingga perubahan berlaku lintas perangkat. `localStorage` hanya menjadi fallback pengembangan ketika Supabase belum dikonfigurasi.
- Gambar produk disimpan di bucket `product-images`; bukti klaim disimpan di bucket privat `warranty-evidence`. Akses tulis menggunakan secret key hanya dari server. Autentikasi admin sudah tersedia dan kredensial produksi perlu diatur melalui environment variable pada layanan hosting.
- Nama SKU, tautan video, nomor WhatsApp, foto produk, serta isi panduan teknis masih perlu diganti atau diverifikasi oleh tim Gascomp.

## 15. Referensi visual dan identitas merek

Dokumen panduan merek disimpan di [Gascomp - Guidelines.pdf](<docs/brand/Gascomp - Guidelines.pdf>). Folder `docs/brand/` menampung dokumentasi identitas merek; aset yang digunakan langsung oleh website tetap berada di `public/`.

Referensi yang ditetapkan adalah [website Gascomp Superlock](https://gascompsuperlock.com/).

- Desain website bantuan disesuaikan dengan identitas visual website Gascomp yang sudah ada. Keputusan ini mencakup penggunaan logo resmi, warna, dan tipografi yang konsisten.
- Tampilan publik situs referensi telah ditinjau. Implementasi awal memakai arah yang sama: wordmark navy, aksen biru terang, ruang putih yang luas, serta tombol berbentuk kapsul. Aset logo dan foto produk resmi tetap perlu disediakan untuk menggantikan ilustrasi sementara.
- Alur website bantuan tetap mengikuti spesifikasi yang telah disepakati: daftar produk dan pencarian SKU pada URL utama, serta halaman bantuan per SKU melalui QR.

Usulan arah desain: mengutamakan kenyamanan penggunaan di ponsel untuk pelanggan yang masuk melalui scan QR, dengan pencarian SKU yang mudah ditemukan, foto produk yang jelas, dan akses tutorial serta WhatsApp yang mudah dijangkau.

## 16. Desain panel admin yang ditetapkan

Panel admin menggunakan komponen **Dashboard with Collapsible Sidebar** oleh **uniquesonu** dari [21st.dev](https://21st.dev/community/components?q=panel+admin&preview=%2F%40uniquesonu%2Fcomponents%2Fdashboard-with-collapsible-sidebar).

Sumber kode yang menjadi acuan adalah lampiran pengguna `pasted-text.txt` pada percakapan ini, dengan nama komponen `dashboard-with-collapsible-sidebar.tsx` dan ekspor `Example`.

### Ketentuan yang disepakati

- Desain dan isi yang diberikan sudah dianggap cukup. Pekerjaan berikutnya adalah mengimplementasikan komponen yang tersedia, tanpa mendesain ulang atau mengubah isinya.
- Pertahankan tata letak, sidebar yang dapat dibuka dan ditutup, tampilan menu, header, kartu statistik, aktivitas terbaru, serta bagian statistik dan produk pada komponen sumber.
- Pertahankan dukungan tampilan terang dan gelap serta interaksi sidebar dari komponen sumber.
- Acuan khusus ini berlaku untuk panel admin. Acuan visual website Gascomp pada bagian 15 tetap berlaku untuk halaman pelanggan.
- Penyesuaian teknis yang diperlukan untuk kompatibilitas proyek, seperti tipe TypeScript, import, dan pemasangan ke route admin, dilakukan tanpa mengubah desain dan isi yang telah dipilih.
- Kebutuhan pengelolaan konten pada bagian 7 tetap berlaku. Data contoh pada komponen referensi tidak dianggap sebagai data operasional Gascomp atau penambahan kebutuhan fitur bisnis baru.

### Arahan integrasi

- Gunakan struktur shadcn, Tailwind CSS, dan TypeScript yang tersedia dalam proyek.
- Tempatkan komponen pada `components/ui/dashboard-with-collapsible-sidebar.tsx`.
- Gunakan `lucide-react` untuk ikon sebagaimana kode sumber.
- Hubungkan komponen ke panel admin yang sudah ada dengan mempertahankan autentikasi dan kebutuhan pengelolaan konten yang telah disepakati.

Status: keputusan dan arahan integrasi telah dicatat; integrasi komponen 21st.dev belum dilakukan dalam pembaruan spesifikasi ini.

## 17. Sinkronisasi produk Duoke, Obsidian, dan admin

### Tujuan dan batas tahap saat ini

Ambil data produk dari [Duoke](https://web.duoke.com/#/dk/main/chat) menggunakan [Scrapling](https://github.com/d4vinci/Scrapling), kemudian samakan SKU, variasi, dan detail produknya pada admin Gascomp. Catat seluruh data produk yang diambil beserta relasinya dalam vault Obsidian di proyek `douke-web` agar dapat ditelusuri melalui Graph view.

- Fokus hanya pada SKU produk, variasi, dan detail produk yang tersedia di sumber.
- Nama produk, kode SKU, serta nama dan nilai variasi harus mengikuti Duoke. Jangan mengarang data yang tidak tersedia atau menggantinya dengan data contoh.
- Video, isi percakapan, lampiran chat, serta data pribadi pelanggan tidak diambil atau diimpor pada tahap ini. URL awal berada pada halaman chat, tetapi sasaran ekstraksi tetap data produk.
- Kebutuhan video dan bantuan yang telah dicatat sebelumnya tetap menjadi bagian spesifikasi keseluruhan; pengerjaan tahap ini memprioritaskan kesesuaian data produk.

### Data yang dicatat

| Data | Ketentuan |
| --- | --- |
| Identitas sumber | ID produk dan ID variasi dari Duoke jika tersedia; identitas toko bila dibutuhkan untuk membedakan produk |
| SKU produk | Kode asli dalam bentuk teks, termasuk nol di depan dan tanda baca |
| Nama produk | Nama yang sesuai dengan SKU pada sumber |
| Variasi | Nama variasi, nilai atau atribut pilihan, SKU variasi jika tersedia, dan hubungan dengan produk induk |
| Detail produk | Deskripsi dan atribut produk yang tersedia; daftar field final ditentukan setelah struktur sumber diperiksa |
| Jejak pengambilan | Referensi sumber, waktu pengambilan, dan status hasil sinkronisasi |

SKU produk induk dan SKU variasi dibedakan sesuai struktur Duoke. Data yang tidak memiliki SKU atau hubungan induk yang jelas ditandai untuk diperiksa, bukan diberi SKU buatan. SKU yang sama pada toko berbeda tidak otomatis digabung tanpa memastikan identitas produknya.

### Alur pengambilan dan impor otomatis

1. Siapkan Scrapling dalam lingkungan Python proyek dan akses Duoke menggunakan sesi akun yang berwenang.
2. Periksa lokasi data produk, struktur variasi, dan mekanisme pagination atau pemuatan bertahap setelah login. Struktur ini belum terverifikasi dari halaman publik.
3. Ambil field produk yang termasuk cakupan, rapikan format penyimpanan tanpa mengubah identitas asli, lalu validasi SKU serta relasi variasinya.
4. Simpan hasil terstruktur sebagai sumber bersama untuk impor admin dan pembuatan catatan Obsidian.
5. Impor otomatis data yang valid ke penyimpanan produk admin tanpa input ulang satu per satu. Tambahkan produk baru dan perbarui produk yang sudah dikenali berdasarkan identitas sumber yang stabil.
6. Buat atau perbarui catatan Obsidian dari hasil yang sama, termasuk tautan produk induk dan variasi.
7. Catat jumlah produk dan variasi yang berhasil, diperbarui, dilewati, atau gagal; kegagalan dapat dicoba ulang tanpa membuat duplikat.

Sinkronisasi berjalan satu arah dari Duoke ke admin dan vault pada tahap ini. Impor ulang tidak membuat entri ganda, tidak menimpa video/FAQ/panduan yang dikelola terpisah, dan tidak mengubah URL bantuan maupun QR yang sudah ada. Produk yang tidak muncul pada satu proses pengambilan tidak langsung dihapus.

Unggah otomatis berarti data masuk ke admin; produk baru mengikuti alur draft dan publikasi yang telah disepakati. Frekuensi pengambilan, pemicu proses, dan jadwal sinkronisasi berkala belum ditetapkan.

### Obsidian di dalam proyek

Kebutuhan pemasangan Obsidian dicatat untuk tahap implementasi. Secara teknis, aplikasi Obsidian dipasang pada komputer, sedangkan vault berupa folder catatan ditempatkan di dalam `douke-web`, dengan usulan lokasi `obsidian/`. Folder tersebut dibuka sebagai vault melalui aplikasi Obsidian, sesuai [dokumentasi vault](https://help.obsidian.md/Files+and+folders/Manage+vaults).

- Buat catatan indeks katalog, catatan per produk, dan catatan per variasi dengan nama file yang stabil serta unik.
- Catatan menyimpan SKU, nama, detail yang diambil, identitas sumber, dan waktu sinkronisasi.
- Gunakan internal link Obsidian seperti `[[produk-id]]` dan `[[variasi-id]]` untuk menghubungkan indeks, produk, dan variasi. Relasi mengikuti sumber, bukan hasil dugaan.
- Aktifkan Graph view agar hubungan antarnota dapat terlihat; garis pada graph berasal dari internal link sesuai [dokumentasi Graph view](https://help.obsidian.md/Plugins/Graph+view).
- Capture pada tahap ini berarti pencatatan data produk terstruktur dan relasinya. Tidak mencakup penyimpanan halaman chat atau percakapan secara keseluruhan.
- Vault dan hasil ekstraksi ditempatkan di luar `public`. Kredensial serta cookie sesi tidak dimasukkan ke catatan, hasil ekstraksi, atau Git.

### Integrasi dengan admin yang ada

Gunakan desain panel admin yang telah ditetapkan pada bagian 16. Pekerjaan berfokus pada pengisian dan penyamaan data SKU, variasi, serta detail produk. Supabase menjadi tujuan sinkronisasi lintas proses/perangkat; importir memperbarui hanya field yang berasal dari Duoke agar video, FAQ, panduan, status publikasi, dan gambar yang dikelola admin tetap dipertahankan.

### Kriteria selesai tahap ini

- Produk dan variasi pada cakupan sumber yang dipilih telah tercatat, dengan jumlah hasil yang dapat direkonsiliasi terhadap sumber.
- SKU, nama, detail, dan hubungan variasi pada admin sesuai hasil pengambilan Duoke.
- Impor berjalan otomatis setelah ekstraksi dan validasi, serta aman diulang tanpa duplikasi.
- Catatan produk dan variasi tersedia di vault proyek, dengan hubungan yang terlihat pada Graph view Obsidian.
- Tidak ada video atau isi percakapan yang diambil maupun diimpor.

Hal yang perlu dipastikan saat implementasi: sesi akses Duoke, cakupan toko/katalog, field detail yang tersedia, kunci identitas produk/variasi, konfigurasi Supabase sebagai tujuan admin, dan pemicu sinkronisasi.

Status: Scrapling, penangkap respons produk, normalisasi katalog, generator vault Obsidian, dan importir idempotent ke Supabase sudah disiapkan. Pengambilan katalog sebenarnya belum dijalankan karena masih memerlukan sesi Duoke yang berwenang dan pemilihan katalog/toko oleh tim.

## 18. Database dan penyimpanan gambar: Supabase

### Keputusan yang disepakati

Gunakan **Supabase PostgreSQL** sebagai database utama dan **Supabase Storage** untuk file gambar produk. Implementasikan koneksi panel admin, halaman pelanggan, dan proses impor Duoke ke sumber data yang sama, menggantikan penyimpanan lokal browser sebagai penyimpanan utama.

| Kebutuhan | Penyimpanan yang ditetapkan |
| --- | --- |
| Produk, SKU, nama, detail, status publikasi, dan variasi | Supabase PostgreSQL |
| File gambar produk | Supabase Storage |
| Metadata gambar dan hubungan gambar dengan produk atau variasi | Supabase PostgreSQL |
| Identitas sumber Duoke dan riwayat impor | Supabase PostgreSQL |
| Catatan produk dan relasi untuk Graph view | Vault Obsidian di proyek, dibuat dari data yang sama |

### Arahan implementasi

- Hubungkan CRUD produk dan gambar di panel admin dengan PostgreSQL dan Storage. Perubahan yang tersimpan harus dapat digunakan lintas perangkat.
- Simpan lokasi file gambar beserta keterkaitannya di database; file gambar disimpan di Storage.
- Terapkan identitas sumber yang stabil dan aturan keunikan untuk mencegah duplikasi saat impor ulang produk serta variasi dari Duoke.
- Pertahankan URL bantuan, QR, serta alur draft dan publikasi yang telah disepakati saat memigrasikan data.
- Atur akses agar pelanggan hanya dapat membaca konten yang sudah dipublikasikan, sedangkan perubahan data dan unggah gambar dilakukan melalui akses admin yang terautentikasi.
- Simpan kredensial server pada environment variable dan jangan mengekspos kunci berprivilege ke browser. Integrasi harus tetap menjaga autentikasi admin yang sudah tersedia.

Alur data: **Duoke → Scrapling → validasi dan impor → Supabase → panel admin dan halaman pelanggan**. Catatan Obsidian dibuat atau diperbarui dari data produk yang sama agar SKU, variasi, dan relasinya konsisten.

Tahap ini tetap berfokus pada produk, SKU, variasi, detail, dan gambar. Pengambilan video serta percakapan Duoke tetap ditunda sesuai bagian 17.

Untuk pengembangan, mulai dengan paket Free dan evaluasi kapasitas serta kebutuhan operasional sebelum publikasi. Acuan layanan: [database Supabase](https://supabase.com/docs/guides/database/overview), [Supabase Storage](https://supabase.com/docs/guides/storage), dan [paket Supabase](https://supabase.com/pricing).

Status: telah diimplementasikan. Project Supabase yang dikonfigurasi sudah terhubung dan terverifikasi. Migrasi katalog dan garansi tersedia di `supabase/migrations/`; tabel produk, konten bantuan, riwayat impor, tiket, dan metadata lampiran tersedia. Bucket `product-images` dan `warranty-evidence` juga tersedia. Admin menggunakan Server Action yang memeriksa sesi; secret key tidak dikirim ke browser.

## 19. Keterhubungan panel admin, website, dan nomor tiket

### Kebutuhan yang disepakati

- Panel admin dan website pelanggan harus saling terhubung melalui sumber data Supabase yang sama.
- Produk, SKU, variasi, detail, dan gambar yang dikelola admin digunakan oleh website pelanggan. Perubahan yang disimpan dan dipublikasikan tersedia di website tanpa input ulang atau perubahan kode.
- Draft tetap hanya terlihat di admin. Data yang ditampilkan kepada pelanggan mengikuti status publikasi dan ketentuan akses yang telah disepakati.
- Keterhubungan berlaku lintas perangkat, bukan hanya pada browser yang digunakan admin.
- Sistem memiliki nomor tiket klaim garansi yang dibuat setelah formulir pelanggan berhasil disimpan.

### Alur tiket yang diterapkan

- Pelanggan membuat tiket dari `/klaim-garansi` dan menerima nomor unik `GWC-YYYYMMDD-XXXXXX` setelah data serta seluruh bukti berhasil disimpan.
- Tiket dikaitkan ke produk berdasarkan SKU ketika produk tersebut tersedia di database. Nama produk dan SKU juga disimpan sebagai snapshot agar riwayat tetap jelas jika nama produk berubah.
- Nomor yang ditampilkan kepada pelanggan adalah nomor tiket yang sama pada menu **Tiket garansi** di admin.
- Status yang tersedia adalah **Baru**, **Sedang diperiksa**, **Disetujui**, **Ditolak**, dan **Selesai**.
- Hanya admin dengan sesi aktif yang dapat melihat data pribadi, mengunduh lampiran privat, atau mengubah status.
- Integrasi tiket dengan WhatsApp atau Duoke belum termasuk tahap ini.

Pembaruan konten muncul setelah halaman pelanggan memuat data terbaru; sinkronisasi real-time tanpa muat ulang belum diperlukan.

Status: keterhubungan panel admin, website pelanggan, produk, dan tiket telah diimplementasikan melalui Supabase. Fallback localhost tetap tersedia ketika Supabase tidak dikonfigurasi.

## 20. Klaim garansi

### Isi pengajuan yang wajib tersedia

| Data atau lampiran | Keterangan |
| --- | --- |
| Bukti pembelian | Lampiran bukti transaksi pembelian produk |
| Nomor pesanan | Nomor pesanan dari transaksi pembelian |
| SKU produk | SKU produk yang diajukan untuk klaim garansi |
| Harga pembelian | Harga produk saat dibeli sesuai bukti pembelian |
| Kendala | Penjelasan masalah yang dialami pelanggan |
| Video dan foto | Unggah video serta foto sebagai bukti kondisi atau kendala produk |

### Ketentuan garansi

- Masa garansi berlaku sesuai syarat dan ketentuan Gascomp.
- Garansi berlaku satu kali sesuai syarat dan ketentuan tersebut.
- Durasi garansi, tanggal awal perhitungan, cakupan kerusakan, serta dasar penerapan batas satu kali (misalnya per unit atau item pesanan) perlu ditentukan dari ketentuan resmi Gascomp; belum ditetapkan dalam brainstorming ini.
- Pengajuan perlu diperiksa terhadap bukti pembelian, masa berlaku, dan riwayat penggunaan garansi sebelum disetujui. Pengiriman formulir tidak otomatis berarti klaim disetujui.

### Keterhubungan dengan panel admin

Pengajuan klaim beserta data dan lampirannya harus dapat dilihat oleh admin untuk pemeriksaan. Data pengajuan menggunakan penyimpanan bersama sesuai bagian 18; lampiran bukti pembelian, foto, dan video klaim disimpan secara privat dengan akses terbatas untuk pihak yang berhak.

Unggah video di bagian ini khusus untuk bukti klaim garansi. Ketentuan tutorial melalui YouTube dan penundaan pengambilan video serta percakapan Duoke tetap berlaku.

Setiap pengajuan klaim terhubung dengan nomor tiket pada bagian 19. Nomor pesanan dan nomor tiket disimpan sebagai dua informasi berbeda. Invoice menerima JPG, PNG, WebP, atau PDF maksimal 4 MB. Pelanggan wajib mengunggah satu sampai empat foto JPG/PNG/WebP maksimal 4 MB per foto dan satu video MP4/WebM/MOV maksimal 12 MB.

Hal yang masih perlu ditentukan oleh tim Gascomp: durasi dan tanggal awal garansi, cakupan kerusakan, dasar batas garansi satu kali, serta prosedur operasional setelah status klaim disetujui atau ditolak. Sistem belum menolak klaim otomatis berdasarkan aturan yang belum ditetapkan tersebut.

Status: formulir, nomor tiket, penyimpanan database, lampiran privat, daftar admin, akses bukti, dan perubahan status telah diimplementasikan. Pengajuan tidak otomatis dianggap disetujui.

## 21. Rencana bantuan otomatis Duoke dan knowledge base Obsidian

### Status dan batas pelaksanaan

Bagian ini hanya mencatat rencana. Pengguna secara eksplisit meminta **jangan eksekusi**: tidak menjalankan scraping riwayat chat, mengaktifkan headless Chrome untuk membalas chat, atau mengirim pesan berdasarkan pembaruan ini. Pelaksanaan menunggu instruksi berikutnya.

Penundaan pengambilan percakapan pada bagian 17 dan 18 tetap berlaku untuk tahap sinkronisasi katalog. Pengambilan historis chat di bagian ini merupakan cakupan tahap lanjutan yang direncanakan.

### Arah yang diminta

- Gunakan knowledge base sebagai sumber jawaban, dengan Obsidian sebagai tempat penyusunan pengetahuan dan hubungan antara produk, SKU, pertanyaan, kendala, jawaban, serta tutorial.
- Rencanakan headless Chrome untuk membaca pertanyaan masuk, menemukan jawaban yang relevan dalam knowledge base, lalu mengirim balasan otomatis melalui Duoke.
- Sumber pembelajaran adalah hasil scraping historis percakapan yang telah dibalas oleh pengguna/admin, agar sistem mempelajari pasangan pertanyaan dan jawaban serta cara penanganan yang selama ini digunakan.

### Alur penyiapan pengetahuan yang direncanakan

1. Ambil historis chat dalam cakupan toko dan periode yang nanti ditentukan, dengan membedakan pesan pelanggan dari balasan pengguna/admin.
2. Susun pasangan pertanyaan, konteks produk/SKU, kendala, balasan admin, dan hasil penanganan bila tersedia. Jangan menganggap masalah selesai hanya karena ada balasan.
3. Kurasi jawaban menjadi FAQ, tutorial penggunaan, serta panduan kendala umum; tandai informasi yang belum lengkap, bertentangan, atau sudah tidak berlaku.
4. Simpan pengetahuan di vault Obsidian dan hubungkan catatan melalui internal link agar relasinya terlihat pada Graph view. Simpan referensi asal untuk penelusuran tanpa memasukkan data pribadi pelanggan yang tidak diperlukan ke catatan pengetahuan.

Istilah “belajar” pada tahap rancangan ini berarti menyusun dan menggunakan knowledge base dari contoh balasan historis; belum menetapkan pelatihan atau fine-tuning model.

### Alur balasan otomatis yang direncanakan

Pertanyaan masuk di Duoke → identifikasi produk/SKU dan kendala → cari jawaban pada knowledge base → pilih FAQ atau tutorial yang sesuai → kirim balasan di Duoke menggunakan headless Chrome → catat hasil pengiriman.

Usulan operasional untuk difinalisasi:

- Jika SKU atau konteks belum jelas, minta informasi yang diperlukan sebelum memberikan panduan spesifik produk.
- Jika jawaban tidak tersedia atau tidak cukup sesuai, alihkan penanganan kepada admin.
- Panduan perbaikan mengikuti materi yang diverifikasi tim Gascomp sebagaimana bagian 5. Riwayat chat saja tidak otomatis menjadi panduan teknis yang disetujui.
- Cegah pengiriman ganda untuk pesan yang sama dan sediakan cara bagi admin untuk menghentikan atau mengambil alih balasan otomatis.

### Hal yang masih perlu ditentukan

- Toko, periode, dan jenis historis chat yang digunakan sebagai sumber pembelajaran.
- Bentuk sumber jawaban saat sistem berjalan: catatan Obsidian langsung atau indeks pengetahuan turunan yang disinkronkan.
- Metode pencarian atau model yang digunakan untuk memilih dan menyusun jawaban.
- Kriteria jawaban yang boleh dikirim otomatis, alur pengalihan kepada admin, dan pencatatan hasil penanganan.
- Lokasi proses headless Chrome, pengelolaan sesi login, serta pemulihan saat koneksi atau sesi berakhir.

Status akhir: rencana telah dicatat; kemampuan Duoke dan alur otomatis ini belum diverifikasi atau diimplementasikan melalui pembaruan spesifikasi ini.

## 22. Domain Hostinger dan deployment

- Hubungkan website bantuan Gascomp ke domain yang sudah dimiliki pengguna di Hostinger.
- Tentukan hostname tujuan dan tempat deployment sebelum menambahkan atau mengubah record DNS.
- Aplikasi membutuhkan runtime server untuk autentikasi admin, Server Actions, akses Supabase, dan pengajuan klaim. Deployment harus mendukung kebutuhan tersebut.
- Siapkan environment variable produksi untuk Supabase dan autentikasi admin pada hosting aplikasi.
- Aktifkan HTTPS dan verifikasi akses halaman pelanggan, login admin, gambar, serta pengajuan klaim melalui domain tujuan.
- Pertahankan layanan website dan email yang sudah berjalan pada domain tersebut; perubahan DNS dibatasi pada record yang diperlukan untuk hostname tujuan.
- Gunakan alamat produksi yang telah ditetapkan sebagai tujuan QR, dengan path bantuan produk yang tetap stabil.

Hal yang perlu dipastikan: nama domain, domain utama atau subdomain yang akan digunakan, layanan hosting yang tersedia di akun Hostinger, serta akses pengelolaan deployment dan DNS.

Status: kebutuhan dicatat. Belum ada deployment atau perubahan DNS yang dilakukan pada pembaruan ini.
