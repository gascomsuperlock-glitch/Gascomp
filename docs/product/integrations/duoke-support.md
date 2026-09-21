<a id="duoke-knowledge-and-automated-replies"></a>
# Sumber pengetahuan Duoke dan balasan otomatis

[Indeks spesifikasi](../spec.md)

<a id="knowledge-sources-and-review"></a>
## Sumber pengetahuan dan tinjauan

Untuk balasan pelanggan Hermes, pengetahuan lengkap Obsidian yang terhubung milik pemilik adalah cakupan referensi, termasuk Q&A admin, catatan produk, panduan pemecahan masalah, dan kebijakan pengembalian/penggantian jika ada. Kontrak [penyelesaian pelanggan](#customer-problem-resolution-and-whatsapp-handoff) berlaku lebih tinggi daripada membatasi pengetahuan yang dapat digunakan hanya pada catatan starter atau konten yang diterbitkan di situs web. Gunakan fakta sumber yang berlaku; cakupan lengkap tidak berarti menyalin setiap catatan ke dalam setiap prompt model atau menganggap pesan khusus kasus sebagai kebijakan umum.

Pipeline tinjauan di bawah ini menjelaskan alat tangkapan/persetujuan warisan, bukan persyaratan menyeluruh untuk mengesahkan ulang Q&A admin pemilik yang ada sebelum pencarian referensi.

Bantuan AI situs web juga dapat melihat pratinjau dan mengekstrak ekspor percakapan Obsidian dari perbendaharaan `douke-chat` saudara ke artefak tinjauan pribadinya sendiri. Ini tidak mengaktifkan pelari balasan Duoke atau mengubah pipeline persetujuannya. Lihat [penyiapan bantuan AI](../../setup/ai-assistance.md#connect-the-complete-scraped-obsidian-archive) untuk alur kerja tinjau transkrip terpisah.

```text
Published product content ────────────────┐
                                         ├→ approved runtime knowledge → retrieval → Duoke runner
Authorized historical chat capture       │
  → redaction → pending candidate         │
  → explicit human review and approval ──┘
```

"Pembelajaran" berarti mengkurasi dan mengambil kembali basis pengetahuan. Proyek ini tidak melatih atau menyempurnakan model.

<a id="percakapan-as-the-primary-admin-reference-source"></a>
## Percakapan sebagai sumber referensi admin utama

Dicatat: 2026-09-18. Sumber: pemilik memperbaiki agen lagi dan secara eksplisit mengidentifikasi folder `Percakapan` Obsidian sebagai database jawaban yang ada.
Alasan: agen masih gagal menggunakan pengetahuan percakapan yang disediakan.

Desktop harus mengambil pertanyaan dan jawaban pelanggan/admin yang berdekatan langsung dari folder terhubung tersebut, terlepas dari kepatuhan publikasi website. Urutkan pasangan pertanyaan, normalisasi istilah ekuivalen yang didukung (termasuk pengembalian/penggantian/retur), dan prefer jawaban admin yang berlaku dibandingkan deskripsi produk. Pertahankan asal catatan, cakupan produk, dan kualifikasi historis. Jangan gunakan kalimat tidak terkait di tempat lain dalam transkrip sebagai bukti bahwa jawabannya cocok.

Lampiran tidak terkait di tempat lain dalam sebuah catatan tidak mengabulkan pasangan teks mandiri; lampiran antara pertanyaan dan jawaban memutus pasangan tersebut. Detail akun pribadi, peran pembicara yang tidak jelas, perbaikan tidak aman, dan jawaban yang bergantung pada lampiran tetap dikeluarkan. Referensi kontekstual dapat menginformasikan pratinjau interaktif; item `referenceOnly` tidak dapat dipilih untuk pengiriman teks persis secara otomatis.
Persetujuan pengembalian historis dan janji pemrosesan bukan kebijakan saat ini: jika tidak ada kebijakan saat ini yang berlaku, gunakan kontrak penanganan WhatsApp.
Untuk pencocokan historis hanya pengembalian, alat mengembalikan metadata sumber di bawah `historicalMatches`, menekan teks jawaban historis, dan menyediakan serah terima `customerReply` yang ringkas. Model harus menyalin jawaban tersebut tanpa klaim kebijakan tambahan. Nomor terverifikasi yang hilang tidak boleh pernah diganti dengan nomor contoh; serah terima tekstual tidak membuktikan transfer otomatis atau tautan kontak yang berfungsi.

Penerimaan: pertanyaan pengembalian yang diformulasikan berbeda mengambil referensi percakapan berpasangan daripada status kotak masuk atau deskripsi katalog; produk tidak terkait, detail pribadi, perbaikan tidak aman, dan pasangan terputus tidak menjadi jawaban.
Jumlah penutupan/penghapusan dan pemeriksaan model aktual harus berada di [active task](../../work/handoffs/handoff-duoke-hermes-active-v2.md). Kontrak ini tidak mengklaim pencocokan semantik lengkap atau memvalidasi setiap jawaban historis.

<a id="direct-knowledge-tools-in-hermes"></a>
### Alat pengetahuan langsung di Hermes

Dicatat: 2026-09-18. Sumber: pemilik melaporkan bahwa jawaban chat aktual masih tidak menggunakan Obsidian. Vault dikonfigurasi dan jumlah korpus yang cukup tidak memadai: verifikasi panggilan alat Hermes nyata dan sumber yang dikembalikan sesuai sebelum mengklaim jawaban tersebut berakar.

Profil Qwen lokal yang dimiliki mengekspos skema Duoke MCP secara langsung (`tools.tool_search.enabled: off`) dan menonaktifkan alat sumber/prompt MCP yang tidak digunakan.
Ini menghilangkan langkah penemuan tambahan; ini tidak menonaktifkan `duoke_search` atau pengambilan Obsidian. Refresh melakukan cadangan dan memperbarui pengaturan ini untuk proyek MCP sambil mempertahankan model, filter inklusi/eksklusi alat eksplisit, dan kontrol pengiriman. Prompt memerlukan pencarian pengetahuan sebagai langkah pertama untuk keluhan produk, dan tidak ada alat untuk pertanyaan sapaan/identitas.

Singkatan percakapan umum dan varian ejaan harus tetap dapat diakses setelah reformulasi kueri (misalnya, istilah *inclusion* dan *drain-hose*). Verifikasi sumber percakapan yang dikembalikan, bukan sekadar bahwa hasil katalog ada. Kata-kata negasi bersama tidak boleh menetapkan relevansi jawaban. Varian gejala penutupan/penutupan harus cocok dengan gejala tersebut dalam pertanyaan kandidat, termasuk fallback katalog. Placeholder identifikasi tidak boleh pernah masuk ke jawaban pelanggan. Jika pencarian tidak memiliki bukti yang berlaku, berikan alih WhatsApp yang terbatas daripada tebakan perbaikan umum atau mengklaim bahwa perbendaharaan tidak mengandung jawaban. Memulai ulang aplikasi tidak menghapus riwayat percakapan yang ada: penerimaan menggunakan percakapan baru. Bukti model dan antarmuka asli harus berada dalam alih tangan aktif.

<a id="implemented-modules"></a>
## Modul yang diimplementasikan

- `scripts/duoke/export-duoke-knowledge.mjs` mengekspor FAQ diterbitkan, panduan masalah, dan tutorial valid dari Supabase. Entri pendek atau tidak lengkap dilewati dan dilaporkan.
- `scraping/duoke/chat/capture_duoke_chats.py` hanya menangkap percakapan yang dipilih oleh operator berwenang dan menyimpan beban mentah secara pribadi.
- `scraping/duoke/knowledge/build_duoke_knowledge.py` mengidentifikasi giliran pelanggan/dukungan, meredaksi data pribadi, dan membuat kandidat Obsidian yang menunda.
- `scraping/duoke/knowledge/approve_duoke_knowledge.py` memerlukan peninjau untuk menyediakan pertanyaan anonim dan jawaban bahasa Inggris yang diverifikasi sebelum aktivasi.
- `scraping/duoke/knowledge/knowledge_engine.py` menyelesaikan konteks produk/SKU dan secara deterministik mengurutkan jawaban yang disetujui.
- `scraping/duoke/reply/duoke_auto_reply.py` mendukung mode *dry-run* dan kirim, identitas pesan stabil, pencegahan duplikasi, pengecekan ulang pra-kirim, verifikasi pengiriman, dan audit log tanpa konten.

Kata-kata bahasa Indonesia tetap ada dalam kamus penyamaran dan pencarian karena harus cocok dengan pesan pelanggan dari luar sistem. Dokumen Markdown menggunakan bahasa Indonesia; prompt sistem, jawaban yang dihasilkan, laporan non-Markdown, log, dan keluaran operator tetap mengikuti kontrak bahasa masing-masing.

<a id="delivery-rules"></a>
## Aturan pengiriman

- Konteks produk yang hilang atau ambigu menghasilkan klarifikasi disetujui hanya ketika pengiriman klarifikasi diaktifkan.
- Pertanyaan dengan kepercayaan rendah atau tidak terjawab dinaikkan ke dukungan.
- Sebuah percakapan dilewati ketika pesan terakhirnya berasal dari dukungan atau identitas stabilnya sudah diproses.
- Pelari membaca ulang pesan terbaru segera sebelum pengiriman dan memverifikasi bahwa balasan muncul setelahnya.
- Link tutorial produk mengarah ke halaman Gascomp, bukan langsung ke YouTube.
- Mode kirim memerlukan `--send` dan `DUOKE_AUTOREPLY_ENABLED=true`.
- Mode kirim menolak asal pengetahuan HTTP dan localhost.
- `scraping/.private/STOP_AUTOREPLY` menghentikan mode pengamatan hingga `npm run duoke:resume` menghapusnya.

<a id="target-automatic-replies-through-hermes-desktop"></a>
## Target: balasan otomatis melalui Hermes Desktop

Dicatat: 2026-09-18.
Sumber: pemilik meminta memperbarui konteks dan tugas untuk mengirim balasan pelanggan secara otomatis menggunakan pengetahuan Obsidian yang ada, Hermes Desktop sebagai kerangka kerja, dan Qwen 3.5:4b (`qwen3.5:4b`) sebagai model.

Alur kerja target adalah: menerima pesan pelanggan Duoke, mengambil pengetahuan yang relevan dari perpustakaan Obsidian lengkap yang terhubung, menghasilkan respons berbasis fakta melalui Hermes Desktop dengan `qwen3.5:4b`, memvalidasinya, dan secara otomatis menyediakannya ke percakapan pelanggan yang tepat melalui headless Chrome. Balasan yang memenuhi syarat tidak memerlukan persetujuan manual untuk setiap pesan; pertanyaan yang belum terpecah masih mengikuti aturan pengiriman dan eskalasi di atas. Jangkauan Obsidian yang ada tidak boleh dikurangi menjadi 35 catatan starter kurasi.

Ini menggantikan operasi hanya draf sebagai tujuan produk akhir. Alur kerja draf di bawah ini tetap merupakan alat persiapan dan verifikasi. Panggilan Python Agent langsungnya tidak menetapkan bahwa Hermes Desktop adalah perancah; integrasi Desktop harus diimplementasikan dan diverifikasi secara terpisah. Jangan mengganti pekerja Python mandiri untuk perancah Desktop yang diminta tanpa merekam dan menyelesaikan perbedaan tersebut dengan pemilik.

Pemilik ingin instruksi langkah demi langkah dan akan memulai otomatisasi secara pribadi. Konteks/penugasan pembaruan ini mencatat perilaku pengiriman otomatis yang dimaksud; tidak meminta memulai proses, menghapus kontrol berhenti, atau mengirim pesan sekarang. Tidak ada alasan tambahan untuk perancah/model yang dipilih yang dinyatakan.

Penerimaan: setelah pemilik memulai alur kerja dari pengaturan Hermes Desktop yang didokumentasikan, pesan pelanggan masuk yang memenuhi syarat menerima satu balasan berbasis fakta menggunakan `qwen3.5:4b` dan sumber Obsidian yang ada. Pengiriman diverifikasi dan direkam; pemrosesan duplikat, pesan baru, balasan penjual, pengetahuan yang berubah, dan kontrol berhenti aktif mencegah pengiriman yang tidak pantas. Berikan instruksi mulai, pantau, dan hentikan yang dapat ditindaklanjuti sebelum pemilik menjalankannya.

Kesenjangan implementasi dan bukti harus berada di dalam [active task](../../work/handoffs/handoff-duoke-hermes-active-v2.md).

<a id="desktop-implementation-and-owner-corrections"></a>
### Implementasi Desktop dan koreksi pemilik

Diagnostik pemulihan sesi (2026-09-18): adaptor Desktop menggunakan rute `https://web.duoke.com/#/dk/main/chat` yang diverifikasi oleh pemilik. Perubahan snapshot sesi tersimpan menginvalidasi browser MCP yang dikunci dan memuat ulang header permintaan yang disimpan sebelum operasi berikutnya; snapshot yang hilang menutup browser tersebut. Ini tidak memperbarui login yang ditolak server atau menetapkan kelangsungan sesi. Kesalahan MCP mempertahankan alasan adaptor yang diizinkan tanpa mengekspos data penyedia. Prompt terjadwal harus melaporkan kesalahan terbatas kepada operator; `[SILENT]` dipreservasi untuk polling sukses, bebas kesalahan, tanpa tugas. Perumusan prompt bukan bukti kepatuhan model atau pengiriman sukses. Lihat serah terima aktif untuk verifikasi dan penyelidikan otentikasi yang tersisa.

Dicatat: 2026-09-18. Pemilik menentukan setiap toko Duoke terhubung dan bahasa yang sudah digunakan di Obsidian. Tidak ada alasan lebih lanjut yang dinyatakan. Ini menggantikan default hanya bahasa Inggris dari pelari draf untuk jalur pengiriman Desktop.

Profil Hermes `duoke-support` khusus menggunakan model lokal `qwen3.5:4b` dan server MCP proyek dengan alat status, pencarian, polling, dan balasan. Ia mengambil korpus terhubung lengkap, menawarkan jawaban sumber yang memenuhi syarat, dan mengirim hanya jawaban terpilih tepat dalam bahasa aslinya. Pengambilan Desktop memungkinkan referensi admin Q&A yang memenuhi syarat; jalur draf legacy terpisah mempertahankan kebijakan peninjauannya. Indeksasi setiap dokumen tidak membuktikan bahwa setiap jawaban relevan dapat diambil. Pertanyaan pelanggan yang belum terjawab memerlukan serah terima WhatsApp yang dijelaskan di bawah ini; jalur pengiriman saat ini masih membutuhkan mekanisme kandidat serah terima yang diverifikasi.

Jembatan harus memastikan bahwa SDK mikro-aplikasi ada pada aplikasi Vue dan koneksi obrolannya online sebelum menyiapkan pengiriman. SDK tidak perlu ada di jendela luar karena Duoke menggunakan mikro-aplikasi. Sebuah dispatch Vuex yang selesai bukan bukti penerimaan: Duoke menangkap kesalahan penyedia secara internal. Periksa `pendingFlag` pesan yang dimutasi dan tetap memerlukan catatan riwayat penjual baru yang cocok. Emit hanya alasan kegagalan terbatas tanpa payload penyedia/klien mentah. Simpan percobaan yang tidak pasti; jangan pernah mencoba mengulanginya secara otomatis.

Jembatan pengiriman menggunakan aksi `Chat/send-message` dari aplikasi Duoke yang telah otentikasi. Sebelum mengirim, ia memeriksa ulang pesan terbaru, tanda tangan pengetahuan, dan kontrol stop/enable. Ia mendedikasikan setiap pesan masuk sebelum mencoba pengiriman, lalu memverifikasi pesan penjual baru dengan jawaban sumber yang tepat. Pengiriman yang tidak pasti tidak pernah diulang secara otomatis. Catatan audit menghilangkan teks pesan pelanggan.

Setup membuat jadwal yang dihentikan. Pemilik mengaktifkan gerbang pengiriman pribadi, memverifikasi penjadwal Hermes, dan melanjutkan tugas di Desktop. Backend Desktop yang terpasang dapat menjalankan penjadwalnya sendiri; gerbang terpisah adalah alternatif, bukan selalu prasyarat. Jendela saja tidak membuktikan eksekusi tugas. Lihat [operator steps](../../setup/duoke-hermes-desktop.md) dan serah terima berjangka untuk bukti penerimaan aktual; tinjauan sumber atau pengiriman simulasi bukan penerimaan langsung.

<a id="customer-problem-resolution-and-whatsapp-handoff"></a>
### Penyelesaian masalah pelanggan dan serah terima WhatsApp

Dicatat: 2026-09-18.
Sumber: pemilik menyediakan balasan permintaan pengembalian yang salah yang membahas mode pratinjau, tugas masuk, nama alat, dan artefak percakapan internal. Pemilik menyatakan bahwa pelanggan ingin masalah mereka diselesaikan, kasus yang tidak terjawab harus dikirim ke WhatsApp, dan semua pengetahuan Obsidian yang ada harus mendukung jawaban.

Keputusan:

- Berrespons sebagai Ayu dari Gascomp dengan bantuan singkat dan praktis untuk masalah aktual. Teks yang menghadap pelanggan tidak boleh mengandung nama alat, pesan sistem/lanjutan, identifikasi profil, status pratinjau, jumlah antrian, kutipan internal, atau detail audit. Diagnosa teknis hanya berlaku dalam respons operator yang diminta secara eksplisit. Pertanyaan produk/dukungan di Desktop secara bawaan menghasilkan pratinjau balasan pelanggan.
- Cari seluruh cakupan referensi Obsidian yang terhubung sebelum menyimpulkan bahwa jawaban tidak tersedia. Ambil Q&A admin dan prosedur/pelajaran yang relevan, mencocokkan penulisan ekuivalen dan produk yang sesuai. Pencarian ulang yang dibatasi dapat memulihkan pencocokan yang terlewat. Deskripsi katalog bukan pengganti kebijakan.
- Bedakan jawaban yang hilang dari indeksasi tidak lengkap, pengambilan gagal, filter keanggotaan yang ketat, atau pemilihan alat yang salah. Dokumentasikan cakupan sumber dan mengapa hasil dikecualikan; angka jumlah saja tidak membuktikan bahwa mekanisme tersebut bekerja. Jangan gunakan hasil status atau polling sebagai pengetahuan dukungan.
- Ketika pengetahuan yang relevan tidak dapat menyelesaikan masalah, berikan serah terima WhatsApp singkat ke admin Gascomp menggunakan kontak dukungan resmi yang diverifikasi. Ikuti konfigurasi [support contact](../features/support.md) yang sudah ada, bukan nomor baru yang diciptakan. Jangan mengklaim bahwa kasus telah diteruskan kecuali tindakan tersebut terjadi. Kontak yang hilang adalah masalah konfigurasi operator; jangan pernah membuat tautan yang tidak diverifikasi.
- Tanyakan satu klarifikasi fokus hanya jika memungkinkan solusi bersumber. Hindari pertanyaan berulang atau pengumpulan detail pesanan ketika masalah memerlukan penanganan admin. Jangan pernah menjanjikan kelayakan pengembalian, persetujuan, uang, atau waktu tanpa bukti sumber yang berlaku.

Penerimaan: Regulator mengembalikan permintaan menggunakan panduan pengembalian Obsidian yang berlaku jika tersedia. Jika tidak, ia menghasilkan transfer resmi WhatsApp singkat tanpa penjelasan operasional. FAQ yang dikenal dengan penulisan berbeda mengambil jawaban adminnya; pencocokan produk yang tidak relevan tidak dapat menyediakan kebijakan yang dibuat-buat. Permintaan status operator eksplisit masih dapat mengekspos diagnostik yang sesuai secara terpisah.

Bukti implementasi: Template prompt interaktif dan terjadwal diperbarui dan disinkronkan melalui refresh profil yang dimiliki. Penutupan korpus lengkap, pencocokan semantik yang kuat, tujuan WhatsApp runtime yang diverifikasi, dan pengiriman transfer otomatis tetap menjadi tugas penerimaan; penulisan prompt saja tidak mengimplementasikan atau memverifikasi kemampuan tersebut.

<a id="reference-based-replies-and-continuous-operation"></a>
### Balasan berbasis referensi dan operasi berkelanjutan

Hermes mengkoordinasi seluruh alur kerja admin-Referensi Obsidian dan Chrome tanpa antarmuka (headless) membaca/kirim di Duoke. Qwen `qwen3.5:4b` tetap menjadi model lokal yang dipilih. Pertahankan ruang lingkup semua toko, jawaban bahasa sumber, Ayu, dan startup live yang dikelola pemilik. Tujuannya adalah layanan terawasi 24/7 dengan keadaan yang tahan lama dan pemulihan sesi/pemulihan ulang. Mode tanpa antarmuka saja tidak menetapkan uptime. Jawaban pelanggan mengikuti kontrak resolusi dan WhatsApp di atas; operasi live tetap belum diverifikasi.

<a id="customer-facing-identity"></a>
### Identitas yang terlihat pelanggan

Sumber: koreksi pemilik pada 18 September 2026. Agen menjawab sebagai Ayu dari Gascomp; kalimat perkenalan berbahasa Indonesia adalah `Saya Ayu dari Gascomp, ada yang bisa saya bantu?`. Sapaan atau pertanyaan identitas dalam percakapan interaktif tidak perlu memanggil alat. Balasan untuk pelanggan tidak boleh memperkenalkan agen sebagai asisten pengodean atau menjelaskan mekanisme internal. Perbaikan SOUL interaktif telah diuji pada satu sapaan `halo` melalui backend Hermes terpasang tanpa panggilan alat; jalur pengiriman keluar masih memerlukan penanganan identitas deterministik dan verifikasi tersendiri.

<a id="interactive-chat-and-scheduled-execution"></a>
### Percakapan interaktif dan eksekusi terjadwal

Percakapan operator di Hermes Desktop dan pekerjaan kotak masuk terjadwal memiliki tujuan berbeda. Sapaan dan pertanyaan produk interaktif tidak boleh dengan sendirinya memeriksa kotak masuk pelanggan. Pertanyaan produk menggunakan pencarian referensi lokal baca saja; pemeriksaan kotak masuk memerlukan tugas terjadwal atau permintaan operator yang eksplisit. Refresh profil menyelaraskan SOUL interaktif dan prompt terjadwal sambil mempertahankan keadaan jeda/aktif pekerjaan. Berhasilnya konfigurasi atau jendela Desktop yang terbuka belum membuktikan bahwa jadwal berjalan atau balasan terkirim.

<a id="response-latency"></a>
### Latensi respons

Pengujian sapaan nyata melalui backend Hermes terpasang pada 18 September 2026 membutuhkan 39,8 detik untuk permintaan model dengan 3.266 token masukan, 13 token keluaran, dan tanpa panggilan alat. Ini adalah pengukuran satu skenario, bukan SLA atau bukti percepatan. Selidiki kinerja model/runtime secara terpisah dari keterlambatan polling kotak masuk. Perubahan ukuran konteks lokal di bawah ini menyelaraskan kapasitas, tetapi tidak menjanjikan respons lebih cepat.

<a id="local-model-context-alignment"></a>
### Penyelarasan konteks model lokal

Alokasi konteks Ollama dan Hermes harus setuju. `npm run duoke:desktop -- model-context` mengunci Ollama `num_ctx` dan Hermes `model.context_length` pada 65.536 untuk bobot lokal `qwen3.5:4b` yang ada, dengan cadangan pribadi dari tag lama dan konfigurasi profil. Setup termasuk batas Hermes; pemeriksaan kesiapan menolak penimpa model yang hilang atau berbeda. Ini menghindari menafsirkan maksimum pelatihan sebagai kapasitas yang dialokasikan secara lokal. Ini tidak menjamin generasi lebih cepat atau riwayat tanpa batas. Lihat [prosedur pemulihan](../../setup/duoke-hermes-desktop.md#recover-from-truncated-responses).

<a id="hermes-agent-reply-drafts"></a>
## Draf balasan agen Hermes

Alur kerja Hermes pertama membaca pesan masuk Duoke dan menyiapkan draf lokal untuk tinjauan operator. Ia tidak pernah mengisi komposer, mengirim balasan, mengubah percakapan, atau memperbarui keadaan diproses dari pelari pengiriman yang ada. Hermes Desktop mungkin tetap terinstal dan terbuka; pekerja memanggil sumber Python Hermes Agent lokalnya secara langsung dengan rumah sementara khusus, alat dinonaktifkan, dan titik akhir model loopback. Ia tidak mengotomatisasi UI Desktop.

`scraping/duoke/reply/hermes_drafts.py` menggunakan Google Chrome tanpa antarmuka dengan konteks terisolasi. Halaman lokal minimal yang disajikan di asal Duoke hanya membaca dua titik akhir percakapan/riwayat yang diverifikasi di bawah ini. Tidak ada skrip aplikasi Duoke yang berjalan, dan penyaluran jaringan menolak semua permintaan lain. Sesi arsip pribadi yang ada menyediakan otentikasi; kredensial dan pesan mentah tidak pernah dicatat. Filter toko disimpan dipertahankan, dan argumen toko opsional dapat mempersempit ruang lingkup tersebut. Setiap lompatan dibatasi dan melaporkan ketika batas percakapan meninggalkan pekerjaan tambahan di luar lompatan tersebut.

Pengetahuan menggabungkan catatan `obsidian/customer-support/` yang dikurasi dengan arsip Obsidian Duoke lengkap yang dikonfigurasi, termasuk `Percakapan` dan `Produk`. Jalur sumber lengkap berasal dari `--source-vault`, `DUOKE_HERMES_SOURCE_VAULT`, `GASCOMP_AI_SOURCE_VAULT`, atau jalur sumber pekerja website lokal yang disimpan, dalam urutan tersebut. `--vault` memilih folder kurasi yang berbeda; `--curated-only` secara eksplisit menonaktifkan arsip lengkap. Arsip dikonfigurasi yang tidak valid gagal validasi daripada jatuh kembali diam-diam ke folder kurasi kecil.

Semua dokumen arsip yang dapat dibaca diindeks secara lokal. Ekstrak katalog sumber memperluas cakupan fakta; sejarah tetap menjadi konteks yang dapat dicari untuk tinjauan operator. Balasan historis ditandai sebagai memerlukan tinjauan dan tidak dapat menjadi jawaban yang disetujui secara diam-diam. Referensi catatan terkait disertakan terpisah dari sitasi jawaban. Pekerja tidak menulis ulang baik vault maupun mengunggah korpus lengkap. Hermes menerima hanya fragmen yang layak dan terbatas serta teks masuk yang telah direduksi. Draf bahasa Inggris memerlukan ID sumber yang divalidasi; bukti yang hilang, kesalahan model, lampiran yang tidak didukung, dan kasus klarifikasi/serah terima memerlukan tinjauan operator. Laporan dan pemeriksaan lokal membedakan jumlah file/dokumen sumber dari entri jawaban yang diekstrak.

Hanya sejarah lengkap yang pesan terakhirnya berasal dari pelanggan dapat menghasilkan draf. Pekerja membaca ulang sejarah setelah generasi dan membuang pesan yang berubah atau balasan penjual. Perubahan pada catatan apa pun yang dikurasi atau sumber lengkap selama satu putaran membuat outputnya tidak valid, bahkan ketika teks jawaban yang diekstrak tidak berubah. Mode Watch memanfaatkan draf yang tidak berubah dalam proses berjalan dan mengganti laporan pribadi setiap putaran, mencegah draf lama dipertahankan untuk percakapan yang dilewati. `STOP_AUTOREPLY` juga menghentikan pekerja ini. Kunci satu-proses mencegah pelari draf yang tumpang tindih. Tidak ada layanan yang diinstal atau dimulai secara otomatis.

Hasil hidup dalam `scraping/.private/duoke-drafts/latest.json` yang diabaikan, termasuk referensi percakapan/pesan yang di-hash, sitasi catatan, status tinjauan, waktu tempel, dan nol jumlah pengiriman. Draf adalah saran yang diperiksa pada waktu yang direkam; operator harus memeriksa konteks percakapan saat ini sebelum menggunakannya.

Lihat [setup and commands](../../setup/duoke-hermes-drafts.md) dan [Hermes Duoke handoff](../../work/handoffs/handoff-duoke-hermes-active-v2.md).

<a id="operator-workflow"></a>
## Alur kerja Operator

```bash
npm run duoke:login
npm run duoke:inspect
npm run duoke:chat:capture
npm run duoke:knowledge:build
npm run duoke:knowledge:export
npm run duoke:reply:dry-run
```

Operator harus memilih toko dan periode sejarah yang benar, mengonfigurasi pemilih dari akun yang diotorisasi, memeriksa audit pribadi, dan memverifikasi dry run sebelum mengaktifkan pengiriman.

Status: pipa data, alur review Obsidian, jalur persetujuan, mesin pengambilan, audit, kontrol berhenti, dan runner headless telah diimplementasikan. Penangkapan sejarah produksi, verifikasi pemilih, dan pengiriman nyata memerlukan sesi Duoke yang diperbarui dan diotorisasi. Tidak ada pesan pelanggan yang dikirim selama implementasi.

<a id="full-conversation-archive"></a>
## Arsip percakapan lengkap

`scraping/duoke/chat/archive_duoke_chats.py` mengekspor percakapan yang tersedia ke akun yang diotorisasi menggunakan HTTPX. Titik akhir baca yang diverifikasi adalah `POST /api/v1/im/conversation/queryConversationList` dan `GET /api/v1/im/message/list` pada `https://web.duoke.com`. Transport ini hanya mengizinkan pasangan metode/ruang jalan tersebut. Ini mengikuti kursor percakapan hingga `hasMore` menjadi false, meminta setiap halaman pesan, mendeduksipasi ID pesan sumber, dan membandingkan jumlah unik melawan `totalSize`. Paginasi yang tidak terduga, total yang berubah, atau identitas percakapan yang tidak cocok tidak dapat menghasilkan hasil lengkap.

Konfigurasi sesi tetap berada di `scraping/.private/chat-archive/session.json` yang diabaikan. Ini berisi `headers`, `list_url`, `list_body`, dan `message_url` yang diperoleh dari permintaan browser yang diverifikasi; jangan pernah berkomitmen atau mencetak kredensial ini. Perbarui file ini dari sesi yang baru diotorisasi jika otentikasi kadaluwarsa. Riwayat mentah, tangkapan daftar, dan manifest penyelesaian tanpa konten tetap berada di bawah `CHAT_ARCHIVE_DIR` yang terpusat. Penangkapan default menjadi tiga percakapan bersamaan, dengan permintaan yang diatur secara global dan pengulangan terbatas untuk kesalahan transport, HTTP 429, dan kesalahan server.

```bash
scraping/.venv/bin/python -m scraping.duoke.chat.archive_duoke_chats \
  --vault "/absolute/path/to/existing/Obsidian vault"
```

Tambahkan `--resume` untuk menggunakan daftar snapshot yang sebelumnya selesai dan tidak berubah, serta file riwayat yang utuh. Hilangkan opsi ini untuk enumerasi baru yang mencakup percakapan yang dibuat baru. Resume tidak menemukan percakapan yang dibuat sejak saat snapshot daftar disimpan.

Catatan dan `Conversation archive index.md` ditulis langsung ke dalam `Duoke/Percakapan/` di dalam vault yang ditentukan. Nama indeks yang unik menghindari bentrokan dengan catatan yang dibuat oleh pemilik di direktori tersebut. Identitas sumber percakapan/toko/platform menghasilkan nama file ter-hash yang stabil; konten yang ditulis secara manual di bawah penanda arsip dipertahankan pada jalannya berikutnya. Gunakan vault pribadi di mana direktori arsipnya diabaikan oleh Git. Vault `douke-chat` milik pemilik sudah mengabaikan seluruh pohon `Duoke/Percakapan/`-nya.

Transkrip mempertahankan bahasa sumber. Judul dan metadata yang dihasilkan menggunakan Bahasa Inggris, dengan waktu stempel UTC. Kode pengirim 1 memetakan ke pelanggan dan 2 ke penjual; kode lainnya tetap tidak diketahui. Catatan menerapkan redaksi otomatis, yang bukan jaminan bahwa setiap identifikasi telah dihapus. Binari lampiran tidak didownload, dan beban sumber lengkap tetap berada dalam arsip JSON pribadi. Catatan ini adalah sumber historis yang belum ditinjau; mengekspor mereka tidak menyetujui jawaban, mengimpornya ke dalam aplikasi, atau mengaktifkan balasan otomatis.

Pengambilan data terverifikasi pada 2026-09-17: daftar tanpa filter berakhir setelah 18 halaman dengan 881 percakapan di tujuh toko (596 Shopee, 281 TikTok, empat Lazada). Semua 901 halaman riwayat dibaca, menghasilkan 13.449 pesan unik. Setiap riwayat cocok dengan total sumber; semua 881 catatan transkrip dan tautan indeks diperiksa. Pesan yang dikembalikan mencakup periode dari 2026-04-14 hingga 2026-09-17 UTC. Ini menggambarkan riwayat yang dikembalikan ke akun ini selama jalannya, bukan riwayat penyedia yang dihapus atau tidak dapat diakses. Catatan berada dalam vault Obsidian milik pemilik di bawah `Duoke/Percakapan/`, dan jumlah verifikasi lokal disimpan di `scraping/.private/chat-archive/verification.json`.
