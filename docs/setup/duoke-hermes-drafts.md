<a id="duoke-reply-drafts-with-hermes"></a>
# Duoke balas rancangan dengan Hermes

[Spesifikasi perilaku](../product/integrations/duoke-support.md#hermes-agent-reply-drafts)

Panduan ini mencakup pekerja Python yang hanya menangani rancangan yang ada. Tujuan pembaruan pemilik adalah [pengiriman otomatis melalui Hermes Desktop dengan Qwen 3.5:4b](../product/integrations/duoke-support.md#target-automatic-replies-through-hermes-desktop). Perintah ini tidak mengimplementasikan alur kerja Desktop tersebut atau mengirim balasan pelanggan. Tugas baru harus menyediakan instruksi langkah demi langkah terpisah untuk pengaturan dan operasi.

<a id="local-prerequisites"></a>
## Prasyarat Lokal

- Google Chrome, lingkungan Python repositori, dan sumber Agent Hermes yang terpasang beserta lingkungannya.
- Titik akhir model kompatibel OpenAI yang tersedia secara lokal. Pekerja menggunakan `GASCOMP_AI_MODEL` kecuali `DUOKE_HERMES_MODEL` mengatasinya.
- Sesi arsip yang diotorisasi di `scraping/.private/chat-archive/session.json`.
  Skema dan titik akhirnya yang diverifikasi dimiliki oleh [spesifikasi arsip](../product/integrations/duoke-support.md#full-conversation-archive). Token yang kadaluarsa harus diperbarui dari sesi browser yang diotorisasi; pekerja tidak pernah mencetak konten sesi.
- Catatan Markdown yang dikurasi mengikuti
  skema gudang jawaban di `douke-chat/knowledge/approved/Douke Knowledge Base/customer-support``/README.md`, bagian `authoring-format`.

[Hermes Python library](https://hermes-agent.nousresearch.com/docs/guides/python-library)
menyediakan antarmuka Agent. Adapter terisolasi yang ada menonaktifkan alat agent, konteks pribadi, memori, persistensi, dan fallback model eksternal. Hermes Desktop itu sendiri tidak perlu dikendalikan atau dikonfigurasi ulang.

<a id="configuration"></a>
## Konfigurasi

Atur penyetuan opsional di `.env.local` atau lingkungan pekerja:

| Variabel | Default |
| --- | --- |
| `DUOKE_HERMES_ROOT` | `GASCOMP_AI_HERMES_ROOT`, kemudian `~/.hermes/hermes-agent` |
| `DUOKE_HERMES_PYTHON` | `<Hermes root>/venv/bin/python` |
| `DUOKE_HERMES_MODEL` | `GASCOMP_AI_MODEL` |
| `DUOKE_HERMES_MODEL_BASE_URL` | `http://127.0.0.1:11434/v1` |
| `DUOKE_HERMES_SOURCE_VAULT` | `GASCOMP_AI_SOURCE_VAULT`, kemudian jalur sumber pekerja AI lokal yang disimpan |

Gunakan `--vault /absolute/path/to/curated/answers` untuk mengatasinya
`douke-chat/knowledge/approved/Douke Knowledge Base/customer-support`. Ini adalah lapisan yang dikurasi, bukan seluruh database.
Sumber lengkap terhubung secara terpisah melalui `--source-vault` atau konfigurasi sumber di atas. Harus menunjuk ke direktori `Duoke` yang berisi `Percakapan` dan `Produk`; tidak perlu menyalin atau mengubah format catatan tersebut. Jalur yang disimpan dibaca dari
`scraping/.private/ai-assistance/services/worker-environment.json`; hanya jalur sumber yang digunakan kembali, bukan kredensial situs web atau pengaturan pekerja lainnya.

Pemeriksaan lokal melaporkan catatan yang dikurasi, file sumber, dokumen yang diindeks berdasarkan jenis, file yang dikeluarkan, paragraf yang diekstrak, dan entri gabungan. Ini memvalidasi konfigurasi sumber dan struktur sesi tanpa memeriksa konektivitas Chrome autentikasi atau model secara langsung. Gunakan `--curated-only` hanya untuk sengaja menonaktifkan sumber lengkap. Sumber yang dikonfigurasi yang hilang atau tidak valid lainnya akan gagal pemeriksaan.

```bash
npm run duoke:drafts:check
npm run duoke:drafts -- --limit 5
npm run duoke:drafts:check -- --source-vault "/absolute/path/to/Duoke"
npm run duoke:drafts -- --shop-id STORE_ID --limit 5
npm run duoke:drafts -- --watch --interval 30 --limit 5
```

`--shop-id` dapat diulang dan tidak dapat memperluas filter toko sesi yang disimpan.
`--session` memilih file sesi pribadi. `--max-history-pages` secara default 20; percakapan yang lebih besar menghasilkan kesalahan tinjauan daripada draf dari riwayat parsial. Batas berlaku per lompatan. Mode pengamatan kembali ke daftar saat ini yang terbatas; ia tidak menjamin pengosongan setiap percakapan dalam inbox besar. `limited: true` mencatat bahwa sumber memiliki lebih banyak percakapan di luar lompatan saat ini.

<a id="review-and-stop"></a>
## Tinjauan dan hentikan

Buka `scraping/.private/duoke-drafts/latest.json` secara lokal. Entri dengan `status: draft` berisi teks draf bahasa Inggris dan kutipan catatan Obsidian relatif. Untuk kutipan dengan `vault: source`, selesaikan catatan terhadap `sourceVault` laporan; kutipan lain diselesaikan terhadap `vault`. `relatedNotes` mencantumkan temuan pencarian untuk konteks operator, termasuk catatan historis ditandai `requiresReview`; ini bukan bukti jawaban yang disetujui secara otomatis. `needs_review` berarti pekerja tidak dapat menghasilkan jawaban berbasis fakta yang divalidasi; `error` menunjukkan kegagalan pembacaan percakapan atau langkah generasi. Laporan berisi referensi sumber di-hash, jadi gunakan arsip pribadi untuk memetakan referensi ke percakapannya bila diperlukan. Tidak ada teks pelanggan dalam ringkasan terminal. Pertahankan artefak ini pribadi dan di luar komitmen.

Laporan digantikan setiap lompatan. Ia berisi `checkedAt` timestamp dan bukan jaminan hidup bahwa pelanggan tidak mengirim pesan lebih lanjut. Periksa percakapan saat ini sebelum menggunakan draf secara manual. Perintah ini tidak memiliki mode kirim.

`npm run duoke:stop` juga menghentikan pemrosesan draf. Penanda hentikan yang ada dipertahankan. Perintah `duoke:resume` bersama menghapus penanda untuk pekerja ini dan pengirim pengiriman terpisah, sehingga hanya lanjut sebagai operator yang berwenang setelah memeriksa keadaan pengirim lain. Ctrl-C mengakhiri proses ini. Tidak ada layanan latar belakang yang diinstal oleh perintah ini.

<a id="verification"></a>
## Verifikasi

Jalankan `npm run duoke:test` untuk suite regresinya. Tes draf melatih Chrome Google headless asli terhadap respons API sintetis, termasuk daftar izin permintaan, penolatan pesan kadaluarsa, perubahan pengetahuan, perilaku henti, validasi sumber, dan penggunaan kembali draf yang tidak berubah. Mereka tidak menghubungi akun pelanggan atau memerlukan model berjalan. Ketersediaan model harus diperiksa secara terpisah.
