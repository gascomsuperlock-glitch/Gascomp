<a id="ai-assistance-setup"></a>
# Pengaturan bantuan AI

[Spesifikasi perilaku](../product/features/ai-assistance.md)

<a id="prerequisites-and-boundaries"></a>
## Prasyarat dan batasan

- Terapkan migrasi bantuan AI berurutan melalui `202609170003` ke database pengembangan terisolasi terlebih dahulu. Gunakan alur rilis yang ada untuk rilis produksi yang selanjutnya diotorisasi.
- Konfigurasi `GASCOMP_AI_ASSISTANCE_ENABLED=true` pada situs web pengembangan dan `GASCOMP_AI_WORKER_TOKEN` acak yang berbeda dengan panjang minimal 32 karakter. Pertahankan flag deployment publik false hingga pemeriksaan penerimaan berhasil.
- Mac memerlukan lingkungan Python repositori, instalasi Hermes dengan ketergantungan berfungsi, endpoint model lokal yang diinstal pemilik, dan Chrome.
- Mac harus tetap menyala, terjaga, dan terhubung. Pengawasan proses tidak dapat menjamin layanan selama tidur, pemadaman listrik, atau kehilangan jaringan.

Situs web menyimpan pengetahuan dan percakapan dalam tabel Supabase pribadi. Tidak ada dalam pengaturan ini yang mengotorisasi penulisan produksi atau mengirim pesan WhatsApp. Jangan pernah mengekspos endpoint model lokal, port debugging Chrome, atau token pekerja ke internet atau bundle klien.

<a id="independent-retention-scheduler"></a>
### Penjadwal retensi independen

Migrasi menyediakan fungsi `gascomp_ai_cleanup()` pribadi dan mendaftarkan `gascomp-ai-retention` setiap 15 menit ketika `pg_cron` sudah terinstal. Pembersihan menghapus sesi yang lebih tua dari 30 hari dan meruntuhkan pesan/job mereka, termasuk saat chat AI dinonaktifkan. Jendela retensi praktis adalah sekitar 30 hari plus interval penjadwalan. Fungsi juga berjalan selama operasi antrian normal, tetapi lalu lintas antrian bukan pengganti penjadwal.

Sebelum aktivasi publik, verifikasi bahwa job bernama ada dan aktif di `cron.job`. Jika migrasi melaporkan bahwa `pg_cron` tidak ada, aktifkan Supabase Cron melalui pengaturan database yang diotorisasi, kemudian mendaftarkan job:

```sql
select cron.schedule(
  'gascomp-ai-retention',
  '*/15 * * * *',
  'select public.gascomp_ai_cleanup();'
);
```

Monitor eksekusi job melalui Supabase Cron. Konfigurasi penjadwalan database tidak diterapkan oleh pemeriksaan kode lokal atau generator layanan Mac.

<a id="local-preview-without-a-production-migration"></a>
## Pratinjau lokal tanpa migrasi produksi

Untuk pengembangan antarmuka UI dan worker, atur `GASCOMP_AI_PREVIEW_URL` ke `http://127.0.0.1:54330` dan `GASCOMP_AI_PREVIEW_KEY` ke nilai acak yang berbeda dengan panjang minimal 32 karakter di `.env.local`. Jalankan `npm run ai:preview-db` di satu terminal dan `npm run dev` di terminal lainnya. Pertahankan proses database pratinjau berjalan saat menggunakan panel obrolan.

Jembatan pratinjau menjalankan migrasi AI SQL berurutan di dalam PGlite lokal, menyimpan data pribadi di `.data/ai-assistance/preview/postgres`. Hanya fitur AI yang menggunakan penyetelan ini; katalog dan fitur lainnya mempertahankan koneksi mereka yang ada. Ini adalah konfigurasi eksplisit yang hanya untuk pengembangan. Pengaturan yang tidak valid atau server pratinjau yang berhenti menyebabkan ketidaktersediaan, bukan fallback penulisan ke database utama. Pembangun produksi mengabaikan variabel ini. Tidak ada pengetahuan sampel atau balasan yang disemai, dan tidak ada migrasi Supabase yang diterapkan oleh perintah ini.

Database pratinjau kosong dapat dibuka dan mempertahankan percakapan, tetapi melaporkan asisten sebagai tidak tersedia hingga pengetahuan disetujui dan worker siap tersedia. Konfigurasi penyimpanan tidak memulai model. Database lokal bertahan dari restart proses, menolak jejak migrasi yang tidak kompatibel, dan melakukan pembersihan retensi saat prosesnya berjalan. Jangan gunakan jembatan pengembangan ini sebagai layanan database produksi.

<a id="knowledge-authoring"></a>
## Penulisan Pengetahuan

Baca panduan penulisan vault di `douke-chat/knowledge/approved/Douke Knowledge Base/customer-support``/README.md`.
Tulis versi bahasa Inggris dan Indonesia untuk template sapaan, klarifikasi, dan handoff, lalu tambahkan jawaban produk yang diverifikasi. Jangan gunakan obrolan pelanggan asli sebagai fixture atau salin data akun pribadi ke catatan.

Dalam mode `grounded` default, isi tubuh catatan adalah materi referensi faktual. Hermes dapat menjelaskan, memparafrasekan, dan menerjemahkan bagian yang relevan sambil mempertahankan fakta produk. Ia dapat memberikan penjelasan umum dan mengajukan pertanyaan klarifikasi yang berguna ketika jawaban sumber yang tepat tidak ada. Pertahankan data akun pribadi, klaim yang belum diverifikasi, dan instruksi perbaikan yang tidak aman di luar pengetahuan yang dapat digunakan kembali. Gunakan nama produk yang jelas, SKU, pertanyaan sumber, dan fakta yang diverifikasi daripada mencoba menulis setiap kemungkinan formulasi pelanggan.

Worker memantau perubahan yang disimpan, memvalidasi folder lengkap, dan menerbitkan snapshot versi. Edit yang tidak valid menonaktifkan kesiapan daripada melayani fakta usang secara diam-diam. Template sapaan/handoff bilingual yang diterbitkan tetap berguna untuk tampilan awal dan kegagalan layanan. Worker tidak menulis ke catatan.

`GASCOMP_AI_RESPONSE_MODE=exact` mengembalikan perilaku pemilihan ID asli:
hanya isi tubuh catatan yang dipilih yang dikirim, tanpa terjemahan atau parafrase. Alias percakapan dan entri `conversation-` tetap didukung dalam mode tersebut. Mode grounded menggunakan riwayat sesi yang sama yang terbaru dan tidak lagi memerlukan sapaan yang tepat atau alias obrolan kecil untuk memiliki percakapan dukungan biasa.

<a id="connect-the-complete-scraped-obsidian-archive"></a>
### Menghubungkan arsip Obsidian yang lengkap yang discraper

Atur `GASCOMP_AI_SOURCE_VAULT` di lingkungan pribadi worker ke `Duoke` induk yang berisi `Percakapan` dan `Produk`, misalnya:

```text
/Users/surya/Documents/douke-chat/knowledge/approved/Douke Knowledge Base/Duoke
```

Pekerja mengindeks file Markdown yang dapat dibaca di kedua pohon, membangun paragraf jawaban yang dapat digunakan kembali secara tepat, dan menggabungkannya dengan gudang jawaban khusus. Ia memantau semua sumber untuk perubahan yang disimpan, termasuk penambahan, pemindahan, dan penghapusan. Percakapan dan tangkapan produk langsung tersimpan di `Percakapan` dan `Produk`; catatan indeks mereka adalah `Conversation archive index.md` dan `Product catalog index.md`. Organisasi folder tidak mengecualikan pengetahuan unik. Salinan produk hanya dideduplikasi ketika identitas pasar/toko/daftar dan konten setuju. Kesamaan SKU saja tidak dapat menghapus toko yang berbeda, daftar, varian, atau sumber yang tidak teridentifikasi.
Jangan menyalin transkrip asli ke dalam folder jawaban publik. Detail pelanggan/perusahaan pribadi, janji operasional, harga/tersedia yang berubah-ubah, dan fakta yang belum diselesaikan tidak menjadi jawaban pelanggan. Dokumen tanpa jawaban yang layak tetap dapat dicari secara lokal dan dapat mengarahkan pada klarifikasi atau serah terima. Indeks transkrip privat lengkap tidak pernah disertakan dalam prompt model atau respons browser.

Ekstraksi pratinjau dan secara opsional menulis artefak audit pribadi:

```bash
scraping/.venv/bin/python -m scraping.ai_assistance.corpus \
  --source "../douke-chat/knowledge/approved/Douke Knowledge Base/Duoke" \
  --write
```

Perintah ini menulis hanya ke `scraping/.private/ai-assistance/full-corpus` yang diabaikan: `corpus.json`, `report.json`, dan entri staged yang dihasilkan. Ia tidak mengaktifkan pengetahuan atau mengubah salah satu sumber vault. Live worker membaca direktori sumber asli secara langsung; staging bukan langkah aktivasi tambahan. Publikasi gabungan harus muat 2.000 entri dan 4 MiB; korpus privat lengkap memiliki ukuran terpisah dan tidak diunggah.

Perintah opsional `import_duoke --write-review` dan `import_products --write-review` masih menyiapkan materi review yang bisa diedit secara manual. Aturan kepatutan pilot sempit mereka lagi tidak membatasi runtime sumber penuh. Jangan edit artefak korpus yang dihasilkan untuk membuat jawaban permanen: masukkan jawaban akhir yang dikurasi ke `douke-chat/knowledge/approved/Douke Knowledge Base/customer-support`. Mode Grounded dapat menerjemahkan fakta sumber terverifikasi ke bahasa obrolan yang dipilih. Mode Exact masih memerlukan teks sumber dalam bahasa tersebut.

Saat memperbarui preview lokal yang ada, hentikan prosesnya dan jalankan ulang `npm run ai:preview-db` untuk menerapkan migrasi `202609170003` sambil mempertahankan percakapan yang ada. Ini menambahkan riwayat sesi yang sama yang terbatas dan respons yang dihasilkan terverifikasi sambil mempertahankan respons exact legacy, sewa (leases), dan pengecekan versi. Jalankan ulang worker setelah menambahkan jalur sumber ke `worker-environment.json`; mengubah `.env.local` saja tidak memperbarui konfigurasi privat yang ada.

<a id="worker-configuration"></a>
## Konfigurasi Worker

Atur variabel lingkungan dalam proses worker, terpisah dari lingkungan website. `.env.example` mendokumentasikan nama tetapi bukan tempat penyimpanan rahasia.

| Variable | Purpose |
| --- | --- |
| `GASCOMP_AI_SITE_URL` | Asal website HTTPS; loopback HTTP hanya untuk pengembangan lokal |
| `GASCOMP_AI_WORKER_TOKEN` | Bearer secret dedikasi yang sama dengan website |
| `GASCOMP_AI_MODEL_BASE_URL` | Titik akhir API model loopback yang dipasang oleh pemilik |
| `GASCOMP_AI_MODEL` | Identifier exact yang diterima oleh titik akhir tersebut |
| `GASCOMP_AI_RESPONSE_MODE` | `grounded` (default) untuk respons alami; `exact` untuk selector legacy |
| `GASCOMP_AI_HERMES_ROOT` | Jalur instalasi sumber Hermes opsional |
| `GASCOMP_AI_HERMES_PYTHON` | Interpreter Python yang berisi dependensi Hermes |
| `GASCOMP_AI_VAULT` | Direktori jawaban dikurasi opsional; default `douke-chat/knowledge/approved/Douke Knowledge Base/customer-support` |
| `DOUKE_VAULT_DIR` | Akar vault pengetahuan opsional; default `douke-chat/knowledge/approved/Douke Knowledge Base` di samping repositori |
| `GASCOMP_AI_SOURCE_VAULT` | Jalur akar `Duoke` full scraped opsional yang berisi `Percakapan` dan `Produk` |
| `GASCOMP_AI_CHROME_CDP_URL` | Titik akhir debugging Chrome lokal |
| `GASCOMP_AI_BROWSER_HOSTS` | Allowlist eksplisit untuk probe link opsional |

Harness Hermes menggunakan rumah privat terpisah dan menonaktifkan konteks pribadi, memori pribadi, alat yang tidak terkait, dan fallback cloud. Respons Grounded membawa teks biasa, jenis respons, dasar umum/pengetahuan, dan ID sumber terverifikasi. Riwayat obrolan website terbaru dibatasi ke sesi saat ini; ia tidak mengaktifkan memori Hermes pribadi. Generasi yang tidak valid menggunakan fallback yang diterbitkan.

<a id="connect-the-local-website-worker"></a>
### Hubungkan worker website lokal

Obrolan Hermes interaktif dan worker website adalah proses terpisah. Memilih Ollama di `hermes model` mengkonfigurasi Hermes interaktif; website menggunakan konfigurasi worker eksplisit yang dijelaskan di atas.

Untuk pengembangan lokal, masukkan variabel worker ke `.env.local` yang diabaikan, dengan `GASCOMP_AI_SITE_URL=http://localhost:3000`, lalu buat konfigurasi privat sekali (Node harus mendukung `--env-file`):

```bash
node --env-file=.env.local scripts/ai-assistance/launchd.mjs --generate
```

Ini menyalin hanya variabel pekerja yang diizinkan ke dalam file pribadi dan menghasilkan definisi layanan tanpa menginstal atau mengaktifkan launchd. Jika file tersebut sudah ada, edit konfigurasi pribadi daripada merenovasinya lagi. Dengan Ollama, database pratinjau lokal, dan Next.js berjalan, mulai pekerja:

```bash
node scripts/ai-assistance/worker-launcher.mjs scraping/.private/ai-assistance/services/worker-environment.json
```

Jaga terminal tetap terbuka; `Ctrl+C` menghentikan pekerja. Jalankan hanya satu pekerja untuk pilot. Perubahan pada `.env.local` tidak memperbarui salinan privat yang dihasilkan ini; pertahankan token pekerja sinkron dengan situs web dan mulai ulang proses yang terpengaruh.
Jangan pernah menempel konfigurasi privat ke dalam obrolan atau mengkomitkannya.

Detak jantung terbaru mengonfirmasi bahwa pekerja dapat mencapai situs web. Dengan gudang kosong, ia melaporkan `ready=false`; bidang admin `workerOnline` memerlukan kesiapan dan detak jantung terbaru, sehingga tetap bernilai false hingga pengetahuan valid.
Berikan satu salam, klarifikasi, dan serah terima untuk setiap bahasa, bersama dengan catatan jawaban yang disetujui. Pekerja yang berjalan secara otomatis memvalidasi dan menerbitkan catatan yang disimpan ke situs web lokal yang dikonfigurasinya.

```bash
# Local validation only; no website publication or customer reply.
npm run ai:check

# Explicitly publish knowledge and process at most one queued message.
npm run ai:once

# Continuous worker: publication, heartbeat, and bounded job processing.
npm run ai:watch

# Optional bounded browser check. Page contents never become answer knowledge.
npm run ai:probe-links
```

Model pekerja dan endpoint adalah konfigurasi pemilik eksplisit.
Untuk `qwen3.5:4b` yang diunduh oleh pemilik, gunakan model base URL `http://127.0.0.1:11434/v1`. Selector ini menonaktifkan pemikiran untuk model `qwen3.5:*` dan meminta JSON dengan suhu nol, sehingga penalaran tidak mengonsumsi anggaran jawaban-ID 80 token. Pengaturan ini tidak menggantikan pengujian relevansi.
Endpoint harus mengimplementasikan penyelesaian percakapan kompatibel OpenAI dan mengekspos `/models` relatif terhadap basis API yang dikonfigurasi; daftar modelnya harus berisi identifikasi yang dikonfigurasi sebelum pekerja melaporkan siap.
Selector tiruan cocok untuk uji integrasi tetapi bukan bukti relevansi atau latensi model asli.

<a id="current-working-localhost-pilot"></a>
### Pilot localhost yang sedang berjalan

Pilot lokal menggabungkan 35 catatan template/percakapan/produk yang dikurasi dengan kutipan dapat digunakan dari semua 1.334 catatan sumber yang diskrapping (902 catatan percakapan dan 432 catatan produk), menghasilkan 445 entri aktif. Isi `Archive` dan `Catalog` sebelumnya telah dipindahkan ke folder induknya dengan tautan yang diperbarui; semua pengetahuan unik tetap memenuhi syarat. Jumlah jawaban yang dapat diterbitkan dapat berubah saat sumber diedit atau konflik diselesaikan; dokumen terindeks tidak haruslah entri jawaban.

Buka `http://localhost:3000`, pilih Bahasa Indonesia, dan ajukan pertanyaan produk seperti `Apa bahan PISAU-6SET?`. Model yang berakar menjelaskan fakta sumber yang relevan secara alami dan mungkin mengajukan pertanyaan lanjutan. Juga uji keluhan asli `Kenapa GRS-01 saya gak bisa nyala?`, lalu jawab klarifikasinya dalam chat yang sama. Chat baru harus tidak mengingat konteks tersebut. Respons Bahasa Inggris dapat menerjemahkan fakta sumber Bahasa Indonesia; spesifikasi yang tidak didukung harus tetap eksplisit tidak diketahui.

Pertahankan database lokal, server Next.js, Ollama, dan pekerja foreground berjalan. Peluncuran otomatis launchd, deployment produksi, dan uji ketahanan 24 jam tetap merupakan langkah rilis terpisah. Lihat spesifikasi perilaku untuk hasil uji berlabel dan batas verifikasi lokal masing-masing.

<a id="acceptance-and-rollback"></a>
## Penerimaan dan pembatalan

1. Validasi catatan bilingual dan pertanyaan yang diketahui, tidak diketahui, ambigu, dan spesifik produk terhadap model lokal yang dipilih. Verifikasi penancapan faktual, klarifikasi berguna, isolasi sejarah, dan penolatan instruksi perbaikan yang tidak aman. Termasuk gejala GRS-01 pemilik dan tindak lanjutnya, bukan hanya spesifikasi.
2. Verifikasi chat desktop/mobile, bahasa, kesinambungan sesi, dan alih WhatsApp.
3. Verifikasi penolatan akses lintas-sesi, autentikasi pekerja, snapshot tidak valid, pengiriman duplikat, restart, kehilangan jaringan, timeout, dan hasil usang.
4. Uji jeda/resume dari **AI Assistance** di panel admin yang ada.
5. Selesaikan pilot sintetik 24 jam pada website/database terisolasi. Catat durasi berlalu, pekerjaan yang diterima, alih, timeout, respons duplikat, dan pemulihan restart. Jangan gunakan akun pelanggan atau klaim ini telah lulus setelah uji asap lebih pendek.
6. Hanya setelah publikasi dan deployment disetujui pemilik, aktifkan flag fitur produksi. Periksa revisi yang dideploy dan aliran pelanggan aktual.

Jeda menghentikan pemrosesan AI baru sambil mempertahankan jalur alih. Untuk pembatalan UI, tetapkan `GASCOMP_AI_ASSISTANCE_ENABLED=false` dan deploy ulang: kontrol WhatsApp mengambang asli kembali dan percakapan tersimpan dipertahankan. Putar kedua salinan token pekerja bersama-sama jika itu terekspos. Untuk pembatalan mode respons, tetapkan `GASCOMP_AI_RESPONSE_MODE=exact` di lingkungan pekerja pribadi dan restart hanya pekerja; pertahankan migrasi database aditif dan chat yang ada.

<a id="mac-services"></a>
## Layanan Mac

Generator layanan secara default melakukan pratinjau dan tidak pernah memanggil `launchctl`. Sediakan variabel pekerja di atas melalui lingkungan lokal terpercaya Anda, lalu jalankan:

```bash
npm run ai:services
npm run ai:services -- --generate
```

Pembuatan menghasilkan `scraping/.private/ai-assistance/services/` dengan izin hanya pemilik, dua daftar properti launchd, dan `worker-environment.json`. Token disimpan hanya dalam file JSON pribadi tersebut, tidak pernah dalam plist, argumen proses, atau output pratinjau. File yang ada tidak ditimpa. Edit file tersebut secara pribadi untuk mengubah konfigurasi; pertahankan mode `600` dan restart pekerja setelahnya. Jangan pernah menempelkan JSON ke laporan atau mengkomitkannya. Peluncur membacanya saat startup, hanya meneruskan variabel pekerja eksplisit dan variabel OS dasar ke Python, dan tidak mewarisi kredensial penyedia pribadi. Launchd tidak mengambil profil shell atau file `.env`.

Pekerja yang dihasilkan menggunakan `scraping/.venv/bin/python` dari repositori; interpreter Hermes terpisah secara default menggunakan `<GASCOMP_AI_HERMES_ROOT>/venv/bin/python`. Konfigurasi `GASCOMP_AI_HERMES_PYTHON` jika instalasi Hermes Anda menggunakan interpreter lain. Eksekutor Node absolut yang digunakan selama pembuatan juga disimpan dalam plist pekerja. Regenerasi file layanan setelah memindahkan repositori atau mengubah eksekutor tersebut. Tidak ada ketergantungan yang diinstal oleh pembuat.

Chrome secara default menggunakan `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
menggunakan profil pribadi sendiri, dan mengikat CDP ke `127.0.0.1`. Layanan yang dihasilkan memerlukan `GASCOMP_AI_CHROME_CDP_URL=http://127.0.0.1:PORT` (port default `9222`).
Periksa bahwa port tersebut bebas sebelum aktivasi; jangan pernah menggunakan ulang profil browser pribadi atau mengekspos CDP melalui terowongan publik. Layanan Chrome independen dapat gagal tanpa restart pekerja. Kedua layanan restart pada kegagalan dengan throttling peluncuran 15 detik. Log adalah file `worker.log` dan `chrome.log` pribadi di dalam direktori layanan; periksa ukuran mereka secara berkala dan putar mereka saat layanan dihentikan. Log pekerja harus tetap umum dan tidak boleh berisi pesan pelanggan atau kredensial.

Setelah aktivasi runtime eksplisit diizinkan, validasi plist yang dihasilkan dan bootstrappingnya ke sesi login saat ini dari akar repositori:

```bash
AI_SERVICE_DIR="$PWD/scraping/.private/ai-assistance/services"
plutil -lint "$AI_SERVICE_DIR/com.gascomp.ai-assistance.chrome.plist"
plutil -lint "$AI_SERVICE_DIR/com.gascomp.ai-assistance.worker.plist"
launchctl bootstrap "gui/$(id -u)" "$AI_SERVICE_DIR/com.gascomp.ai-assistance.chrome.plist"
launchctl bootstrap "gui/$(id -u)" "$AI_SERVICE_DIR/com.gascomp.ai-assistance.worker.plist"
launchctl print "gui/$(id -u)/com.gascomp.ai-assistance.worker"
```

Perintah bootstrap ini mengaktifkan pekerja dan karenanya dapat menerbitkan pengetahuan serta memproses pesan pelanggan yang antrean. Jangan jalankan perintah tersebut hanya untuk memvalidasi pengaturan.
Untuk memulai secara otomatis yang diotorisasi saat login, salin file plist yang divalidasi ke dalam `~/Library/LaunchAgents/` dengan mode `600`; pertahankan JSON di lokasinya yang privat.
Layanan berjalan hanya selama pengguna tersebut sedang masuk (logged in). Sebuah reboot memerlukan login ulang, dan logout mengakhiri layanan pengguna. Mac yang bangun, daya stabil, jaringan, dan server model lokal adalah persyaratan operasional terpisah. Launchd tidak menjaga komputer tetap bangun atau memulai server model pemilik.

Untuk restart yang diotorisasi setelah mengubah konfigurasi:

```bash
launchctl kickstart -k "gui/$(id -u)/com.gascomp.ai-assistance.worker"
```

**Jeda/Selanjutnya di Panel Admin Mengatur Pemrosesan AI Tanpa Melepaskan Layanan.** Untuk menghentikan pemrosesan lokal dan Chrome sepenuhnya:

```bash
launchctl bootout "gui/$(id -u)/com.gascomp.ai-assistance.worker"
launchctl bootout "gui/$(id -u)/com.gascomp.ai-assistance.chrome"
```

Jika startup login otomatis dikonfigurasi, juga hapus hanya dua plists Gascomp berikut dari `~/Library/LaunchAgents/`. Pertahankan konfigurasi privat dan catatan sumber untuk pemulihan. Website akan menganggap pekerja offline setelah detak jantungnya kadaluarsa dan mempertahankan transfer WhatsApp. Jangan anggap pemeriksaan ulang proses sebagai pengganti uji coba 24 jam.

<a id="synthetic-transport-pilot"></a>
## Uji coba transportasi sintetis

`npm run ai:pilot` adalah simulasi kering: ia tidak melakukan permintaan atau menulis apa pun. Mode eksplisit `--run` menggantikan pengetahuan dengan fixture sintetis, membuat sesi obrolan sintetis, dan mensimulasikan pemilihan pekerja melalui endpoint website asli. Gunakan website dan database yang dapat dibuang secara eksklusif tanpa data pelanggan asli, catatan, pekerja lain, atau terowongan. Terapkan migrasi ke database tersebut terlebih dahulu, arahkan konfigurasi Supabase dari website lokal kepadanya, dan aktifkan fitur tersebut. Kedua asal website dan database harus berupa loopback. Variabel lingkungan isolasi adalah konfirmasi operator bahwa website tersebut benar-benar menggunakan database yang dapat dibuang tersebut; uji coba tidak dapat memeriksa konfigurasi database server.

Berikan `GASCOMP_AI_WORKER_TOKEN` melalui lingkungan, mencocokkan token dari website yang dapat dibuang tersebut. Jangan masukkan rahasia dalam argumen CLI. Kemudian jalankan:

```bash
export GASCOMP_AI_SITE_URL=http://localhost:3100
export GASCOMP_AI_PILOT_DATABASE_URL=http://127.0.0.1:54329
export GASCOMP_AI_PILOT_ISOLATED=true
npm run ai:pilot
npm run ai:pilot -- --run --duration-seconds 60
# Uji ketahanan transport hanya dengan fixture sintetis dan pekerja simulasi:
npm run ai:pilot -- --run --duration-seconds 86400
```

Uji singkat memerlukan sedikitnya 60 detik ditambah penyiapan karena memverifikasi tenggat waktu pelanggan yang sebenarnya. Ini adalah pemeriksaan transport untuk respons persis versi lama, bukan evaluasi kualitas percakapan berbasis sumber. Pemeriksaan ini mencakup jawaban dwibahasa dari sumber persis, serah terima ketika pertanyaan tidak diketahui, pengajuan dan penyelesaian ganda, kesinambungan serta isolasi sesi, penggantian sumber saat tugas aktif, simulasi offline/pemulihan, dan penolakan hasil yang terlambat. Durasi yang diminta adalah batas minimum; skenario awal tetap diselesaikan meskipun waktu tersebut telah terlewati. Pada durasi lebih panjang, jawaban yang diketahui untuk tiap bahasa diuji bergantian dengan jeda lima detik antarsiklus agar tetap di bawah batas sesi. Setelah selesai atau gagal, alat menonaktifkan kesiapan pekerja simulasinya dan membiarkan database fixture sintetis tersedia untuk diperiksa. Buang database itu setelahnya; jangan pernah menggunakannya untuk produksi.

Laporan JSON tanpa konten pelanggan ditulis di bawah `.data/ai-assistance/pilot/` yang diabaikan Git, menggunakan path dari akar repositori. Laporan mencakup hasil skenario, waktu berlalu, total dan maksimum latensi permintaan, jumlah jawaban dan serah terima, penolakan hasil terlambat, serta jumlah balasan duplikat. Skenario yang gagal menghasilkan kode keluar bukan nol. Laporan tidak memuat teks pesan, isi respons, token, atau cookie.

Pemeriksaan ini menguji transport website dan database dengan pemilih jawaban simulasi. Pemulihan offline disimulasikan melalui status heartbeat; pemeriksaan tidak memulai ulang launchd, Chrome, atau Hermes. Ini tidak memvalidasi relevansi model yang sebenarnya, perilaku browser, latensi model, atau pemulihan setelah proses nyata dimulai ulang. Uji singkat yang berhasil bukan hasil uji 24 jam. Penerimaan lengkap masih memerlukan model lokal yang dikonfigurasi pemilik, catatan dwibahasa yang disetujui, pemeriksaan restart layanan nyata, dan uji 24 jam terpisah dengan pekerja Hermes asli dalam lingkungan terisolasi.
