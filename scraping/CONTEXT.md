<a id="python-capture-and-knowledge-workflows"></a>
# Alur kerja penangkapan dan pengetahuan Python

[ Peta ruang kerja ](../CONTEXT.md) · [Aturan akar ](../AGENTS.md)

<a id="context"></a>
## Konteks

Cakupan: `scraping` dan turunan-nya kecuali jika konteks yang lebih dekat terdaftar dalam peta ruang kerja.

Penangkapan, normalisasi, persiapan pengetahuan yang diotorisasi sendiri, otomatisasi balasan Duoke, dan pekerja bantuan pelanggan terpisah.

<a id="inputs"></a>
## Input

Baca referensi relevan untuk tugas yang diminta, bukan setiap dokumen yang terhubung.

- [Pilihan alat Hermes asli dan verifikasi sumber ](../docs/product/integrations/duoke-support.md#direct-knowledge-tools-in-hermes)
- [Retrifikasi referensi percakapan utama ](../docs/product/integrations/duoke-support.md#percakapan-as-the-primary-admin-reference-source)
- [Penyelesaian pelanggan, referensi Obsidian lengkap, dan serah terima WhatsApp ](../docs/product/integrations/duoke-support.md#customer-problem-resolution-and-whatsapp-handoff)

- [Penempatan dan ketergantungan ](../docs/architecture/project-structure.md)
- [Spesifikasi katalog Duoke ](../docs/product/integrations/duoke-catalog.md)
- [Spesifikasi pengetahuan dan balasan ](../docs/product/integrations/duoke-support.md)
- [Tujuan balasan otomatis Hermes Desktop ](../docs/product/integrations/duoke-support.md#target-automatic-replies-through-hermes-desktop)
- [Balasan berbasis referensi dan operasi berkelanjutan ](../docs/product/integrations/duoke-support.md#reference-based-replies-and-continuous-operation)
- [Cobak interaktif versus eksekusi terjadwal ](../docs/product/integrations/duoke-support.md#interactive-chat-and-scheduled-execution)
- [Identitas yang menghadap pelanggan: Ayu dari Gascomp ](../docs/product/integrations/duoke-support.md#customer-facing-identity)
- [Latensi respons dan penanganan sapaan ](../docs/product/integrations/duoke-support.md#response-latency)
- [Spesifikasi impor gudang ](../docs/product/integrations/warehouse.md)
- [Spesifikasi bantuan AI ](../docs/product/features/ai-assistance.md)
- [Penyiapan pekerja AI ](../docs/setup/ai-assistance.md)

<a id="tasks"></a>
## Tugas

Ini adalah tanggung jawab yang dipicu oleh permintaan saat ini, bukan daftar tugas otomatis.

| Saat diminta bekerja pada | Proses | Hasil yang diharapkan |
| --- | --- | --- |
| duoke/catalog/ | Melacak penangkapan produk yang diotorisasi melalui normalisasi atau generasi arsip. | Identitas produk yang stabil dan output katalog yang dapat ditinjau. |
| duoke/chat/ | Periksa cakupan penangkapan/arsip yang diotorisasi dan penyimpanan pribadi. | Riwayat sumber yang dipertahankan dengan catatan turunan yang sadar privasi. |
| duoke/knowledge/ | Peta dan indeks seluruh database admin Q&A Obsidian yang ada; pertahankan asosiasi pertanyaan-jawaban, konteks produk, asal-usul, dan pembaruan. Bedakan jawaban admin yang dapat digunakan kembali dari konten transkrip yang tidak terkait. | Pertanyaan pelanggan yang cocok mengambil referensi jawaban admin yang berlaku tanpa batas acak untuk catatan pembuka. |
| duoke/reply/ | Ikuti kontrak operasi berkelanjutan berbasis referensi: Hermes mengoordinasikan pengambilan Obsidian dan pengiriman Chrome headless; ukur latensi dan verifikasi pemulihan di bawah pengawasan bersama dengan perisai pengiriman. | Balasan Ayu yang berakar pada sumber admin yang dapat dilacak dan jalur verifikasi menuju operasi 24/7 tanpa pengawasan; bedakan persyaratan dari perilaku runtime yang diamati. |
| ai_assistance/ | Periksa input korpus, pencahayaan (grounding), protokol pekerjaan, dan validasi respons. | Bantuan website yang berakar sesuai dengan kontrak server. |
| warehouse/ | Validasikan skema XLSX, identitas, dan laporan normalisasi. | Data milik sumber yang dinormalisasi dengan baris ditolak yang eksplisit. |
| shared/ | Gunakan jalur relatif terhadap modul dan bantuan privasi/lingkungan. | Infrastruktur yang dapat digunakan kembali tanpa asumsi direktori kerja yang hardcode. |
| tests/ | Gunakan input sintetik sementara dan lingkungan virtual repositori. | Penutupan regresi yang bermakna tanpa data pelanggan hidup. |

<a id="boundaries"></a>
## Batasan

- Gunakan titik masuk paket `shared/paths.py` dan `python -m`.
- Pertahankan `.private/`, `.venv/`, dan `__pycache__/` di luar kerangka dokumentasi.
- Perintah dry-run atau pekerja dapat mengakses layanan eksternal; periksa operasi yang dipilih terlebih dahulu.
- Jangan aktifkan pengiriman balasan, impor produksi, atau persetujuan pengetahuan hanya karena ada baris tugas.

<a id="outputs-and-verification"></a>
## Output dan verifikasi

Untuk balasan pelanggan Hermes, verifikasi bahwa pertanyaan yang diketahui mengambil jawaban admin yang berlaku dan masalah yang belum terpecah menerima serah terima resmi WhatsApp. Pertahankan informasi tool/status/queue di luar teks pelanggan. Lakukan audit semua folder sumber Obsidian yang terhubung dan pengecualian pengambilan sebelum mengatribusikan jawaban yang terlewat pada kurangnya pengetahuan; jumlah korpus saja tidak cukup sebagai bukti.

Untuk balasan Hermes Desktop yang dikelola pemilik, gunakan [prosedur setup, preview, start, monitor, dan stop](../docs/setup/duoke-hermes-desktop.md).

Pertahankan kode di paket milikannya dan tes di `tests/`; pertahankan skema terdokumentasi dan lokasi output.

Untuk perubahan Python, jalankan `npm run duoke:test` melalui lingkungan virtual repositori. Pertahankan validasi lokal atau gunakan pratinjau yang diotorisasi yang sesuai; laporkan pemeriksaan layanan yang tidak tersedia secara terpisah.

Untuk permintaan yang tidak terkait, kembali ke peta ruang kerja. Untuk pekerjaan yang belum selesai, gunakan [indeks serah terima](../docs/work/README.md) dan [aliran kerja kontinuitas](../docs/work/workflow.md).
