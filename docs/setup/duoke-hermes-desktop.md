<a id="duoke-automatic-replies-in-hermes-desktop"></a>
# Balasan otomatis Duoke di Hermes Desktop

[Kontrak produk](../product/integrations/duoke-support.md#target-automatic-replies-through-hermes-desktop) · [Verifikasi saat ini](../work/handoffs/handoff-duoke-hermes-active-v2.md)

Cakupan: perintah di bawah ini mengoperasikan jembatan sumber asli yang ada. Pemilik
[tujuan yang telah diperbaiki](../product/integrations/duoke-support.md#reference-based-replies-and-continuous-operation)
adalah referensi tanya jawab admin penuh Obsidian dengan headless Chrome di bawah Hermes untuk layanan 24/7. Jangkauan penyesuaian referensi dan pengawasan layanan tanpa pengawasan masih memerlukan verifikasi. Langkah startup latar depan ini tidak menetapkan kesiapan 24/7 atau cakupan referensi lengkap untuk balasan aktual.

Profil `duoke-support` Hermes mengekspos empat alat MCP: `duoke_status`,
`duoke_search`, `duoke_poll`, dan `duoke_reply`. Pencarian membaca referensi lokal Obsidian; polling/balas menggunakan headless Chrome. Qwen `qwen3.5:4b` memilih jawaban yang layak dari korpus Obsidian yang terhubung. Jembatan mengirim jawaban tepat dalam bahasa sumbernya. Referensi admin tanya jawab yang dapat dipertahankan dapat menyediakan referensi; filter konteks, privasi, fakta bertentangan, dan klaim volatil masih berlaku. Semua toko yang terhubung berada dalam cakupan.

<a id="refresh-an-existing-agent"></a>
## Perbarui agen yang ada

```sh
npm run duoke:desktop -- refresh
```

Ini juga mengekspos empat skema alat Duoke yang konkret langsung ke Qwen dengan mengatur `tools.tool_search.enabled: off` dan menonaktifkan alat sumber daya/prompt MCP yang tidak digunakan. Ini menghapus pembungkus penemuan umum Hermes, bukan pencarian Obsidian. Konfigurasi yang ada dibackup sebelum migrasi ini. Filter alat eksplisit tetap ada.

Ini sinkronisasi SOUL profil yang dimiliki dan prompt terjadwal sambil mempertahankan pengaturan kustom, status tugas jeda/berjalan, dan kontrol pengiriman. Direktori kerja lama yang dihasilkan di dalam repositori dimigrasikan ke `workspace/` pribadi profil sehingga AGENTS.md repositori pemrograman tidak menimpa perilaku dukungan. Instruksi lama dan konfigurasi yang dimigrasikan dibackup secara pribadi. Buka kembali **duoke-support** profil dan mulai **new chat**. Instruksi interaktif baru menangani sapaan sebagai Ayu tanpa panggilan alat dan menggunakan `duoke_search` untuk pertanyaan pengetahuan. Mereka tidak memeriksa kotak masuk pelanggan hanya karena operator mengetik sapaan atau pertanyaan produk.

Sumber percakapan utama adalah folder `Percakapan/` dari sumber vault yang dikonfigurasi, termasuk turunan-bawahnya. `duoke_search` melaporkan file yang dipindai, pasangan yang diekstraksi, pengecualian, dan referensi yang tersedia. Sekarang ia meranking pasangan admin Q&A secara independen dari pipeline publikasi website. Referensi historis ditandai `referenceOnly` adalah konteks untuk pratinjau, bukan kandidat pengiriman otomatis. Ketika hanya kasus pengembalian historis yang cocok, `historicalMatches` mempertahankan metadata sumber dan `customerReply` menyediakan transfer WhatsApp ringkas tanpa memutar kembali janji pemrosesan lama. Link kontak masih memerlukan nomor resmi yang diverifikasi. Setelah update kode jembatan, keluar sepenuhnya dan buka kembali Hermes Desktop sehingga proses MCP memuat kode yang diperbarui, lalu mulai chat `duoke-support` baru.

<a id="prepare-and-verify"></a>
## Persiapkan dan verifikasi

Jalankan perintah-perintah ini dari akar repositori. Pertahankan Ollama berjalan dengan `qwen3.5:4b` terpasang, dan cegah komputer masuk mode tidur saat otomasi aktif.

```sh
uv sync --directory scraping
npm run duoke:desktop -- setup
npm run duoke:desktop -- model-context
npm run duoke:desktop -- session --headed
npm run duoke:desktop -- check
```

Masuk di jendela Chrome yang dibuka oleh `session --headed`. Tunggu hingga `Private browser session saved. No message was sent.` pemeriksaan harus melaporkan `session: accepted`, `chrome: ready`, dan `sendAction: available`. Mode awal adalah `preview`. File sesi bersifat pribadi dan tidak boleh dibagikan.

Setup membuat profil Hermes lokal khusus dan tugas jeda **Duoke automatic replies**. Menjalankan ulang setup memperbarui konfigurasi dan prompt operator dari profil yang dihasilkan ini; ia tidak mengaktifkan pengiriman atau melanjutkan tugas. Jangan gunakan untuk memelihara profil yang disesuaikan secara manual.

<a id="preview-in-desktop"></a>
## Pratinjau di Desktop

Pertanyaan produk/dukungan harus menerima penulisan siap pelanggan di bawah [perjanjian kontrak resolusi dan WhatsApp](../product/integrations/duoke-support.md#customer-problem-resolution-and-whatsapp-handoff).
Verifikasi FAQ yang dikenal, pertanyaan dengan penulisan berbeda, permintaan pengembalian dengan kebijakan yang berlaku, dan masalah yang belum diselesaikan. Balasan tidak boleh menyebutkan alat, pratinjau/tugas, ID sumber, atau pesan lanjutan internal. Transfer WhatsApp yang diverifikasi harus menggunakan kontak resmi yang dikonfigurasi. Refresh prompt saja tidak menetapkan cakupan sumber lengkap atau memungkinkan kandidat transfer keluar.

Perkenalan pelanggan harus mengikuti [perjanjian kontrak identitas Ayu dari Gascomp](../product/integrations/duoke-support.md#customer-facing-identity).
SOUL interaktif mengimplementasikan persona yang dinamai; pengenalan keluar deterministik tetap menunda dalam tugas aktif. Sebelum memperlakukan pengiriman sebagai siap, verifikasi pengenalan, pertanyaan identitas, dan pertanyaan produk di pratinjau. Memperbarui dokumentasi tidak memperbarui sesi Desktop yang ada, jawaban sumber, atau prompt terjadwal.

1. Buka Hermes Desktop dan pilih profil **duoke-support**. Jika tidak ada, buka ulang aplikasi agar daftar profilnya diperbarui. Mulai percakapan baru setelah setup.
2. Verifikasi model yang dipilih adalah **qwen3.5:4b** dengan penyedia kustom lokal `http://127.0.0.1:11434/v1`.
3. Tanyakan: `Call duoke_status once and report mode and knowledge counts.` Alat hasil harus mengatakan `preview`; klaim tidak didukung oleh model bukan verifikasi.
4. Kirim prompt operator di `scraping/.private/duoke-desktop/desktop-prompt.txt` untuk memproses satu halaman inbox. Jembatan dapat mengembalikan pratinjau tetapi tidak dapat mengirim saat gerbang pengirimannya mati. `needsReview` atau tidak ada tugas yang layak adalah hasil yang valid; itu tidak membuktikan bahwa balasan telah dikirim. Jangan aktifkan pengiriman jika alat melaporkan kesalahan.

Proses MCP menyimpan tiket opaque selama lima menit. Poll dan balasan harus terjadi dalam run agen yang sama. Memulai ulang proses MCP menginvalidasi tiketnya.

<a id="recover-from-truncated-responses"></a>
## Pemulihan dari respons terpotong

Jika Hermes melaporkan `Response remained truncated after 4 continuation attempts`, bandingkan konteks aktif Ollama (`ollama ps`) dengan Hermes `model.context_length`. Pelatihan maksimum Qwen bukan jendela yang dialokasikan oleh runtime lokal. Konfigurasi gagal yang diamati mengalokasikan 4.096 token sementara Hermes menemukan maksimum yang jauh lebih besar. Permintaan Desktop gagal melanjutkan percakapan lama.

```sh
npm run duoke:desktop -- model-context
```

Ini menyetel Ollama `num_ctx` dan profil konteks Hermes khusus ke 65.536 untuk bobot `qwen3.5:4b` yang sama yang terinstal. Parameter model lainnya dipertahankan. Versi Hermes yang terinstal memerlukan setidaknya 64.000 token, sehingga sekadar meningkatkan Ollama menjadi 8K atau 16K tidak cukup untuk alat ini.
Alias cadangan dan konfigurasi sebelumnya dicatat secara pribadi di `scraping/.private/duoke-desktop/context-backup.json`. Pelanggan lokal lain yang menggunakan tag model yang sama juga mewarisi default yang lebih besar. Tidak ada kontrol pengiriman atau jadwal yang diaktifkan. `check` menolak penolakan atau ketidakcocokan penimpa model yang hilang.

Buka kembali Hermes Desktop, pilih **duoke-support**, dan buat **new chat** daripada mencoba ulang percakapan lama yang gagal. Riwayat lama dipertahankan. Ini memperbaiki keselarasan konteks; ini tidak menjamin generasi lebih cepat atau riwayat tanpa batas.

Dokumentasi Ollama mengatur pengaturan konteks untuk klien kompatibel dalam panduan kompatibilitasnya [compatibility guide](https://docs.ollama.com/api/openai-compatibility); perbaikan menggunakan [model creation API](https://docs.ollama.com/api/create).

<a id="enable-automatic-delivery"></a>
## Aktifkan pengiriman otomatis

Setelah pratinjau berhasil, jalankan:

```sh
npm run duoke:desktop -- enable --send
```

Ini memeriksa sesi/model/korpus dan mengaktifkan gerbang pengiriman jembatan.
Hal ini tidak memulai proses polling secara langsung. Dari titik ini, pemanggilan manual `duoke_reply` di Desktop dapat mengirim balasan pelanggan yang memenuhi syarat.

Tugas terjadwal Hermes memerlukan penjadwal aktif. Backend Desktop terpasang diamati memulai penjadwal bawaannya untuk profil ini. Gerbang terpisah tidak selalu diperlukan; pastikan tugas Desktop berjalan sebelum memulai proses lain.
Jika penjadwal tersebut tidak tersedia, alternatif di depan adalah:

```sh
hermes -p duoke-support gateway run
```

Jika menggunakan gateway di terminal, biarkan jendela tersebut tetap berjalan. Di Hermes Desktop, di bawah profil yang sama, buka **Cron**, pilih **Duoke automatic replies**, dan pilih **Resume**. Pekerjaan ini memeriksa satu halaman hingga lima percakapan setiap menit. Eksekusi dapat memakan waktu lebih dari satu menit dengan model lokal; jangan buat salinan tambahan untuk mempercepatnya. Paginasi berlanjut dari kursor privat yang dipertahankan antar eksekusi.

Untuk pekerjaan berulang, ekuivalen CLI-nya adalah `hermes -p duoke-support cron resume <job-id>` tanpa `--run-now`. Dalam versi Hermes terpasang ini, **`resume --run-now`** dan **`resume --at`** hanya mengaktifkan kembali pekerjaan satu kali (one-shot) dan menolak pekerjaan interval. Gunakan **`cron run <job-id>`** untuk eksekusi tunggal segera yang disengaja; jangan menjalankannya secara bersamaan dengan upaya terjadwal yang sudah berjalan. Dapatkan ID dari **`cron list --all`** saat pekerjaan sedang dihentikan.

Di jendela Terminal lainnya, verifikasi:

```sh
hermes -p duoke-support cron status
hermes -p duoke-support cron list
hermes -p duoke-support cron runs
```

Penjadwalan harus berjalan dan tugas harus aktif. Tugas yang ditunda tanpa penjadwal Desktop atau gateway tidak akan dieksekusi. Status CLI gateway saja mungkin tidak dapat menetapkan kesehatan penjadwal Desktop; periksa juga eksekusi tugas aktual. Cegah Mac masuk mode tidur dan Ollama aktif.

<a id="monitor-and-stop"></a>
## Monitor dan hentikan

Periksa hasil jalankan Cron di Desktop. Private `status.json` dan `audit.jsonl` di bawah `scraping/.private/duoke-desktop/` merekam jumlah polling dan hasil pengiriman.
Hanya peristiwa audit dengan `action: sent` dan `sent: true` berarti jembatan mengamati jawaban keluar dalam riwayat percakapan. Konfirmasi jawaban pertama tersebut di Duoke. Ringkasan model saja tidak cukup.

- `preview`: gerbang pengiriman mati; tidak ada yang dikirim.
- `needsReview`: tidak ada jawaban sumber yang layak; atasi percakapan secara manual.
- `conversation_changed` / `knowledge_changed`: pengecekan ulang telah membatalkan balasan.
- `not_ready`: persiapan chat SDK gagal sebelum pengiriman; periksa autentikasi dan koneksi chat. Tidak ada upaya yang dipertahankan untuk kegagalan preflight ini.
- `uncertain`: sebuah upaya telah dipertahankan, tetapi pengiriman tidak dapat diverifikasi. Tinjau Duoke secara manual. Jembatan tidak akan mencoba pesan masuk tersebut secara otomatis. `reason` terbatas membedakan `sdk_rejected`, `sdk_not_acknowledged`, `chat_not_ready`, `account_restricted`, kesalahan transport/verifikasi, dan tiket yang cocok yang tidak diamati. Ini tidak mengekspos kesalahan provider mentah.
- `error`: periksa sesi dan layanan lokal. Jangan hapus keadaan deduplikasi untuk pulih dari kesalahan jaringan atau autentikasi.

Untuk menghentikan pengiriman baru segera:

```sh
npm run duoke:desktop -- disable
```

Lalu **Pause** pekerjaan di Desktop dan tekan **Ctrl+C** di gateway Terminal-nya.
Menonaktifkan tidak dapat menarik kembali pesan yang sudah dikirim. Marker bersama `STOP_AUTOREPLY` yang ada juga memblokir jembatan ini. Pengaturan legacy `DUOKE_AUTOREPLY_ENABLED` tidak mengaktifkan jembatan Desktop terpisah ini.

Jika autentikasi kadaluarsa, nonaktifkan pengiriman dan jeda pekerjaan. Keluar sepenuhnya dari Hermes Desktop sebelum mengulang `session --headed` dan `check`, sehingga MCP browser yang dikuncinya ditutup selama pemulihan. Buka kembali Desktop, pratinjau lagi, lalu aktifkan dan lanjutkan hanya setelah pemeriksaan lolos. Menutup Desktop adalah tindakan pencegahan pemulihan; penyebab invalidasi sesi berulang belum ditetapkan.

`authentication_required` berarti sesi disimpan mencapai layar login Duoke. Setelah memperbarui jembatan, jalankan `npm run duoke:desktop -- refresh` sementara pengiriman dinonaktifkan dan pekerjaan dijeda, lalu keluar sepenuhnya dan buka kembali Desktop untuk memuat kode baru. Snapshot sesi yang diperbarui menginvalidasi konteks browser yang dikunci; mereka tidak memperbaiki login yang ditolak oleh penyedia. Sekarang prompt terjadwal melaporkan kesalahan alat daripada menganggapnya sebagai kotak masuk kosong. Verifikasi hasil alat aktual karena penyelesaian jalanan atau respons model diam saja bukan bukti dari polling sukses.
`navigation_timeout` dan `application_not_ready` mengidentifikasi kegagalan pemuat halaman sebelumnya; `chat_not_ready` mengidentifikasi kegagalan kesiapan SDK. Jembatan membuka rute obrolan dilindungi untuk menguji sesi disimpan daripada mengandalkan redirect akar situs. Instalasi Node Playwright tidak memperbaiki autentikasi: jembatan ini menggunakan Python Playwright dari lingkungan virtual repositori. Pemeriksaan enable yang gagal tidak membuat gerbang pengiriman; melanjutkan cron saja tidak dapat mengaktifkan pengiriman.
Jangan pernah menghapus `delivery-state.json` untuk memulai ulang: itu mencegah upaya duplikat atau ambigu diulang.

<a id="verification-boundary"></a>
## Batasan verifikasi

Bukti bertanggal saat ini ada di serah terima. Uji pengiriman sintetis memeriksa pengecekan keadaan dan halaman Chrome asli dengan toko Duoke disimulasikan. Uji ini tidak membuktikan pesan pelanggan asli telah dikirim. Balasan langsung pertama yang dimulai pemilik dan jadwal Desktop berulang adalah langkah penerimaan terpisah.
