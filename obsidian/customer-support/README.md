# Vault jawaban dukungan pelanggan

Folder ini berisi jawaban terkurasi dan templat dwibahasa untuk Gascomp Assistant. Worker juga dapat membaca seluruh arsip Obsidian hasil pengambilan data melalui `GASCOMP_AI_SOURCE_VAULT`. Dalam mode berbasis sumber bawaan, Hermes menggunakan sumber tersebut untuk menulis penjelasan, terjemahan, dan pertanyaan lanjutan yang alami. Fakta produk harus bersumber jelas; penjelasan umum tidak boleh mengarang detail produk. Gunakan `GASCOMP_AI_RESPONSE_MODE=exact` untuk perilaku lama yang mengirim jawaban sumber persis.

<a id="current-local-pilot"></a>
## Pilot lokal saat ini

Folder ini memuat 35 entri terkurasi, termasuk enam belas kutipan katalog yang lebih lama. Worker juga mengindeks seluruh 1.334 catatan dari sumber Obsidian yang terhubung: 902 catatan percakapan dan 432 catatan produk. Isi `Archive` dan `Catalog` sebelumnya sekarang berada langsung di `Duoke/Percakapan` dan `Duoke/Produk`. Catatan indeksnya bernama `Conversation archive index.md` dan `Product catalog index.md`; tidak ada folder sumber yang dikecualikan. Cuplikan gabungan berisi 445 entri: 35 entri terkurasi dan 410 kutipan sumber persis yang memenuhi syarat.

Produk duplikat memerlukan kecocokan identitas marketplace, toko, listing, dan isi catatan. Toko, unggahan, variasi, serta revisi isi yang berbeda tetap dipertahankan; SKU yang sama saja tidak cukup untuk menghapus catatan. Migrasi mempertahankan semua catatan asli dan hanya memperbarui path serta target tautan Obsidian.

Mode berbasis sumber dapat menjelaskan fakta sumber berbahasa Indonesia dalam bahasa yang dipilih pelanggan. Mode persis memerlukan teks sumber dalam bahasa tersebut. Coba `Apa bahan PISAU-6SET?` dengan bahasa Indonesia. Lihat [alur penyiapan seluruh sumber](../../docs/setup/ai-assistance.md#connect-the-complete-scraped-obsidian-archive) untuk koneksi, laporan privat, dan pemeriksaan rilis.

<a id="authoring-format"></a>
## Format penulisan

Awalan ID `conversation-` digunakan untuk balasan percakapan singkat seperti ucapan terima kasih, konfirmasi, identitas, kabar, bantuan yang tersedia, dan penutup. Gunakan `kind: answer` serta alias pesan lengkap yang eksplisit dalam `questions`. Salam dan permintaan klarifikasi juga memerlukan kecocokan alias pesan lengkap setelah normalisasi kesopanan dan ejaan yang terbatas. Jangan letakkan fakta produk di bawah awalan ini. Dalam mode persis, pencocokan percakapan tidak boleh menyembunyikan pertanyaan tambahan yang belum didukung.

Salin `answer.md.example` ke file `.md` dan ganti seluruh placeholder. Setiap file Markdown mewakili satu jawaban dalam satu bahasa. Worker mengabaikan README ini, file tersembunyi, dan file yang tidak berakhiran `.md`. Jangan gunakan symlink.

Skema penulisan tetap kompatibel dengan kedua mode respons. Isi sumber dipertahankan dalam cuplikan; respons berbasis sumber boleh menjelaskannya ulang.

Baris pertama harus `---`, diikuti objek metadata JSON, lalu baris penutup `---`. Sisanya adalah kutipan sumber yang dapat digunakan kembali, sekaligus jawaban akhir untuk pelanggan dalam mode persis. Setiap karakter setelah baris baru pada pembatas penutup dipertahankan, termasuk baris kosong awal, spasi, dan baris baru terakhir. CRLF dinormalisasi menjadi LF saat dibaca. Worker tidak pernah menulis ulang catatan asli. Hanya mode persis yang mewajibkan jawaban yang ditampilkan sama persis dengan isinya. Teks biasa dan tautan HTTPS publik dapat digunakan; wikilink Obsidian serta tujuan lokal atau non-HTTPS ditolak.

Metadata wajib:

- `id`: pengenal ASCII huruf kecil yang stabil, maksimal 80 karakter, menggunakan huruf, angka, `.`, `_`, atau `-`.
- `kind`: `answer`, `greeting`, `clarification`, atau `handoff`.
- `language`: `en` atau `id`.
- `questions`: satu sampai 50 pertanyaan tidak kosong atau variasi frasa dalam bahasa tersebut, masing-masing maksimal 500 karakter. Ini adalah alias pencarian, bukan teks jawaban.
- `sku`: SKU produk persis yang bersifat opsional dan hanya berlaku untuk entri `answer`. Kosongkan untuk jawaban umum.

Sebelum aktivasi, sediakan tepat satu `greeting`, satu `clarification`, dan satu `handoff` untuk **setiap** bahasa. Tulis kedua bahasa cadangan secara eksplisit agar kegagalan layanan tidak bergantung pada terjemahan model. Teks handoff harus menjelaskan bahwa pelanggan dapat memilih WhatsApp tanpa mengklaim pesan telah terkirim. Situs menambahkan tautan WhatsApp yang dikonfigurasi ke dalam pesan handoff tanpa mengubah teks jawabannya. Situs tidak menampilkan tindakan WhatsApp permanen di bawah kotak percakapan.

Isi jawaban tidak boleh kosong dan maksimal 12.000 karakter. Setiap catatan dibatasi 64 KB dan cuplikan gabungan dibatasi 2.000 entri. Seluruh publikasi terserialisasi, termasuk metadata dan overhead JSON, harus muat dalam 4 MiB data UTF-8. ID harus unik pada kedua bahasa; gunakan ID terpisah seperti `welcome-en` dan `welcome-id`.

Worker memeriksa perubahan setiap detik, membatalkan versi saat ini sebelum menggantinya, lalu menerbitkan cuplikan lengkap yang telah divalidasi. Catatan yang rusak, templat yang hilang, sumber yang dihapus, atau ID duplikat menonaktifkan jawaban berbasis sumber. Backend mempertahankan templat handoff terakhir yang diterbitkan saat layanan terganggu. Perubahan saat model sedang memproses mencegah jawaban lamanya dikirim.

Versi cuplikan menggunakan SHA-256 dari array JSON ringkas berformat UTF-8 yang diurutkan menurut ID, dengan kunci setiap objek diurutkan menurut alfabet dan Unicode tidak di-escape. Metadata SKU opsional yang kosong dihilangkan. Spasi dalam jawaban merupakan bagian dari hash.

Jalankan `scraping/.venv/bin/python -m scraping.ai_assistance.worker --check` setelah mengatur lingkungan worker. Perintah ini memvalidasi konfigurasi lokal dan pengetahuan tanpa menghubungkan ke situs atau model. `--watch` dan `--once` menerbitkan ke situs yang dikonfigurasi dan hanya boleh digunakan ketika publikasi tersebut diizinkan. `--probe-links` memakai Chrome lokal untuk memeriksa tautan HTTPS yang diizinkan; isi browser tidak pernah menjadi bahan jawaban.
