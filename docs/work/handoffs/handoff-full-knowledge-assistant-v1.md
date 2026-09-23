<a id="full-knowledge-assistant-handoff"></a>
# Penyerahan pengetahuan penuh Gascomp Assistant

Diperbarui: 2026-09-23
Status: Pekerja produksi dijalankan ulang atas izin pemilik; pemeriksaan browser belum dilakukan

<a id="objective"></a>
## Tujuan

Pemilik meminta seluruh pengetahuan di `douke-chat/knowledge` digunakan oleh Gascomp Assistant di situs web, mencakup `FAQ`, `Impor`, `Percakapan`, dan `Produk`.

<a id="what-changed"></a>
## Yang berubah

- Lemari arsip kurasi dipulihkan dari commit `213fb91^` ke `douke-chat/knowledge/approved/Douke Knowledge Base/customer-support` (37 catatan, 35 entri valid). Commit itu menghapusnya dari repositori tanpa menyalinnya ke vault baru, sehingga pekerja tidak memiliki sapaan, klarifikasi, dan serah terima wajib dan tidak dapat menerbitkan pengetahuan apa pun.
- `GASCOMP_AI_VAULT` pada `scraping/.private/ai-assistance/services/worker-environment.json` diarahkan dari `douke-web/obsidian/customer-support` yang sudah tidak ada ke lokasi vault baru. Salinan konfigurasi sebelumnya disimpan bertanggal di direktori yang sama.
- `scraping/ai_assistance/corpus.py` mengindeks keempat pohon di bawah akar `Duoke`, menambahkan jenis sumber `import-conversation`, `reference`, dan `faq`, serta menaikkan batas berkas sumber menjadi 6.000.
- `scraping/ai_assistance/import_duoke.py` mengenali transkrip tangkap ulang (`source: duoke_api_recapture` dengan `capture_id`) sebagai format arsip dan membaca SKU dari baris `SKU kartu produk:`.
- `scraping/ai_assistance/responder.py` dan `src/features/ai-assistance/model/generated-response.ts` menolak teks respons berupa muatan terserialisasi: JSON bersarang, objek berkutip tunggal, larik, blok kode berpagar, urutan escape literal, dan gema nama field skema. Kecocokan seluruh teks harus benar-benar terurai sebagai JSON agar judul listing seperti `{COD} PAKET ...` tetap lewat. Prompt sistem di `hermes_response.py` menyatakan bahwa nilai `text` dibaca pelanggan kata demi kata.
- Spesifikasi bantuan AI, panduan penyiapan, dan `douke-chat/knowledge/README.md` mencatat cakupan sumber yang baru.

<a id="current-evidence"></a>
## Bukti saat ini

Pembangunan korpus terhadap vault nyata membaca 2.372 berkas Markdown (`conversation` 902, `product` 432, `import-conversation` 1.030, `faq` 618 blok dari 7 berkas, `reference` 1) tanpa berkas sumber yang dikeluarkan. Korpus menghasilkan 2.983 dokumen privat dan 784 entri; snapshot gabungan dengan vault kurasi berisi 819 entri dan sekitar 679 KiB, di bawah batas 2.000 entri dan 4 MiB.

Dari 618 pasangan FAQ, 282 menjadi entri jawaban. Sisanya ditolak karena tidak memiliki isi yang dapat digunakan kembali, boilerplate, atau menyentuh pesanan, harga, stok, janji operasional, dan otomasi sistem. Delapan puluh tiga pasangan transkrip yang identik memakai ulang entri FAQ-nya.

`npm run duoke:test` lulus dengan 202 uji dan `npm run test` dengan 242 uji, termasuk regresi baru di `scraping/tests/test_ai_assistance_corpus.py`, `scraping/tests/test_ai_assistance_grounded.py`, dan `src/features/ai-assistance/model/generated-response.test.mjs`. Lint, pengecekan tipe, dan `npm run build` lulus. Tidak satu pun dari 819 entri terbitan tertangkap aturan muatan terserialisasi. Artefak audit privat di `scraping/.private/ai-assistance/full-corpus` telah diperbarui; direktori itu bukan langkah aktivasi.

<a id="remaining-work-and-decisions"></a>
## Pekerjaan dan keputusan yang tersisa

Penjaga muatan terserialisasi sisi pekerja sudah aktif karena layanan menjalankan pohon kerja repositori ini. Penjaga sisi server di `generated-response.ts` belum aktif di situs publik; itu memerlukan deployment build Next.js yang baru ke Hostinger dan belum dilakukan.

Penerbitan snapshot belum dikonfirmasi langsung. Diamnya log konsisten dengan keberhasilan, tetapi `sync_knowledge` juga diam ketika `load_bundle` gagal, sehingga bukti ini tidak menentukan. Keadaan `ready` pada server hanya dapat dibaca dengan token pekerja dan tidak diperiksa. Konfirmasi yang menentukan adalah membuka panel asisten di situs dan mengajukan pertanyaan. Perilaku model nyata terhadap 282 entri FAQ belum diperiksa di browser; balasan riwayat yang pendek dapat tetap terasa kontekstual meskipun sudah melewati gerbang kelayakan. Deployment publik dan evaluasi ketahanan 24 jam tetap tertunda. Ambang kelayakan FAQ (`_FAQ_MINIMUM_ANSWER_WORDS`, `_FAQ_MINIMUM_QUESTION_WORDS`) adalah keputusan implementasi yang dapat disetel setelah tinjauan pemilik.

<a id="production-restart-on-september-23-2026"></a>
## Menjalankan ulang produksi pada 23 September 2026

Pemilik mengizinkan perubahan konfigurasi produksi dan menjalankan ulang layanan. `GASCOMP_AI_VAULT` pada `scraping/.private/ai-assistance/production/worker-environment.json` diarahkan dari `douke-web/obsidian/customer-support` yang sudah dihapus ke `douke-chat/knowledge/approved/Douke Knowledge Base/customer-support`, dengan salinan bertanggal disimpan di samping berkas aslinya. Layanan dijalankan ulang melalui `launchctl kickstart -k gui/$UID/com.gascomp.ai-assistance.production.worker` pada 13:12:20; pekerja Python baru mulai 13:12:21.

Sebelum dijalankan ulang, log mencatat `Worker connection unavailable` kira-kira sekali per detik. Setelah dijalankan ulang, log hanya bertambah satu baris yang sama saat mulai lalu diam selama pengamatan berikutnya. `load_bundle` dijalankan memakai kedua jalur persis dari berkas konfigurasi produksi dan berhasil dengan 819 entri pada versi `c5cca762883c6af3`. Situs publik menjawab HTTP 200.

<a id="next-action"></a>
## Tindakan selanjutnya

Buka panel asisten di `https://support.gascompsuperlock.com` dan ajukan pertanyaan untuk mengonfirmasi bahwa snapshot 819 entri benar-benar terbit dan jawabannya masuk akal. Bila diperlukan penjaga muatan terserialisasi sisi server, terapkan build Next.js yang baru ke Hostinger. Untuk pekerjaan lokal, gunakan database pratinjau dan pekerja lokal sesuai [penyiapan bantuan AI](../../setup/ai-assistance.md).

<a id="references"></a>
## Referensi

- [Spesifikasi bantuan AI](../../product/features/ai-assistance.md#full-knowledge-vault-coverage-on-september-23-2026)
- [Penyiapan bantuan AI](../../setup/ai-assistance.md)
- [Konteks bantuan AI pelanggan](../../../src/features/ai-assistance/CONTEXT.md)
- [Pembangun korpus](../../../scraping/ai_assistance/corpus.py)
- Vault pengetahuan: `douke-chat/knowledge/approved/Douke Knowledge Base` (di luar repositori; ditimpa oleh `DOUKE_VAULT_DIR`)
