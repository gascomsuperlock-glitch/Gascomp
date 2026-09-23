<a id="ai-assistance"></a>
# Bantuan AI

[Indeks spesifikasi](../spec.md)

<a id="customer-experience"></a>
## Pengalaman pelanggan

Gascomp Assistant adalah panel teks percakapan publik opsional. Flag sisi server `GASCOMP_AI_ASSISTANCE_ENABLED=true` menggantikan tombol WhatsApp melayang; defaultnya mempertahankan tombol yang ada. Kedua kontrol disembunyikan pada rute admin. Tujuan WhatsApp garansi dan pesan klaim yang ada tidak berubah.

Pelanggan tidak perlu memiliki akun. Cookie pribadi mengidentifikasi percakapan mereka lintas navigasi halaman dan reload di browser yang sama. Panel mengikuti pilihan Bahasa Inggris/Indonesia situs web dan menampilkan status loading, pending, offline, dan error. Tidak ada aksi WhatsApp permanen di bawah komposer.

Panel menawarkan **New chat** / **Percakapan baru** di samping selector bahasa. Ini membuat sesi pribadi baru, menghapus percakapan yang ditampilkan dan draft setelah sukses, dan menampilkan salam yang diterbitkan dalam bahasa saat ini. Percakapan baru tetap aktif setelah navigasi atau reload. Sesi sebelumnya mempertahankan kebijakan retensi normal 30 hari; aksi ini bukan penghapusan data dan tidak menambahkan pemilih riwayat. Respon pending di sesi sebelumnya tidak dapat muncul dalam percakapan baru.

`POST /api/ai-assistance/session` menerima boolean opsional `newConversation`.
Ketika true, server menghasilkan token opaque segar dan mengatur cookie-nya hanya setelah persistensi berhasil. Refresh sesi biasa menggunakan token masuk tanpa menulis ulang cookie-nya, mencegah respon refresh lama memulihkan sesi sebelumnya. Validasi asal, flag fitur, dan batas pembuatan sesi yang ada berlaku. Klien memblokir permulaan duplikat dan pengiriman simultan, menekan baca usang, dan mempertahankan percakapan serta draft ketika memulai sesi baru gagal, dengan aksi retry terlokalisasi.

Ketika pelanggan meminta tindakan admin spesifik akun diperlukan, bantuan aman tidak dapat berlanjut, atau layanan tidak tersedia, pesan handoff mencakup link WhatsApp admin yang dikonfigurasi sebagai aksi kontekstual di dalam pesan tersebut.
Ketiadaan jawaban Obsidian yang tepat dapat alih-alih mengarah pada penjelasan umum atau klarifikasi berguna dalam mode grounded.
Jawaban biasa, salam, dan respon pending tidak termasuk aksi tersebut.
Notis offline, tidak tersedia, dan request-error mungkin menawarkan link yang sama di dalam percakapan sehingga kegagalan layanan tidak menjebak pelanggan. Ketiadaan nomor admin menghasilkan salinan kontak-tidak-tersedia hanya pada keadaan handoff tersebut. Membuka WhatsApp memerlukan klik pelanggan dan tidak mengirim pesan atau mengnotifikasi administrator secara otomatis. Model tidak menghasilkan tujuan; aplikasi melampirkan link yang dikonfigurasi tanpa mengubah teks jawaban sumber.

V1 menerima teks saja. Ini tidak membuat klaim, mengubah pesanan, mengambil catatan akun pribadi, atau mengunggah file. Layanan yang tidak tersedia tidak boleh meninggalkan pelanggan menunggu selamanya.

<a id="grounded-conversational-answers"></a>
## Jawaban percakapan grounded

Pada 17 September 2026, pemilik mengganti kebijakan hanya-jawaban-eksak asli.
Obsidian sekarang adalah basis pengetahuan faktual untuk asisten dukungan bahasa alami. Dalam mode respon `grounded` default, Hermes dapat menjelaskan, memparafrasekan, menerjemahkan, meringkas, dan mengajukan pertanyaan lanjutan yang berguna. Ini dapat menggunakan pengetahuan umum untuk penjelasan biasa dan klarifikasi diagnostik aman.
Ini harus membedakan kemungkinan umum dari fakta yang diverifikasi untuk produk Gascomp tertentu. Ketiadaan pencocokan FAQ yang tepat bukan alasan sendiri untuk mengirim pelanggan ke WhatsApp.

Spesifikasi produk, kompatibilitas, syarat garansi, dan kebijakan Gascomp harus berasal dari pengetahuan yang relevan yang disediakan. Asisten tidak boleh menciptakan fakta tersebut, mengklaim stok/harga langsung, mengakses pesanan pribadi, atau menyiratkan bahwa ia telah melakukan tindakan operasional. Ia mengidentifikasi dirinya sebagai asisten AI ketika relevan dan menggunakan nada hangat serta ringkas tanpa berpura-pura menjadi karyawan manusia. Permintaan yang tidak terkait diarahkan ke dukungan Gascomp. Model tidak dapat memperbarui pengetahuan dari percakapan.

Lemari arsip yang dikurasi berada di `douke-chat/knowledge/approved/Douke Knowledge Base/customer-support`.
`GASCOMP_AI_SOURCE_VAULT` menghubungkan direktori Obsidian `Duoke` yang lengkap yang telah disaring. Catatan yang dapat dibaca di `Percakapan`, `Produk`, `Impor`, `FAQ`, `knowledge/approved`, dan `products` tetap berada dalam indeks pencarian pribadi; organisasi folder tidak mengecualikan pengetahuan unik. `Percakapan` dan `Produk` wajib ada; `Impor` dan `FAQ` diindeks bila tersedia. Transkrip tangkap ulang di `Impor/**/Percakapan` dibaca dengan format arsip peran eksplisit; catatan `Impor` lainnya hanya menjadi dokumen referensi yang dapat dicari tanpa menghasilkan jawaban. Setiap pasangan tanya-jawab `FAQ` yang direview pemilik menjadi satu dokumen dan, bila lolos pemeriksaan, satu entri jawaban. Basa-basi penutup, balasan boilerplate, dan pasangan tanpa isi yang dapat digunakan kembali tidak menjadi entri; baris sapaan di samping pertanyaan nyata tidak menjadi alias pencarian. Pasangan transkrip yang identik dengan entri FAQ memakai ulang entri FAQ tersebut alih-alih menerbitkan salinan. Catatan jawaban yang dihasilkan katalog di `knowledge/approved` diterbitkan apa adanya ketika frontmatter-nya menyatakan `approval: approved`, memakai pertanyaan dan pemicu pencariannya sebagai alias; catatan tanpa persetujuan tetap menjadi dokumen saja. Catatan katalog di `products` diindeks sebagai dokumen bernama ber-SKU untuk membantu identifikasi produk, tanpa menghasilkan entri. Salinan produk hanya dideduplikasi ketika sumber platform, identitas toko, dan identitas daftar serta konten stabil setuju. Lemari arsip sumber asli tidak ditulis ulang oleh asisten.

Pekerja membangun salinan versi dari paragraf yang dapat digunakan kembali dan template, dibatasi hingga 2.000 entri dan 4 MiB. Sebuah seleksi terbatas dari paragraf yang relevan dan layak disediakan sebagai bukti, dengan ID stabil, konteks produk, dan metadata konflik. Indeks transkrip lengkap dan percakapan pelanggan lainnya tidak pernah ditempatkan dalam konteks model. Balasan historis dengan konteks yang hilang, batasan privasi, klaim operasional yang belum diverifikasi, atau saran mekanikal yang tidak aman tidak dipromosikan menjadi instruksi umum. Menonaktifkan komponen keselamatan regulator atau menghapus segel bukan instruksi troubleshooting yang dapat diterima yang dihasilkan.

Model menerima pesan saat ini hingga delapan pesan sebelumnya dari sesi pribadi yang sama. Sejarah mendukung konteks tindak lanjut; ia bukan sumber fakta produk baru dan tidak dapat menimpa instruksi. Chat baru menciptakan sesi baru, sehingga konteks sebelumnya tidak tersedia. Konteks produk saat ini yang eksplisit mengesampingkan produk sebelumnya. Referensi produk yang ambigu atau konflik memerlukan klarifikasi daripada spesifikasi yang ditebak.

Untuk gejala seperti `Kenapa GRS-01 saya gak bisa nyala?`, asisten dapat mengakui masalah tersebut, menjelaskan bahwa penyebabnya belum ditetapkan, dan mengajukan pertanyaan diagnostik yang relevan. Ia tidak boleh menyimpulkan komponen yang rusak atau meresepkan modifikasi mekanikal dari balasan historis yang tidak terkait. Bahaya gas mendesak yang disangka memerlukan panduan keselamatan singkat dan bantuan manusia daripada troubleshooting berkelanjutan.

<a id="response-contract-and-fallback"></a>
## Kontrak respons dan fallback

Pekerja yang terautentikasi mengirimkan baik `answerId` warisan atau `response` yang dihasilkan dengan `text`, `kind`, `basis`, dan `sourceIds`. Teks yang dihasilkan dibatasi hingga 3.000 karakter. Jenis-jenisnya adalah `answer`, `clarification`, dan `handoff`; dasar adalah `knowledge` atau `general`. Respons pengetahuan merujuk pada satu hingga lima ID sumber aktif. Penjelasan umum/klarifikasi tidak memiliki ID sumber dan tidak boleh mengklaim fakta produk yang tidak didukung. Penggunaan fakta sumber lintas bahasa diperbolehkan. ID sumber menyediakan asal-usul, bukan jaminan matematis bahwa teks yang dihasilkan mengikuti sumber tersebut.

Website dan SQL memvalidasi struktur respons, ID sumber aktif, konteks produk, versi salinan, sewa, kesiapan, dan batas waktu. Penyelesaian duplikat, terlambat, atau usang tidak dapat memberikan jawaban baru. Teks model tidak dapat membuat tautan; aplikasi hanya melekat tujuan WhatsApp yang dikonfigurasi pada pesan handoff. Model HTML, tautan Markdown, URL lokal, dan wikilink Obsidian tidak diterima. Generasi yang tidak valid menggunakan klarifikasi terbatas atau fallback handoff; layanan yang tidak tersedia mempertahankan jalur handoff yang diterbitkan.

Layanan masih memvalidasi snapshot lengkap dan memantau semua jalur sumber serta byte untuk penambahan, pengeditan, perpindahan, dan penghapusan yang disimpan. Sumber yang hilang atau tidak valid akan menginvalidasi kesiapan daripada secara diam-diam mempertahankan fakta usang. Template handoff yang sebelumnya divalidasi tetap tersedia selama gangguan.

`GASCOMP_AI_RESPONSE_MODE=exact` mempertahankan pilihan selector sumber-ID awal sebagai opsi rollback eksplisit. Dalam mode tersebut, backend mengirim isi catatan yang dipilih verbatim dan tidak menerjemahkan atau mensintesis teks. Bagian verifikasi bersejarah di bawah ini menjelaskan perilaku legacy kecuali secara eksplisit ditandai grounded.

<a id="runtime-and-data-boundaries"></a>
## Batasan waktu berjalan dan data

Next.js memiliki kontrak HTTP publik dan worker. Kode fitur memiliki logika bisnis; Supabase menyimpan sesi pribadi, pesan, tugas, snapshot pengetahuan, dan keadaan waktu berjalan. Pelanggan mengakses hanya sesi yang telah diverifikasi oleh cookie pribadi mereka. Permintaan worker menggunakan kredensial bearer terpisah yang disimpan di server. Peran database publik tidak dapat mengakses tabel atau fungsi antrian secara langsung.

Pengembangan lokal dapat secara eksplisit mengatur `GASCOMP_AI_PREVIEW_URL` dan `GASCOMP_AI_PREVIEW_KEY` untuk menggunakan loopback PGlite jembatan AI-only. Ini menjalankan SQL antrian yang sama dengan persistensi pribadi lokal tanpa jawaban benih. Overridden ini diabaikan di luar pengembangan; pratinjau yang tidak valid atau tidak tersedia tidak pernah jatuh kembali ke menulis database Supabase utama. Fitur lain mempertahankan koneksi database mereka yang ada. Jalankan jembatan dengan `npm run ai:preview-db`.

Tugas memiliki ID permintaan klien stabil, klaim atomik, dan sewa terbatas. Proses pilot memproses satu tugas pada satu waktu, melaporkan detak jantung setiap 10 detik, menganggap worker offline setelah 30 detik, dan mengakhiri tunggu pelanggan setelah 60 detik. Pekerjaan yang kadaluarsa atau selesai tidak dapat memberikan jawaban kedua atau terlambat. Retensi percakapan secara default selama 30 hari dengan jadwal pembersihan database independen 15 menit; verifikasi Supabase Cron aktif sebelum rilis. Status admin mengekspos kesiapan, detak jantung, versi pengetahuan, kedalaman antrian, dan jeda/lanjutkan dengan otentikasi admin yang ada.

Worker Mac memulai permintaan HTTPS keluaran; tidak diperlukan port Mac masuk publik. Konfigurasi rumah Hermes khusus dan alat terbatas memisahkan pemrosesan pelanggan dari memori agen pribadi dan kredensial. Pemilik menginstal model lokal dan mengkonfigurasi endpoint dan identifier modelnya. Cloud fallback dinonaktifkan. Worker dan Chrome memiliki definisi layanan macOS untuk restart yang diawasi; Mac yang sadar, berdaya, dan terhubung masih diperlukan.

Chrome tanpa kepala adalah alat pemeriksaan tautan terbatas untuk URL Gascomp yang disetujui. Konten browser tidak pernah menjadi sumber jawaban tambahan. Kegagalan browser tidak boleh mencegah jawaban pengetahuan yang valid lainnya. CDP hanya lokal dan menggunakan profil khusus.

<a id="release-and-verification"></a>
## Rilis dan verifikasi

Implementasi menambahkan migrasi berurutan; eksekusi migrasi produksi, aktivasi layanan, dan deployment hosting memerlukan otorisasi terpisah. Pipelines rilis yang ada tetap menjadi mekanisme migrasi dan deployment.

Sebelum aktivasi, berikan pengetahuan bilingual yang diverifikasi, model lokal yang berfungsi, evaluasi relevansi dan keamanan respons grounded sukses, verifikasi browser, dan uji ketahanan sintetis 24 jam. Rollback fitur bendera mengembalikan tombol WhatsApp sebelumnya tanpa menghapus percakapan yang disimpan. Uji lokal atau model palsu tidak merupakan verifikasi model hidup atau 24 jam.

Instruksi operasional: [Pengaturan bantuan AI](../../setup/ai-assistance.md).

<a id="local-verification-on-september-17-2026"></a>
## Verifikasi lokal pada 17 September 2026

Lint, TypeScript, build produksi, semua 251 uji Node (termasuk uji SQL PGlite disposable), dan semua 30 uji Python telah lulus. Pemeriksaan browser mencakup teks sumber yang tepat, reload percakapan, sesi pengunjung terisolasi, perubahan bahasa, penolakan keyboard, handoff offline, kegagalan jaringan/penulisan ulang, jeda admin/resume, otentikasi admin kadaluarsa, dan tata letak pada 320, 390, dan 1440 piksel. Pemeriksaan build produksi terpisah memverifikasi bahwa flag dinonaktifkan mengembalikan tombol WhatsApp asli dan menolak penulisan chat publik.

Pilot transportasi sintetis lulus enam skenario selama 60,6 detik, termasuk penolakan snapshot kadaluarsa dan batas waktu balasan nyata 60 detik, tanpa balasan duplikat. Jalur lokal lengkap juga lulus menggunakan catatan Obsidian sementara, pekerja Python asli, revisi Hermes `0e9fc2cc15`, build Next.js produksi, dan mesin PostgreSQL terisolasi di balik transportasi uji. Titik inferensi endpoint adalah model palsu loopback: ini memverifikasi integrasi harness, bukan relevansi atau kinerja model pemilik akhir.

Chrome Google headless nyata dimulai dengan profil sementara dan menerima koneksi CDP lokal. Pemeriksaan ini tidak menavigasi situs web eksternal. Uji generasi layanan memvalidasi sintaks plist macOS asli, izin file, pelarian jalur, dan pemisahan rahasia tanpa mengaktifkan layanan launchd.

Laporan lokal berada di `.data/ai-assistance/` dan berisi bukti uji sintetis. Tidak ada migrasi produksi, balasan pelanggan, aktivasi layanan, atau deployment yang dilakukan. Pengetahuan yang ditulis pemilik, evaluasi model nyata, jadwal Cron produksi, pemeriksaan restart daemon aktual, dan pilot pekerja nyata 24 jam tetap diperlukan sebelum aktivasi publik.

<a id="contextual-whatsapp-handoff-update"></a>
## Pembaruan handoff WhatsApp kontekstual

Pemilik menghapus aksi WhatsApp komposer permanen pada 17 September 2026. Pembaruan handoff kontekstual lulus lint, typecheck, semua uji Node/SQL terisolasi 251, dan build produksi. Pemeriksaan browser dengan respons chat dimodifikasi memverifikasi tidak ada aksi pada balasan biasa, satu link di dalam respons handoff, teks sumber yang tidak berubah, aksi bilingual, pemulihan layanan-error, dan tata letak desktop/320/390-piksel. Tidak ada obrolan langsung atau penulisan database digunakan untuk pemeriksaan UI ini. Bukti dicatat di `.data/ai-assistance/handoff-browser-report.json`.

<a id="local-preview-connection-repair"></a>
## Perbaikan koneksi pratinjau lokal

Pada 17 September 2026, flag panel publik diaktifkan secara lokal sebelum Supabase dikonfigurasi memiliki skema AI. Pembuatan sesi konsekuensinya mengembalikan HTTP 503. Penemuan skema baca-hanya mengonfirmasi fungsi/tabel AI yang hilang. Lingkungan lokal sekarang menggunakan database pratinjau AI-eksplisit; tidak ada migrasi jarak jauh yang diterapkan. Pembuatan sesi lokal mengembalikan HTTP 200, pesan bertahan reload, dan pengetahuan yang tidak hadir dengan benar melaporkan ketidaktersediaan tanpa berpura-pura bahwa model siap. Bukti browser dicatat di `.data/ai-assistance/preview-browser-report.json`.

<a id="owner-installed-model-smoke-test"></a>
## Uji asap model yang dipasang pemilik

Pada 17 September 2026, instance Ollama pemilik mengekspos `qwen3.5:4b`.
Pilihan Hermes awal tidak mengembalikan ID yang dapat digunakan untuk pertanyaan sintetik yang cocok. Adapter Qwen3.5 sekarang secara eksplisit menonaktifkan pemikiran dan meminta JSON pada suhu nol untuk mempertahankan anggaran output jawaban-ID pendek.
Enam pemeriksaan sintetik Hermes/Ollama langsung berhasil: pertanyaan yang diketahui, pertanyaan yang tidak didukung, dan injeksi prompt, masing-masing dalam bahasa Inggris dan Indonesia. Waktu putaran yang diamati adalah 2,9–3,6 detik dengan model sudah dimuat; ini adalah uji coba asap, bukan jaminan latensi produksi atau relevansi. Semua 30 uji Python berhasil, termasuk regresisi kontrak permintaan Hermes yang terpasang.

Lingkungan lokal yang diabaikan mencatat endpoint/model dan token pekerja pribadi. Proses pekerja masih memerlukan lingkungan mereka dimuat secara eksplisit. Tidak ada pengetahuan aktif, pekerja berkelanjutan, atau layanan publik yang dimulai oleh pemeriksaan ini. Catatan bilingual yang disetujui pemilik dan evaluasi lengkap tetap menjadi prasyarat untuk aktivasi.

<a id="local-worker-connection"></a>
## Koneksi pekerja lokal

Pada 17 September 2026, konfigurasi pekerja pribadi dan definisi launchd dihasilkan dari lingkungan lokal yang diabaikan. Pekerja foreground dimulai melawan `http://localhost:3000` dan database preview terisolasi yang ada. Baca status lokal yang berhasil mengonfirmasi detak jantung pekerja baru. Tidak ada layanan launchd atau deployment publik yang diaktifkan. Pengetahuan tetap tidak siap karena benteng khusus tidak memiliki catatan aktif; model karenanya belum melayani jawaban website. Panduan pengaturan mendokumentasikan perintah foreground yang tepat dan membedakan proses ini dari obrolan Hermes interaktif.

<a id="existing-obsidian-transcript-review-preparation"></a>
## Persiapan tinjau transkrip Obsidian yang ada

Pada 17 September 2026, benteng saudara yang ada menyediakan 20 catatan percakapan dengan 345 putaran pelanggan/penjual yang diatribusikan. Semua catatan membawa tag pending-review; satu catatan melaporkan riwayat tangkap tidak lengkap. Ekstraksi konservatif membuat 13 kandidat tinjau yang belum disetujui. Dari 61 kelompok yang dikeluarkan, 22 adalah boilerplate penjual, 16 tidak memiliki respons penjual bersebelahan, 13 berisi kartu produk/pesanan/media, dan 10 adalah putaran pelanggan sepele. Delapan kandidat yang dipertahankan memiliki beberapa SKU produk dan dua mengandung penanda redaksi; semua mempertahankan flag tinjau peran-terinferensi dan akurasi historis.

Artefak tinjau tetap berada di direktori `duoke-review` yang diabaikan dan pribadi milik. Enam template antarmuka bilingual yang disusun secara terpisah diverifikasi dan disimpan di bawah `template-review` untuk tinjau pemilik; mereka tidak diekstrak dari riwayat pelanggan dan tidak diaktifkan. Hash agregat file mengonfirmasi bahwa transkrip sumber dan direktori jawaban aktif tetap tidak berubah setelah ekstraksi. Semua 40 uji Python berhasil. Link tinjau dan pemeriksaan diff berhasil. Tidak ada jawaban diterbitkan dan tidak ada pesan pelanggan dikirim oleh alur kerja ini.

<a id="working-local-model-pilot"></a>
## Pilot model lokal yang bekerja

Setelah permintaan pemilik untuk menjalankan asisten secara lokal, tujuh catatan diaktifkan di vault kurasi pada 17 September 2026: enam template antarmuka bilingual dan satu jawaban `GRS-02PRO` pengembalian/pengajuan dalam bahasa Indonesia. Jawaban produk mempertahankan balasan penjual pertama dari kandidat tinjau `duoke-b8210805ec74eec54542`; catatan aktivasi pribadi menyimpan referensi sumbernya. Tidak ada kandidat historis lain yang diaktifkan. Pertanyaan produk bahasa Inggris saat ini diteruskan karena tidak ada jawaban produk bahasa Inggris yang ada.

Proses pengembangan lokal Next.js yang tidak responsif telah diulang kembali, dengan lognya dialihkan ke file lokal. Database preview dan pekerja Hermes/Ollama nyata melaporkan siap. Pemeriksaan Chromium desktop/mobile untuk teks jawaban Obsidian yang tepat, transfer WhatsApp dari sumber tidak dikenal tanpa CTA footer, persistensi reload, dan sapaan/transfer bahasa Inggris telah lulus. Siklus perjalanan UI jawaban yang diketahui diamati adalah 4,4 detik dan transfer dari sumber tidak dikenal 2,4 detik; ini adalah pengamatan uji asap tunggal. Permintaan API browser mengembalikan HTTP 200 dan tidak ada kesalahan halaman yang dicatat. Bukti ada di
`.data/ai-assistance/real-model-browser-report.json` dengan gambar desktop/mobile.
Semua 40 tes Python telah lulus. Tidak ada deployment publik, migrasi produksi, aktivasi launchd, atau uji ketahanan 24 jam yang dilakukan.

<a id="friendly-conversation-pilot-verification"></a>
## Verifikasi percobaan percakapan ramah

Permintaan pemilik untuk interaksi yang lebih hangat dan terbatas memperluas snapshot lokal menjadi 19 catatan: sapaan bilingual yang direvisi dan prompt klarifikasi, dua belas jawaban percakapan bilingual, template transfer yang ada, dan satu jawaban produk. Jawaban percakapan mencakup terima kasih, kemampuan, identitas AI, kesejahteraan, pengakuan, dan perpisahan. Jawaban masih datang verbatim dari catatan yang diterbitkan; model tidak menyusun teks yang ditujukan untuk pelanggan.

Semua 47 tes Python telah lulus. Dua belas kasus Chromium nyata melatih percakapan bahasa Indonesia dan Inggris, pertanyaan produk dengan prefiks sapaan, pertanyaan yang tidak didukung, dan injeksi prompt melalui website dan pekerja Hermes/Ollama. Tiga kasus tambahan API publik memverifikasi klarifikasi, pengakuan, dan perpisahan. Semua lima belas jawaban cocok dengan teks sumber dan status yang diharapkan. Browser mencatat tidak ada kesalahan halaman dan mengonfirmasi tidak ada tautan footer WhatsApp permanen. Laporan browser disimpan di
`.data/ai-assistance/conversation-browser-report.json` yang diabaikan. Bacaan status lokal akhir
mengonfirmasi pengetahuan siap, pekerja online, dan antrian kosong. Peluncuran publik dan pemeriksaan ketahanan 24 jam masih tertunda.

<a id="expanded-source-preparation-and-local-activation"></a>
## Persiapan sumber yang diperluas dan aktivasi lokal

Pada 17 September 2026, persiapan sumber lengkap memproses 902 file Markdown percakapan: 881 arsip lengkap, 20 catatan warisan, dan satu indeks arsip yang dilewati. Tidak ada catatan percakapan yang rusak. Ekstraktor mempertahankan 339 kandidat jawaban sejarah pribadi yang belum disetujui; dua lolos triage otomatis untuk pemeriksaan fakta pemilik. Tidak ada jawaban percakapan sejarah baru yang diaktifkan. Pesan sistem-event, klaim transfer operasional, konteks tidak pasti, dan SKU komposit diperiksa secara eksplisit sambil menyempurnakan ekstraktor.

Folder produk berisi 432 file Markdown, termasuk 414 catatan produk katalog dan catatan pendukung/indeks. Importer katalog mengelompokkan catatan menjadi 125 grup SKU. En belas grup menghasilkan fragmen spesifikasi berlabel yang layak; 109 memerlukan tinjauan, termasuk grup tanpa teks stabil yang dapat digunakan. Lima puluh dua grup memiliki entri draf yang valid skema, dari mana hanya enam belas yang distage dan dipilih untuk percobaan lokal yang diotorisasi. Tidak ada terjemahan otomatis, jawaban yang ditulis model, publikasi produksi, atau modifikasi arsip sumber yang dilakukan.

Snapshot awal yang diperluas tersebut berisi 35 entri. Aktivasi mempertahankan catatan sembilan belas yang ada, menunda antrian lokal yang tidak aktif, menyimpan cadangan pribadi, memulai ulang pekerja dengan penjaga SKU, dan memverifikasi versi baru yang diterbitkan sebelum melanjutkan. Audit sumber memeriksa seluruh enam belas badan tahap, 32 hash file sumber, dan 90 baris sumber yang dikutip. Hash agregat mengonfirmasi bahwa semua 1.334 file Markdown asli tetap tidak berubah. Indeks tinjauan pribadi dan catatan aktivasi berada di `scraping/.private/ai-assistance/expansion/`.

Semua 91 uji Python berhasil. Semua 266 alias yang ditulis oleh penulis mengarah ke teks sumber yang cocok. Dua puluh empat kasus API/Hermes/Ollama situs web nyata berhasil, mencakup semua enam belas produk baru, sapaan, pertanyaan tidak diketahui, SKU tidak diketahui/berlebih, injeksi, permintaan tidak didukung campuran, jawaban produk bahasa Inggris yang tidak tersedia, dan permintaan catatan pribadi. Setiap jawaban yang diharapkan cocok dengan sumber aktifnya secara tepat, dengan satu balasan per permintaan. Putaran produk yang diamati adalah 4,3–5,2 detik; ini adalah pengukuran uji asap lokal, bukan jaminan layanan.

Tiga kasus browser berhasil di desktop/mobile, termasuk pertanyaan materi spesifik bidang dan kapasitas, teks tepat, persistensi reload, dan alih WhatsApp kontekstual tanpa tautan footer komposer. Tidak ada kesalahan halaman yang dicatat. Bukti disimpan di `.data/ai-assistance/expansion-api-report.json` dan `.data/ai-assistance/expansion-browser-report.json`. Tidak ada perubahan konfigurasi TypeScript, rute, atau build dalam ekspansi ini. Aktivasi publik masih memerlukan tinjauan fakta yang tersisa, jawaban produk bahasa Inggris yang disetujui, pengawasan layanan, uji ketahanan 24 jam, dan otorisasi deploymen.

<a id="new-conversation-verification"></a>
## Verifikasi percakapan baru

Aksi Obrolan baru lulus linting, pengecekan tipe, dan build produksi. Suite Node default lulus 228 uji dengan enam suite SQL opt-in yang dilewati. Suite AI SQL kemudian dijalankan secara eksplisit terhadap PGlite disposable dan lulus. Uji regresi handler mencakup token server segar, penggunaan ulang tanpa penulisan ulang cookie, bidang klien tidak valid, dan kegagalan database/batas laju yang mempertahankan cookie saat ini.

Pemeriksaan browser nyata di localhost mencakup memulai ulang selama balasan Hermes yang sedang menunggu, isolasi balasan sesi lama, persistensi reload, balasan berikutnya dalam sesi baru, kegagalan yang mempertahankan riwayat dan draf, retry, fokus, label bilingual, dan tata letak desktop/320/390-pixel. Pemeriksaan browser terkendali tambahan mencakup respons polling terlambat, klik ganda, dan perubahan bahasa plus tutup/buka selama pembuatan. Tidak ada kesalahan halaman yang dicatat dalam alur browser nyata. Bukti berada di `.data/ai-assistance/new-chat-browser-report.json` dan `.data/ai-assistance/new-chat-races-report.json`. Tidak ada migrasi database atau deploymen publik yang diperlukan atau dilakukan untuk fitur ini.

<a id="complete-scraped-source-connection"></a>
## Koneksi sumber yang diskrabing lengkap

Pada 17 September 2026, pemilik meminta agar asisten menggunakan semua pengetahuan yang sebelumnya diskrabing. Pekerja lokal sekarang terhubung langsung ke akar Obsidian `Duoke` penuh. Semua 1.334 file Markdown diindeks: 902 catatan percakapan dan 432 catatan produk, tanpa file sumber yang dikeluarkan. Hash agregat file asli cocok dengan catatan pra-integrasi. Folder `customer-support` khusus masih berisi 35 entri kurasi; entri yang diekstrak dibangun pada waktu berjalan dan oleh karena itu tidak muncul sebagai file tambahan di folder tersebut. Snapshot lokal akhir berisi 445 entri: 35 entri kurasi, 115 pasangan pertanyaan/jawaban sejarah yang dapat digunakan kembali, dan 295 bagian produk. Semua file sumber asli tetap tidak berubah.

Pencarian sekarang mencari teks jawaban yang layak serta pertanyaan dan nama.
Format satuan ekuivalen dan pemisah SKU tidak lagi menyebabkan konflik palsu.
Placeholder exporter gambar saja dikecualikan dari jawaban pelanggan. Deskripsi katalog yang berbeda dapat saling melengkapi; hal ini sendiri bukan alasan bagi Hermes untuk menolak sebuah jawaban. Konflik atribut yang diminta secara otentik ditolak sebelum pemilihan model, dan jawaban bahasa yang hilang tidak berulang kali meminta kode produk yang sudah diketahui. Batasan sumber juga menyertai kandidat model lokal. Pertanyaan akun yang tidak dikenal atau pribadi mempertahankan transfer konteks.

Konfigurasi pekerja mencakup `GASCOMP_AI_SOURCE_VAULT`, dan migrasi pra-pemantauan lokal `202609170002` diterapkan tanpa menghapus percakapan yang ada. Tidak dilakukan migrasi produksi, balasan pelanggan, deployment, atau aktivasi runtime Chrome. Laporan sumber/provenansi pribadi berada di bawah `scraping/.private/ai-assistance/full-corpus/`; bukti uji coba berada di bawah `.data/ai-assistance/full-corpus-*`. Indeks korpus lengkap tidak menyediakan konten gambar yang tidak dapat dibaca, data pesanan langsung, atau terjemahan bahasa Inggris yang tidak ada dalam sumber.

Kode yang selesai diperiksa lulus linting, pengecekan tipe, pembangunan produksi, 125 uji Python, 231 uji Node default (enam suite opt-in dilewati), dan semua 12 uji AI SQL yang secara eksplisit dijalankan. Pemeriksaan browser lulus di desktop dan mobile, termasuk teks sumber yang tepat, balasan produk panjang, persistensi reload, tidak ada overflow horizontal, dan transfer WhatsApp kontekstual. Tidak ada kesalahan halaman browser.

Pemilih mempertahankan semua alias untuk beban seleksi hingga 8.000 karakter. Untuk beban yang lebih besar, ia mengirim paling banyak tiga alias per kandidat, mempertahankan identitas produk deskriptif di samping alias yang diranking berdasarkan kueri. Pencarian masih mengindeks setiap alias. Badan jawaban kandidat dan batasan sumber dipertahankan secara penuh. Tiga pemeriksaan langsung model nyata memilih sumber kapasitas air fryer yang benar meskipun ada konflik warna yang tidak terkait, sementara permintaan konflik warna yang sebenarnya ditolak sebelum pemilihan model. Ini adalah bukti uji asap terbatas, bukan klaim bahwa setiap pertanyaan pelanggan akan cocok atau bahwa uji ketahanan 24 jam telah lulus.

Lima belas skenario website/Hermes/Ollama nyata yang berbeda lulus setelah rerun regresif difokuskan memperbaiki kegagalan pemilih. Mereka mencakup fakta produk yang ada, produk di luar enam belas awal, nama produk tanpa SKU, Q&A historis, sapaan, konten bahasa Inggris yang tidak tersedia, SKU yang tidak dikenal, permintaan akun pribadi, injeksi prompt, dan atribut konflik yang otentik. Setiap balasan yang diterima cocok dengan sumber yang diterbitkan secara tepat, dengan satu balasan per permintaan. Bukti akhir mempertahankan kegagalan awal dan rerun suksesnya di `.data/ai-assistance/full-corpus-api-final-report.json`. Status lokal akhir mengonfirmasi pengetahuan siap, pekerja online, pemrosesan dilanjutkan, dan tidak ada tugas antrian. Aktivasi publik dan pemeriksaan ketahanan 24 jam masih tertunda.

<a id="folder-organization-correction-and-restored-knowledge"></a>
## Perbaikan organisasi folder dan pemulihan pengetahuan

Pada 17 September 2026, pemilik memperjelas bahwa menghapus `Archive` dan `Catalog` berarti memindahkan isinya ke dalam folder induk mereka sambil mempertahankan pengetahuan unik. Eksklusi folder sebelumnya adalah kesalahpahaman implementasi, bukan kebijakan sumber yang disetujui pemilik. Eksklusi tersebut secara sementara mengurangi snapshot aktif menjadi 37 entri dan menyebabkan transfer produk meskipun layanan Hermes, Ollama, dan website sehat. Mereka sekarang dihapus dari penemuan, deteksi perubahan, ekstraksi jawaban, dan deteksi konflik.

Pindah migrasi lokal yang diotorisasi memindahkan 882 file percakapan dan 415 file produk ke `Duoke/Percakapan` dan `Duoke/Produk`. Indeks mereka sekarang `Conversation archive index.md` dan `Product catalog index.md`. Target tautan Obsidian diperbarui; semua konten sumber lainnya dipertahankan. Cadangan pribadi dan manifest hash sebelum/sesudah mutasi disimpan sebelum modifikasi. Semua 1.337 file Markdown vault tetap ada, termasuk 1.334 catatan sumber percakapan/produk di bawah `Duoke`. Tidak ada target tautan folder lama yang tersisa; semua 6.668 tautan catatan yang dihasilkan terpecah setelah perpindahan. Ekspor masa depan menggunakan jalur datar yang sama dan menormalisasi referensi konteks produk lama yang disimpan dalam JSON tangkapan pribadi.

Satu SKU atau judul yang cocok saja bukan bukti duplikat. Deduplikasi dokumen otomatis memerlukan pasar yang sama, ID toko, dan ID daftar, plus konten catatan yang identik dan metadata varian. Tangkapan waktu tempel dan ID referensi yang dihasilkan tidak membedakan salinan. Toko berbeda, posting pasar, platform, varian, revisi konten, atau identitas yang hilang dipertahankan. Salin indeks yang dihapus merekam jalur sumber yang dipertahankan dalam laporan pribadi. Penggunaan ulang jawaban-pasangan yang tepat masih mempertahankan asal daftar asli. Audit menemukan 414 identitas pasar/toko/daftar yang berbeda dan 17 catatan utama produk warisan unik; tidak ada file sumber duplikat yang dikonfirmasi dihapus.

Indeks lokal yang dipulihkan berisi 902 catatan percakapan dan 432 catatan produk, tanpa pengecualian folder. Snapshot tervalidasinya berisi 445 entri: 35 entri kurasi, 115 jawaban historis yang dapat digunakan kembali, dan 295 bagian produk. Pekerja lokal menerbitkan snapshot tersebut dan melanjutkan pemrosesan. Dokumen tanpa jawaban aman yang layak tetap dapat dicari secara pribadi; indeksisasi catatan tidak mengotorisasi mengembalikan detail pribadi atau menemukan fakta yang hilang.

Pengujian pemulihan mengekspos transfer model yang tidak perlu untuk pertanyaan spesifikasi juicer luas dengan beberapa kutipan yang tumpang tindih. Beban pembayar sekarang menggunakan urutan bidang stabil dan menempatkan aliansi pertanyaan tepat unik pertama, sambil mempertahankan setiap kandidat lain dan metadatanya konflik. Prioritas aliansi tidak menghapus bukti kontradiktif atau melewati pemilihan model. Penutupan kembali cakupan memeriksa aliansi tepat duplikat dan kandidat kabur yang bertentangan. Relevansi model tetap probabilistik; tes sukses bukan jaminan bahwa setiap frasa didukung dipilih.

Verifikasi lulus semua 134 tes Python dan semua 15 skenario website/Hermes/Ollama API asli setelah koreksi selektor. Tes mencakup produk yang diketahui, pencocokan nama produk, jawaban historis, sapaan, pertanyaan/SKU yang tidak dikenal, terjemahan yang hilang, permintaan data pribadi, injeksi prompt, dan fakta yang bertentangan. Kegagalan juicer awal dan transfer aman yang diamati selama startup pekerja dipertahankan dalam laporan terpisah daripada ditimpa sebagai sukses. Pemeriksaan browser asli lulus di desktop dan mobile, termasuk teks sumber tepat, persistensi reload, tautan WhatsApp kontekstual, tidak ada footer WhatsApp permanen, dan tidak ada kesalahan halaman.

Bukti migrasi dan waktu berjalan disimpan di `.data/ai-assistance/flatten-*`; cadangan sumber tetap berada di bawah `scraping/.private/ai-assistance/flatten-backup-*`.
Aktivasi publik dan pemeriksaan ketahanan 24 jam tetap tertunda.

<a id="legacy-exact-mode-diagnosis-grs-01-troubleshooting-gap"></a>
## Diagnosis mode tepat warisan: Celah troubleshooting GRS-01

Pertanyaan pemilik tanggal 17 September 2026 `Kenapa GRS-01 saya gak bisa nyala?`
direproduksi terhadap website lokal yang siap. Resolusi produk mengidentifikasi `GRS-01`, tetapi pengambilan dan panduan sumber keduanya tidak mengembalikan kandidat manapun. Oleh karena itu, pekerjaan tersebut mengembalikan transfer tangan yang diterbitkan tanpa memanggil Hermes. Pemeriksaan langsung selesai dengan transfer tangan dalam 1,6 detik; ini bukan timeout inferensi atau pekerja offline.

Pemeriksaan sumber tidak mengidentifikasi jawaban historis mandiri, layak, dan aman untuk gejala ini. Percakapan terkait berisi hasil transaksi spesifik, konteks gambar/video yang hilang, atau saran modifikasi mekanikal yang tidak boleh dipromosikan secara otomatis menjadi perbaikan umum. Deskripsi katalog yang ada tidak menetapkan penyebab masalah pengapian pelanggan. Indeksasi semua dokumen sumber tidak menyiratkan cakupan perbaikan lengkap.

Pencocokan leksikal juga memerlukan evaluasi relevansi yang lebih luas: penulisan gejala alternatif dapat mengambil paragraf yang tidak terkait atau tidak lengkap. Menambahkan sinonim semata-mata atau memaksa pilihan sumber bukan bukti bahwa jawaban tersebut sesuai. Koreksi masa depan memerlukan sumber perbaikan terverifikasi atau alur klarifikasi diagnostik yang secara eksplisit disetujui, plus kasus regresi menggunakan penulisan gejala asli pemilik. Pertahankan jawaban sumber yang tepat dan pemeriksaan konflik. Runtime saat ini juga tidak mengirimkan pesan sebelumnya ke Hermes untuk konteks lanjutan; ketahanan percakapan semata-mata tidak menyediakan memori percakapan.

Skenario API 15 yang lulus sebelumnya hanya mendemonstrasikan kasus produk dan transfer tangan spesifik mereka; mereka tidak menetapkan cakupan keluhan komprehensif. Reproduksi ditargetkan direkam dalam `.data/ai-assistance/grs01-diagnosis.json`. Tidak ada jawaban perbaikan baru yang diciptakan atau diterbitkan selama diagnosis ini.

<a id="grounded-response-safety-review"></a>
## Tinjauan keamanan respons berbasis fakta

Mode yang dihasilkan mengecualikan balasan historis yang belum ditinjau/dihasilkan hasil tidak terverifikasi dari bukti model dan memblokir instruksi modifikasi regulator yang diketahui tidak aman dalam bukti dan output. Deteksi bahaya gas mengevaluasi klausa dan negasi sehingga pernyataan seperti tidak ada bau gas tidak menyembunyikan laporan positif terpisah mengenai suara hissing. Keluhan pengapian normal tetap layak untuk klarifikasi.
Prompt secara eksplisit membedakan observasi yang hilang dari temuan negatif. Penjaga regresi menolak klaim afirmatif umum bahwa tidak adanya bau gas menyingkirkan kebocoran, termasuk ketika balasan yang dihasilkan mengutip sumber produk. Pemeriksaan ini mengurangi mode kegagalan yang diketahui; mereka tidak dapat membuktikan setiap pernyataan yang dihasilkan benar.

Penyebutan respons darurat dipengaruhi oleh panduan resmi
[ESDM LPG guidance](https://www.esdm.go.id/en/media-center/news-archives/tips-menggunakan-lpg-yang-aman-dan-benar) dan [Ditjen Migas household LPG guidance](https://www.migas.esdm.go.id/post/Aman-Menggunakan-Tabung-LPG-Untuk-Rumah-Tangga).
Sumber-sumber ini menetapkan batas keamanan umum; chatbot tidak menelusuri halaman-p halaman ini pada waktu runtime atau memperlakukan mereka sebagai bukti diagnosis Gascomp spesifik.

<a id="local-grounded-mode-activation-on-september-17-2026"></a>
## Aktivasi mode grounded- lokal pada 17 September 2026

Database preview lokal yang ada telah di-backup dan ditingkatkan melalui migrasi `202609170003` tanpa menghapus percakapan. Konfigurasi pribadi pekerja sekarang secara eksplisit memilih `GASCOMP_AI_RESPONSE_MODE=grounded` dan terus menggunakan Ollama lokal pemilik `qwen3.5:4b` melalui Hermes. Tidak ada model yang didownload dan tidak ada database produksi, deployment, atau layanan launchd yang diubah.

Evaluasi model nyata pertama mengungkapkan respons keluhan yang terlalu defensif dan salam berulang. Prompt akhir memprioritaskan pengakuan ringkas, pertanyaan tindak lanjut yang berguna, dan ketidakpastian yang jujur. Konteks katalog aman dapat mengidentifikasi produk yang dikenal bahkan ketika gejalanya tidak memiliki kecocokan FAQ yang tepat. Salam pendek yang diulang menggunakan salam yang diterbitkan daripada mengulangi permintaan pelanggan. Penjelasan umum dan ketidakpastian diperbolehkan; saran modifikasi gas mekanis tetap diblokir.

Semua 152 uji Python telah lulus. Lint, pengecekan tipe, dan pembangunan produksi telah lulus; jalannya Node lulus dengan 251 uji dengan lima suite SQL opsional yang tidak terkait dilewati. Antrian/penelusuran sumber/session pemeriksaan AI SQL telah diaktifkan dan lulus. Skenario website/Hermes/Ollama nyata sebelas telah lulus, mencakup keluhan GRS-01 pemilik, tindak lanjutnya, fakta sumber EHJ-01, pengingat produk sesi yang sama, isolasi percakapan baru, terjemahan bahasa Inggris, salam, penjelasan umum, klarifikasi kode tidak dikenal, kontak admin eksplisit, dan serah terima bahaya gas. Respons website didukung model yang diamati memakan waktu sekitar 7-15 detik; serah terima deterministik memakan waktu sekitar satu detik. Ini adalah evaluasi asap, bukan jaminan kelengkapan atau akurasi.

Jalannya desktop/perangkat mobile browser terakhir mengonfirmasi respons terhadap keluhan GRS-01 dan tindak lanjut instalasinya, ketahanan setelah reload, tautan WhatsApp hanya pada serah terima, dan konteks produk yang dibersihkan setelah Percakapan baru. Ini merekam tidak ada kesalahan halaman atau tumpahan horizontal di perangkat mobile. Tinjauan browser juga mengungkapkan diagnosis yang tidak didukung dalam klarifikasi; pemeriksaan output sekarang mencakup klarifikasi serta jawaban, dengan cakupan regresinya dan ulang jalannya browser yang berhasil. Pemeriksaan tambahan model nyata sintetis menolak permintaan penghapusan komponen keamanan dan injeksi kredensial/sejarah pelanggan, serta mengklarifikasi fakta produk yang bertentangan dan kode model yang tidak dikenal tanpa menciptakan spesifikasi. Tinjauan respons fakta-bertentangan mengarah pada klarifikasi varian toko netral daripada pertanyaan gejala yang tidak terkait; ulang jalannya tertargetnya telah lulus.

Bukti hidup di `.data/ai-assistance/grounded-*`, termasuk kegagalan awal, ulang jalani yang difokuskan, dan laporan akhir gabungan. Snapshot sumber masih berisi 445 entri didukung oleh indeks sumber pribadi lengkap 1.334 dokumen. Respons yang dihasilkan tidak menimpa salah satu gudang Obsidian. Deploi publik dan evaluasi ketahanan 24 jam tetap tertunda.

<a id="full-knowledge-vault-coverage-on-september-23-2026"></a>
## Cakupan vault pengetahuan penuh pada 23 September 2026

Pemilik meminta seluruh pengetahuan di `douke-chat/knowledge` digunakan oleh Gascomp Assistant. Pemeriksaan menemukan bahwa commit `213fb91` menghapus `obsidian/customer-support` dari repositori tanpa menyalinnya ke vault baru, sehingga tidak ada lemari arsip kurasi di disk. Tanpa satu sapaan, klarifikasi, dan serah terima per bahasa, `build_snapshot` menolak publikasi, jadi pekerja tidak dapat menerbitkan pengetahuan apa pun. Ke-37 catatan kurasi dipulihkan dari riwayat Git ke `douke-chat/knowledge/approved/Douke Knowledge Base/customer-support`, dan `GASCOMP_AI_VAULT` pada konfigurasi pribadi pekerja diarahkan ke lokasi itu; salinan konfigurasi sebelumnya disimpan di samping berkas aslinya.

Pembangun korpus sekarang mengindeks keempat pohon di bawah akar `Duoke`. Hitungan sumber naik dari 1.334 menjadi 2.372 berkas Markdown: 902 `Percakapan`, 432 `Produk`, 1.030 transkrip `Impor`, 7 berkas `FAQ`, dan 1 catatan referensi `Impor`. Batas berkas sumber dinaikkan menjadi 6.000; batas 2.000 entri dan 4 MiB publikasi tidak berubah. Transkrip tangkap ulang dikenali melalui `source: duoke_api_recapture` dengan `capture_id`, memakai pembaca transkrip arsip yang sudah ada, dan SKU kartu produknya dibaca dari baris `SKU kartu produk:`.

618 pasangan `FAQ` yang direview pemilik menjadi dokumen yang dapat dicari; 282 di antaranya lolos pemeriksaan kelayakan dan menjadi entri jawaban. Yang ditolak adalah balasan tanpa isi yang dapat digunakan kembali, boilerplate, serta pasangan yang menyentuh pesanan, harga, stok, janji operasional, atau otomasi sistem. Snapshot gabungan berisi 819 entri: 35 kurasi, 282 FAQ, 207 pasangan riwayat percakapan, dan 295 bagian produk, dengan publikasi sekitar 679 KiB. Delapan puluh tiga pasangan transkrip yang identik memakai ulang entri FAQ-nya alih-alih menerbitkan salinan.

Teks yang dihasilkan sekarang ditolak bila berupa muatan terserialisasi: JSON bersarang, objek berkutip tunggal, larik, blok kode berpagar, urutan escape literal, atau gema nama field skema. Pemeriksaan berjalan di dua lapisan, pada validasi pekerja dan pada validasi respons sisi server, sehingga pekerja yang salah pun tidak dapat mengirim JSON ke pelanggan; penolakan memakai kalimat cadangan yang aman. Judul listing marketplace seperti `{COD} PAKET ...` dan `[TAMBAHAN] ...` dibiarkan lewat karena kecocokan seluruh teks harus benar-benar terurai sebagai JSON. Prompt sistem juga menyatakan bahwa nilai `text` dibaca pelanggan kata demi kata. Tidak satu pun dari 819 entri terbitan yang tertangkap aturan ini.

Seluruh 202 uji Python dan 242 uji Node lulus, termasuk regresi baru untuk sumber `Impor`/`FAQ`, penolakan basa-basi serta balasan volatil, dan penolakan muatan terserialisasi di kedua lapisan. Lint, pengecekan tipe, dan pembangunan produksi lulus. Ini adalah verifikasi pembangunan korpus dan publikasi terhadap vault nyata. Pekerja produksi yang dikelola launchd (`com.gascomp.ai-assistance.production.worker`) memakai konfigurasi pribadi terpisah di `scraping/.private/ai-assistance/production/worker-environment.json`, dan `GASCOMP_AI_VAULT` di sana masih menunjuk jalur repositori yang sudah dihapus. Lognya mencatat `Worker connection unavailable` berulang sejak vault hilang, yang berarti sinkronisasi pengetahuan situs publik gagal sejak saat itu. Atas izin pemilik, konfigurasi itu diarahkan ke vault yang dipulihkan dan layanan dijalankan ulang melalui launchd pada 13:12:20. Log berhenti mengulang galat itu setelahnya, dan `load_bundle` memakai kedua jalur persis dari konfigurasi produksi berhasil dengan 819 entri. Penerbitan snapshot belum dikonfirmasi langsung karena keadaan `ready` pada server hanya dapat dibaca dengan token pekerja. Penjaga sisi pekerja aktif karena layanan menjalankan pohon kerja repositori; penjaga sisi server memerlukan deployment build baru dan belum aktif. Pemeriksaan browser model nyata dan evaluasi ketahanan 24 jam tetap tertunda.
