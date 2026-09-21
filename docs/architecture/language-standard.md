# Standar bahasa proyek

Bahasa Indonesia adalah bahasa untuk semua dokumen Markdown (`.md`) milik proyek, termasuk spesifikasi, petunjuk kerja, panduan penyiapan, catatan serah terima, dan teks penjelas pada catatan pengetahuan. Nama database, tabel, kolom, folder, file, path, perintah, pengenal, URL, serta nilai yang menjadi kontrak eksternal tetap ditulis persis seperti aslinya. Jangan mengganti nama berkas untuk menerjemahkannya.

## Keputusan pemilik pada 21 September 2026

Sumber: pemilik meminta semua file `.md` menggunakan bahasa Indonesia tanpa mengubah penamaan database, folder, atau file. Dalam klarifikasi lanjutan, pemilik meminta jawaban sumber untuk layanan bahasa Inggris tetap persis seperti semula, sementara dokumentasi dan label diterjemahkan. Alasan tambahan tidak disebutkan. Keputusan ini menggantikan aturan lama yang mewajibkan bahasa Inggris untuk dokumentasi. Contoh penerimaan: petunjuk dalam `README.md` berbahasa Indonesia, path dan perintah di dalamnya tetap sama, serta isi jawaban sumber `-en.md` tetap dapat digunakan untuk layanan bahasa Inggris.

## Percakapan dengan pemilik

Gunakan bahasa Indonesia untuk pembaruan, pertanyaan, dan laporan akhir kepada pemilik proyek, kecuali pemilik meminta bahasa lain.

## Isi proyek di luar Markdown

- Kode sumber, komentar kode, konfigurasi, nama pengenal, pengujian, log, pesan CLI, dan keluaran non-Markdown tetap menggunakan bahasa Inggris, kecuali terjemahan antarmuka yang memang ditujukan kepada pelanggan.
- Antarmuka pelanggan tetap menyediakan pilihan bahasa Indonesia dan Inggris. Kebutuhan terjemahan dokumen `.md` tidak mengubah kode bahasa (`id` dan `en`) maupun kontrak antarmuka tersebut.
- Nama dan nilai database, termasuk tabel, kolom, constraint, policy, enum, nilai bawaan sistem, dan predikat migrasi, tetap mengikuti skema yang berlaku. Jangan menerjemahkannya sebagai efek samping perubahan dokumen.
- Judul, penjelasan, dan instruksi dalam Markdown ditulis dalam bahasa Indonesia. Pertahankan cuplikan kode, nama variabel, frontmatter yang dipakai parser, tautan, kutipan sumber, data impor, dan jawaban pelanggan yang wajib dikirim persis sesuai sumbernya.

## Label antarmuka yang diminta pemilik

- Pilihan solusi garansi tetap `Klaim Garansi`, `Kirim Barang Kurang`, `Kirim Barang Salah`, `Retur/Refund`, `Kirim sparepart`, `Refund dana sebagian`, dan `Edukasi cara pemakaian/kendala`, termasuk nilai pada spreadsheet.
- Kolom nomor pesanan tetap `order number/No.Resi/No Pesanan` dalam kedua bahasa antarmuka.

## Nilai kompatibilitas

Nilai eksternal berikut harus tetap sama ketika penerjemahan dapat merusak identitas, pencocokan, atau tautan yang sudah ada:

- Pesan WhatsApp setelah klaim yang diminta pemilik tetap persis `kak, aku sudah claim garansi` dalam setiap bahasa antarmuka.
- Nama produk impor, SKU, kategori, nama file, dan ID khusus penyedia.
- Header XLSX gudang seperti `Nomor SKU`, `Judul`, dan `Kode Produk`, karena merupakan kunci skema sumber.
- Pesan pelanggan yang tertangkap serta token bahasa Indonesia yang digunakan untuk penyaringan privasi atau pencocokan pencarian.
- Jawaban sumber Obsidian yang dikirim persis oleh jembatan Duoke Hermes Desktop tetap dalam bahasa sumbernya; lihat [kontrak Duoke](../product/integrations/duoke-support.md#desktop-implementation-and-owner-corrections).
- Kalimat perkenalan dukungan berbahasa Indonesia tetap `Saya Ayu dari Gascomp, ada yang bisa saya bantu?`; lihat [kontrak identitas](../product/integrations/duoke-support.md#customer-facing-identity).
- Rute publik dan fragmen yang stabil, seperti `/produk`, `/klaim-garansi`, `/tiket`, `/lampiran`, dan `#kendala`.
- URL pihak ketiga, nilai selector, nilai protokol, kode bahasa, dan pengenal zona waktu.
- Predikat migrasi boleh memuat nilai lama dalam bahasa lain hanya untuk menggantinya dengan nilai standar yang berlaku.

Teks Markdown yang menjelaskan nilai tersebut tetap menggunakan bahasa Indonesia. Jangan menerjemahkan bagian yang harus sama persis agar integrasi tetap bekerja.

## Pilihan bahasa pelanggan

- Halaman pelanggan mendukung bahasa Indonesia dan Inggris.
- Sediakan pemilih bahasa yang terlihat agar pelanggan dapat memilih `Indonesian` atau `English` sesuai label antarmuka yang ada.
- Terapkan pilihan secara konsisten pada navigasi, judul, isi panduan, FAQ, formulir, pesan validasi, tindakan dukungan, label aksesibilitas, dan metadata yang memiliki terjemahan.
- Simpan pilihan bahasa untuk kunjungan berikutnya dan gunakan bahasa Inggris sebagai cadangan jika pilihan atau terjemahan belum tersedia.
- Terjemahan dokumen Markdown tidak secara otomatis mengubah konten pelanggan dalam database atau jalur pengiriman jawaban yang bergantung pada bahasa sumber.
