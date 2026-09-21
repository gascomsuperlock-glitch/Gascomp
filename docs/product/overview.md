<a id="product-overview-and-scope"></a>
# Tinjauan produk dan cakupan

[Indeks spesifikasi](spec.md)

<a id="purpose"></a>
## Tujuan

Pelanggan Gascomp membutuhkan panduan penggunaan yang jelas, video tutorial terintegrasi, pemecahan masalah, FAQ, klaim garansi, dan akses dukungan setelah pembelian. Pusat Bantuan bertujuan mengurangi pengembalian yang dapat dihindari akibat kebingungan dalam pemasangan atau penggunaan dan memudahkan akses bantuan melalui kode QR pada produk atau kemasan.

Pengguna utama adalah pelanggan yang sudah memiliki produk Gascomp. Staf Gascomp menggunakan panel admin untuk memelihara bantuan produk dan meninjau tiket garansi.

Dokumen Markdown milik proyek menggunakan bahasa Indonesia. Kode, keluaran sistem non-Markdown, dan nilai database tetap mengikuti kontrak teknis yang berlaku. Pengalaman pelanggan mendukung bahasa Indonesia dan Inggris melalui pemilih bahasa. Nilai sumber eksternal dan URL publik yang stabil mengikuti aturan kompatibilitas dalam [standar bahasa](../architecture/language-standard.md).

<a id="language-requirement"></a>
## Kebutuhan bahasa

Gunakan bahasa Indonesia untuk semua dokumen Markdown (`.md`) milik proyek. Pertahankan nama database, folder, file, path, perintah, pengenal, dan nilai kompatibilitas. Kode, konfigurasi, komentar, pengujian, log, serta keluaran non-Markdown tetap menggunakan bahasa Inggris sesuai konteksnya. Halaman pelanggan menyediakan pilihan bahasa Indonesia dan Inggris, menyimpan pilihan pelanggan, dan menggunakan bahasa Inggris sebagai cadangan bila belum ada pilihan atau terjemahan. Pertahankan nilai eksternal yang tercantum sebagai pengecualian dalam [standar bahasa](../architecture/language-standard.md).

<a id="initial-scope"></a>
## Cakupan awal

- Katalog produk dinamis dengan pencarian nama, model, dan SKU.
- Satu halaman bantuan stabil dan satu kode QR yang dapat digunakan kembali per SKU.
- Identitas produk, galeri gambar, tutorial YouTube terintegrasi, panduan masalah, dan FAQ.
- Akses WhatsApp, Gascomp Care, dan Pusat Layanan.
- Formulir klaim garansi, bukti pribadi, nomor tiket, dan tinjauan status admin.
- Alat admin terlindungi untuk produk, variasi, gambar, tutorial, masalah, FAQ, pengaturan, kode QR, dan tiket.
- Penyimpanan Supabase bersama dengan fallback pengembangan lokal.
- Impor katalog Duoke, ekspor pengetahuan yang ditinjau, dan otomatisasi balasan yang dilindungi.

Pelanggan tidak memerlukan akun. Pelepasan awal tidak mencakup forum publik, pertanyaan antar pelanggan, pembaruan konten waktu nyata, atau keputusan garansi otomatis. Video tutorial menggunakan YouTube; video bukti garansi menggunakan unggah file pribadi.

<a id="success-indicators"></a>
## Indikator keberhasilan

- Pengembalian lebih sedikit terkait kebingungan dalam pemasangan atau penggunaan.
- Pertanyaan dukungan berulang lebih sedikit.

Target numerik, data baseline, periode evaluasi, dan metode pengukuran masih memerlukan keputusan bisnis.

<a id="open-content-and-business-inputs"></a>
## Konten terbuka dan masukan bisnis

- Nama produk yang diverifikasi, foto, SKU, link tutorial, FAQ, dan instruksi pemecahan masalah.
- Nomor WhatsApp akhir dan tujuan dukungan eksternal.
- Durasi garansi resmi, tanggal mulai, cakupan, dasar penggunaan sekali pakai, dan proses pasca-keputusan.
- Hostname produksi akhir, layanan deployment, dan aset merek yang disetujui.

Status: katalog awal, bantuan produk, admin, Supabase, QR, garansi, impor, dan alur kerja pengetahuan telah diimplementasikan. Konten produksi, kredensial, selektor, kebijakan garansi, hostname, dan deployment masih memerlukan nilai operasional akhir.
