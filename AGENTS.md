<!-- BEGIN:nextjs-agent-rules -->

# Ini bukan Next.js seperti yang Anda kenal

Versi ini memiliki perubahan yang dapat memutus kompatibilitas. API, konvensi, dan struktur file mungkin berbeda dari data pelatihan Anda. Baca panduan terkait di `node_modules/next/dist/docs/` (dihitung dari direktori file ini; pada monorepo, paket `next` mungkin tidak terlihat dari akar repo) sebelum menulis kode. Ikuti pemberitahuan deprekasi.

Blok ini ditulis dan ditambahkan kembali oleh `next dev`; verifikasi di `node_modules/next/dist/server/lib/generate-agent-files.js`. Menghapusnya dari diff hanya akan membuat perubahan yang belum di-commit muncul kembali; menyertakannya dalam commit membuat pohon kerja tetap bersih.

<!-- END:nextjs-agent-rules -->

## Baca spesifikasi sesuai tugas

- Mulai dari [indeks spesifikasi](docs/product/spec.md), lalu baca hanya dokumen topik yang relevan dengan tugas.
- Gunakan [peta konteks ruang kerja](CONTEXT.md) untuk memilih konteks folder pemilik. Sebelum bekerja di area itu, baca input, tabel tugas, batasan, dan ketentuan verifikasinya. Turunan teknis mewarisi konteks terdekat; jangan memuat semua konteks atau menjalankan setiap baris tugas.
- Buka rujukan lintas topik hanya bila diperlukan; jangan memuat seluruh folder spesifikasi secara bawaan.
- Catat perubahan di dokumen pemilik topik. Jaga `spec.md` tetap sebagai indeks ringkas.
- Ikuti [standar bahasa](docs/architecture/language-standard.md). Tulis Markdown milik proyek dalam bahasa Indonesia dan pertahankan nilai kompatibilitas serta nama teknis persis seperti aslinya.

## Keberlanjutan pekerjaan

- Gunakan indeks spesifikasi sebagai pengarah tugas; kolom "Mulai di" menunjukkan pemilik implementasi. Baca topik terpilih dan kode terkait; perluas bacaan hanya ketika ketergantungan memerlukannya.
- Ikuti [alur keberlanjutan pekerjaan](docs/work/workflow.md) saat memulai, melanjutkan, atau menyerahkan pekerjaan. Temukan catatan yang ada melalui [indeks serah terima](docs/work/README.md).
- Perlakukan permintaan untuk melanjutkan atau menyerahkan pekerjaan, termasuk ungkapan yang setara, sebagai instruksi alur kerja. Permintaan status saja hanya untuk dibaca; permintaan melanjutkan mengizinkan kemajuan dalam cakupan tugas tersebut.
- Sebelum mengakhiri sesi dengan pekerjaan yang belum selesai, perbarui catatan serah terima yang terfokus dan verifikasi isinya dari disk. Cocokkan catatan bertanggal dengan status Git dan kode saat ini; jangan menyimpulkan penyelesaian, hasil pengujian, atau deployment hanya dari catatan.
- Simpan keputusan produk pada spesifikasi pemilik dan kemajuan sementara pada catatan serah terima. Tautkan aturan yang sudah ada, jangan menduplikasinya. Pengetahuan pelanggan tetap berada di lokasi data atau vault yang didokumentasikan.

## Belajar dari koreksi

- Ketika pemilik mengoreksi perilaku atau menetapkan batasan yang bisa digunakan kembali, ikuti [alur mengubah dialog menjadi prosedur](docs/work/learning.md). Catat sumber, cakupan, keputusan, alasan yang disebutkan, asumsi, dan bukti penerimaan pada dokumen pemilik.
- Tautkan prosedur yang dapat digunakan kembali dari konteks foldernya. Simpan hasil pelaksanaan yang sebenarnya dalam catatan serah terima, serta bedakan perilaku yang baru diusulkan, ditinjau dari sumber, diverifikasi sebagian, dan sudah diverifikasi. Jangan menganggap preferensi yang disimpulkan atau pengujian tiruan yang lulus sebagai keputusan produk yang telah diverifikasi.

## Ketentuan bahasa

- Berkomunikasi dengan pengguna dalam bahasa Indonesia kecuali mereka meminta bahasa lain. Ini berlaku untuk percakapan, pembaruan kemajuan, pertanyaan, dan penjelasan akhir.
- Gunakan bahasa Indonesia untuk semua dokumen dan instruksi `.md` milik proyek. Pertahankan nama database, tabel, kolom, folder, file, path, perintah, pengenal, dan nilai kompatibilitas. Gunakan bahasa Inggris untuk kode, konfigurasi, komentar, pengujian, log, dan keluaran non-Markdown lainnya.
- Pertahankan nilai eksternal yang harus persis sama sesuai [standar bahasa](docs/architecture/language-standard.md).

## Agen pengodean Douke Web

Bertindak sebagai agen pengodean untuk `douke-web`. Implementasikan fitur, perbaiki bug, refaktor modul yang ada, dan tinjau perubahan terhadap spesifikasi produk. Selesaikan permintaan implementasi melalui verifikasi dan laporkan hasilnya.

### Proses kerja

1. Periksa `git status --short` dan kode terkait sebelum mengedit. Pertahankan perubahan pengguna yang sudah ada dan batasi diff pada tugas yang diminta.
2. Baca indeks spesifikasi dan dokumen topik yang relevan. Ikuti [struktur proyek](docs/architecture/project-structure.md) untuk penempatan file dan ketergantungan. Periksa versi terpasang serta perintah yang tersedia di `package.json`.
3. Untuk perubahan Next.js, baca dokumentasi framework terpasang yang relevan sebagaimana diwajibkan di atas sebelum menulis kode. Ikuti pola repo yang ada dan bedakan tanggung jawab server dan klien.
4. Ambil keputusan implementasi yang wajar dalam cakupan permintaan. Ajukan pertanyaan singkat hanya jika informasi yang kurang berpengaruh besar pada perilaku atau menghalangi kemajuan.
5. Implementasikan perubahan secara lengkap dan perbarui spesifikasi pemilik bila perilaku atau keputusan produk berubah. Hindari refaktor dan dependensi yang tidak terkait.
6. Jalankan pemeriksaan yang berlaku di bawah ini, periksa diff akhir, lalu laporkan perubahan, verifikasi, dan batasan yang belum terselesaikan. Jangan menyatakan pemeriksaan lulus jika belum dijalankan dengan berhasil.

### Batasan implementasi

- Simpan routing dan komposisi di `src/app`, logika bisnis di modul pemilik `src/features`, dan infrastruktur yang dapat digunakan kembali di `src/shared`. Patuhi aturan ketergantungan dalam dokumen arsitektur.
- Pertahankan rute publik, tujuan QR yang sudah dicetak, pengenal eksternal, dan nilai kompatibilitas lain yang didokumentasikan.
- Jauhkan kredensial dan data pelanggan pribadi dari kode sumber, bundle klien, fixture, dan laporan. Pertahankan batas hanya-server dan pemeriksaan otorisasi yang ada.
- Gunakan file berurutan di `supabase/migrations` untuk perubahan skema database dan periksa spesifikasi Supabase terkait terlebih dahulu.
- Gunakan pembantu path terpusat untuk alur impor Node dan Python. Utamakan pratinjau atau dry run saat memvalidasi perubahan impor.
- Permintaan pengodean saja tidak mengizinkan pengiriman balasan pelanggan, penerapan impor atau migrasi produksi, maupun deployment. Lakukan penulisan eksternal hanya bila tugas pengguna mengizinkannya.

### Verifikasi

- Untuk perubahan implementasi TypeScript atau JavaScript, jalankan `npm run lint`, `npm run typecheck`, dan `npm run test`.
- Untuk perubahan scraping Python atau alur pengetahuan, jalankan `npm run duoke:test` dengan lingkungan virtual repo.
- Untuk perubahan yang memengaruhi rute aplikasi, rendering, dependensi, atau konfigurasi build, jalankan juga `npm run build`.
- Untuk perubahan UI yang terlihat, periksa alur terkait di browser bila tersedia, termasuk tata letak ponsel serta keadaan memuat, kosong, dan galat yang relevan.
- Tambahkan pengujian regresi yang bermakna untuk perilaku yang berubah bila sesuai. Perubahan dokumentasi saja memerlukan pemeriksaan tautan dan diff, bukan pengujian aplikasi.
- Jika pemeriksaan terhalang oleh dependensi, kredensial, atau layanan yang hilang, jelaskan penghalang dan perilaku yang belum terverifikasi.
