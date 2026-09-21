<a id="domain-and-deployment"></a>
# Domain dan deployment

[Indeks spesifikasi](../spec.md)

<a id="ai-assistance-activation"></a>
## Aktivasi bantuan AI

Bantuan AI dinonaktifkan secara default. Migrasi dan rilis fitur harus menggunakan urutan rilis yang sudah diverifikasi yang ada; menyiapkan file sumber tidak menerapkan migrasi produksi atau mengaktifkan panel publik. Konfigurasi token pekerja yang berbeda di website dan Mac, terbitkan pengetahuan bilingual Obsidian yang divalidasi, verifikasi model lokal yang dipasang pemilik, dan selesaikan pemeriksaan ketahanan sintetis sebelum mengaktifkan `GASCOMP_AI_ASSISTANCE_ENABLED=true`. Lihat
[Pengaturan bantuan AI](../../setup/ai-assistance.md). Kembalikan flag menjadi false
dan deploy ulang untuk kembali ke tombol WhatsApp melayang asli. Aktivasi pekerja macOS terpisah dari deployment Hostinger.

<a id="ai-assistance-deployment-on-september-17-2026"></a>
## Deployment bantuan AI pada 17 September 2026

Pemilik mengizinkan deployment publik komit
`c41d5d60a1c3dfe23c654b157c620617decc9cb4`. GitHub Actions menjalankan
[35206731571](https://github.com/gascomsuperlock-glitch/Gascomp/actions/runs/35206731571)
melalui verifikasi, menerapkan tiga migrasi AI yang berurutan, dan mempromosikan komit yang sama ke `main`.

Build Git otomatis Hostinger `01a0aec2-af81-714d-95ab-4ac9c5824b83`
gagal dan tidak mengembalikan log build. Sebuah `git archive` hanya sumber dari komit tersebut yang diverifikasi diunggah melalui API deployment JavaScript Hostinger.
Arsip build `01a0aec8-071a-7306-a975-b02fd622a5d9` selesai dengan sukses.
Ini mengembalikan pengiriman tanpa mengidentifikasi penyebab kegagalan Git otomatis; pembangunan otomatis masa depan masih perlu pemantauan. Deteksi arsip otomatis menggunakan Node 20; pengaturan build Git yang disimpan tetap menggunakan Node 22.

API lingkungan Hostinger menggantikan seluruh setnya. Tujuh kunci yang ada dipertahankan menggunakan konfigurasi lokal; konfigurasi kata sandi admin lokal dan penandatanganan sesi diverifikasi terhadap produksi terlebih dahulu. Token pekerja produksi yang berbeda dan flag AI yang diaktifkan ditambahkan. Nilai rahasia dan data lingkungan rollback tetap hanya milik pemilik, diabaikan file lokal.

Asisten publik dan status endpoint admin melaporkan aktif, pengetahuan siap,
pekerja online, dan tidak ada tugas yang menunggu. Uji HTTPS asli mencakup fakta produk, pengingat sesi yang sama, klarifikasi pemecahan masalah GRS-01 dan tindak lanjut, serta transfer WhatsApp eksplisit. Pemeriksaan desktop/mobile melalui Chrome CDP lokal lulus reset sesi, keawetan reload, penolakan keyboard, dan pemeriksaan tata letak tanpa kesalahan halaman. Hanya sesi sintetis yang dibuat untuk pemeriksaan ini yang dihapus.
Bukti disimpan secara lokal di bawah `.data/ai-deployment/`.

Supervisi Mac produksi menggunakan dedikasi
`com.gascomp.ai-assistance.production.worker` dan
`com.gascomp.ai-assistance.production.chrome` user LaunchAgents. Pekerja menggunakan Hermes dengan Ollama lokal, dan `caffeinate -i` mencegah tidur sistem idle saat berjalan. Login, daya, jaringan, dan ketersediaan model tetap menjadi ketergantungan operasional. Evaluasi ketahanan 24 jam dan verifikasi jadwal Cron database independen belum selesai; pemeriksaan asap deployment tidak menetapkan hasil tersebut. Lihat [Pengaturan AI](../../setup/ai-assistance.md) untuk
jadwal retensi dan prosedur rollback.

<a id="automated-releases"></a>
## Rilis otomatis

Alur rilis bulan September mempertahankan cabang sumber `main` yang ada milik Hostinger. Dorong kandidat yang telah ditinjau ke `release`. GitHub Actions menjalankan linting, pengecekan tipe, semua tes SQL Node/isolated PGlite, dan pembangunan produksi sebelum menggunakan Supabase Management API untuk melihat pratinjau, menerapkan, dan memverifikasi migrasi. Baru kemudian ia melakukan fast-forward `main` ke kandidat yang diverifikasi secara tepat, memicu integrasi Hostinger yang ada. Permintaan tarik (pull requests) menjalankan pemeriksaan tanpa kredensial produksi. Jalur kerja manual hanya merilis ketika cabang yang dipilih adalah `release`; jalankan pada `main` hanya memverifikasi kode.

Alur kerja menggunakan rahasia repositori `SUPABASE_ACCESS_TOKEN` dan `SUPABASE_PROJECT_ID`. Tidak menggunakan `SUPABASE_DB_PASSWORD`, kunci layanan aplikasi, atau kredensial OAuth MCP. Token memerlukan izin baca/tulis migrasi untuk proyek yang dikonfigurasi. Tugas Actions memerlukan `contents: write` untuk memajukan `main`. Jangan dorong perubahan aplikasi langsung ke `main`, karena itu melewati urutan database-sebelum-hosting. Lakukan perubahan pada `release` atau gabungkan cabang fitur yang telah ditinjau ke dalamnya. Hostinger harus terus melacak `main`.

Rilis produksi bersamaan diserialisasi dan tidak pernah dibatalkan selama penulisan database. Sebelum migrasi dan promosi, kandidat masih harus menjadi revisi `release` terbaru dan turunan dari `main` saat ini. Kandidat yang lebih baru menggantikan pekerjaan yang antri. Migrasi gagal atau pembaruan cabang non-fast-forward mencegah promosi; perubahan database aditif tetap ada jika hosting kemudian gagal. Tidak ada bagian alur kerja untuk reset database, pembatalan data pelanggan, impor fixture, atau unggah Storage.

[Dasar migrasi](../integrations/supabase.md#automated-migration-baseline) mendefinisikan batas sengaja di sekitar perubahan manual historis. Skrip secara default melihat pratinjau; `--apply` adalah eksplisit. Kesalahan penyedia dirangkum tanpa mencetak kredensial, catatan pelanggan, atau tubuh respons SQL.

Pelaksanaan GitHub Actions yang sukses membuktikan verifikasi kode, verifikasi migrasi, dan promosi GitHub. Tidak membuktikan deployment Hostinger. Konfirmasi commit yang sama di hPanel dan uji alur produksi yang terpengaruh sebelum melaporkan kesuksesan live. Hostinger tetap bertanggung jawab atas instalasi dependensi dan pembangunannya sendiri.

Referensi: [API migrasi Supabase](https://supabase.com/docs/reference/api/v1-apply-a-migration), [Deployment GitHub Hostinger](https://www.hostinger.com/support/how-to-redeploy-a-node-js-application/).

- Hubungkan Pusat Bantuan Gascomp ke `support.gascompsuperlock.com` sebagai pengganti `bantuan.gascompsuperlock.com` sesuai keputusan domain yang sudah berlaku. Pastikan tujuan deployment sebelum mengubah DNS.
- Deployment memerlukan runtime server untuk autentikasi admin, Server Actions, akses Supabase, dan klaim garansi.
- Konfigurasi Supabase produksi, autentikasi admin, dan variabel lingkungan `GASCOMP_PUBLIC_BASE_URL` di host aplikasi.
- Aktifkan HTTPS dan verifikasi halaman pelanggan, login admin, gambar, target QR, pengajuan klaim, dan akses bukti pribadi melalui domain akhir.
- Pertahankan layanan website dan email yang ada. Batasi perubahan DNS pada catatan yang diperlukan oleh hostname yang dipilih.
- Pertahankan jalur bantuan produk stabil karena kode QR cetak bergantung padanya.

Poin terbuka: akses dashboard hosting, verifikasi lingkungan produksi, dan akses DNS Cloudflare.

<a id="dns-diagnosis-on-september-11-2026"></a>
## Diagnosis DNS pada 11 September 2026

Nama server domain yang diterbitkan adalah `damien.ns.cloudflare.com` dan `kenia.ns.cloudflare.com`. Pertanyaan A langsung ke `damien.ns.cloudflare.com` dan pertanyaan melalui `1.1.1.1` mengembalikan `NXDOMAIN` untuk kedua nama host dukungan. Tidak ada nama host yang ada di zona DNS aktif pada saat pemeriksaan. Membuat subdomain hanya di Hostinger tidak menerbitkannya di zona ini yang dikelola Cloudflare. Kegagalan DNS mencegah pemeriksaan hosting dan HTTPS; keadaan mereka masih belum diketahui.

<a id="follow-up-tls-diagnosis-on-september-11-2026"></a>
## Diagnosis TLS lanjutan pada 11 September 2026

Pada pukul 06:31 UTC, `support.gascompsuperlock.com` terurai ke alamat proxy Cloudflare dan permintaan HTTPS langsung mengembalikan HTTP 525. Pengamatan NXDOMAIN sebelumnya tidak lagi menggambarkan nama host ini. Cloudflare dapat diakses, tetapi negosiasi TLS-nya dengan asal yang dikonfigurasi gagal. Alamat asal, pengikatan nama host, dan sertifikat masih memerlukan verifikasi; respons saja tidak mengidentifikasi pengaturan asal mana yang salah.

Periksa catatan DNS `support` terhadap tujuan hosting aplikasi, pastikan nama host kustom terikat pada aplikasi tersebut, dan verifikasi bahwa asal melayani HTTPS untuk nama host ini secara tepat. Jangan ubah catatan DNS yang tidak terkait atau melemahkan mode SSL zona sebagai solusi sementara.

Pada pukul 06:34 UTC, permintaan langsung ke asal yang disediakan pengguna `145.223.108.57` dengan header Host `support.gascompsuperlock.com` mengembalikan HTTP 200 dan halaman Gascomp Help Center melalui HTTP. Respons mengidentifikasi Hostinger dan LiteSpeed. Permintaan HTTPS langsung dengan nama host/SNI yang sama mencapai port 443 tetapi gagal dengan `tlsv1 alert internal error`. Ini mereproduksi kegagalan TLS tanpa Cloudflare; routing HTTP mencapai aplikasi yang diharapkan, sementara HTTPS asal tetap rusak. Penawaran sertifikat atau konfigurasi TLS nama host harus diperiksa di Hostinger.

Hostinger merekomendasikan secara sementara mengatur catatan A yang terpengaruh ke **DNS only** sambil menyelesaikan instalasi SSL. Pertahankan `145.223.108.57` sebagai target, periksa status SSL untuk nama host dukungan yang tepat, dan ulangi instalasi yang gagal jika ditawarkan. Verifikasi HTTPS langsung sebelum memulihkan proxying. Beralih hanya ke DNS tidak memperbaiki kegagalan TLS asal.

Referensi: [Hostinger gagal Instalasi Lifetime SSL](https://www.hostinger.com/support/5613445-how-to-fix-a-failed-lifetime-ssl-installation-in-hostinger/).

Referensi: [Cloudflare error 525](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-5xx-errors/error-525/).

<a id="https-verification-on-september-11-2026"></a>
## Verifikasi HTTPS pada 11 September 2026

Pada pukul 07:13 UTC, HTTPS asal langsung dan nama host publik keduanya mengembalikan HTTP 200 dengan verifikasi sertifikat diaktifkan. Sertifikat cocok dengan `support.gascompsuperlock.com` dan diterbitkan oleh Google Trust Services. DNS terurai langsung ke `145.223.108.57`. Ini menggantikan kegagalan TLS asal sebelumnya; perubahan selanjutnya pada proxying Cloudflare memerlukan pemeriksaan terpisah.

<a id="connection-procedure"></a>
## Prosedur koneksi

1. Identifikasi layanan hosting aplikasi dan alamat IP atau target CNAME yang disediakannya. Aplikasi Next.js ini memerlukan runtime server yang kompatibel.
2. Hubungkan `support.gascompsuperlock.com` ke aplikasi di dashboard hosting. Untuk aplikasi Hostinger Node.js pada domain sementara, gunakan **Websites → Connect domain** dan ikuti instruksinya.
3. Di zona `gascompsuperlock.com` Cloudflare, tambahkan catatan bernama `support`. Gunakan tipe catatan A untuk alamat IPv4 penyedia atau CNAME untuk nama hostnya, mengikuti tipe catatan yang diperlukan oleh penyedia, pengaturan proxy, dan catatan verifikasi kepemilikan. Jangan menebak target dari IP situs web utama. Pertahankan nameserver yang ada, apex, `www`, dan catatan surat elektronik tanpa perubahan.
4. Tetapkan `GASCOMP_PUBLIC_BASE_URL=https://support.gascompsuperlock.com` dan variabel Supabase serta admin dari `.env.example` dalam produksi. Terapkan migrasi database yang diperlukan. Untuk hosting Node.js standar, bangun dengan `npm run build` dan mulai dengan `npm run start`.
5. Selesaikan HTTPS dan verifikasi situs baru sebelum merutekan nama host lama ke aplikasi yang sama. Nama host lama juga memerlukan DNS, pengikatan hosting, dan HTTPS agar pengalihan berfungsi.
6. Verifikasi halaman pelanggan, login admin, gambar, tujuan QR, pengiriman garansi yang dikendalikan, dan akses bukti pribadi. Regenerasi ekspor pengetahuan dukungan jika mereka berisi tautan localhost atau nama host lama.

<a id="warranty-video-verification-runtime"></a>
## Waktu verifikasi video garansi

Pengiriman garansi mendekode video menggunakan pembangunan WebAssembly berinti tunggal di `@ffmpeg/core`, di dalam thread worker Node.js. Ini menggantikan `ffmpeg-static`: verifikasi eksekusi native mengembalikan kesalahan tidak tersedia dalam produksi. Tidak perlu mengunduh eksekusi, proses anak, atau direktori sementara yang dapat ditulis. `npm ci` menginstal aset JavaScript dan WASM bersama dengan dependensinya sendiri.

Next.js menjaga paket eksternal dan secara eksplisit melacak UMD JavaScript-nya, file WASM, manifest paket, dan titik masuk worker yang tidak dibundling. Mulai aplikasi dari akar proyeknya, seperti `npm run start`, agar jalur worker terpecah dalam deployment reguler maupun mandiri. Runtime harus mendukung thread worker Node dan WebAssembly. Setiap pemeriksaan memiliki sistem file memori sendiri dan worker-nya dihentikan setelah penyelesaian, kegagalan, atau batas waktu 30 detik. Verifikasi pengiriman yang valid dan rusak aktual setelah deployment, bukan hanya validasi metadata.

<a id="legacy-links"></a>
## Tautan warisan

`next.config.ts` mengeluarkan pengalihan HTTP 308 dari nama host `bantuan.gascompsuperlock.com` yang tepat ke `https://support.gascompsuperlock.com`, mempertahankan jalur dan parameter kueri. Segmen rute yang ada seperti `/produk/[slug]` tetap stabil. Verifikasi bahwa tautan produk lama berpindah ke ekuivalennya baru setelah kedua nama host terhubung.

## Status

Contoh lingkungan, pengalihan aplikasi, dan instruksi deployment disiapkan secara lokal. Tidak ada perubahan pada lingkungan produksi, DNS, hosting, atau pengaturan sertifikat oleh agen. Asal Hostinger yang disediakan pengguna melayani halaman depan yang diharapkan dan lulus verifikasi HTTPS. Halaman login admin live melaporkan bahwa otentikasi tidak dikonfigurasi; kredensial produksi dan deployment aplikasi terbaru masih memerlukan verifikasi.

<a id="provider-references"></a>
## Referensi penyedia

- [Hostinger: Hubungkan domain kustom ke aplikasi Node.js](https://www.hostinger.com/support/how-to-connect-a-custom-domain-to-a-node-js-application/)
- [Cloudflare: Buat catatan subdomain](https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-subdomain/)

## Deployment batas video tutorial pada 11 September 2026

Commit `6e89c7f949a3ae2ae546ba88c2b41be9f7f62482` telah dipush ke `main`
dan diverifikasi live di `https://support.gascompsuperlock.com` pada pukul 09:28 UTC.
Admin produksi menampilkan batas upload tutorial 150 MB; browser desktop melaporkan tidak ada kesalahan JavaScript dan tata letak mobile tidak memiliki overflow horizontal. Permintaan otorisasi upload terautentikasi untuk 157,286,401 byte mengembalikan HTTP 400 dengan pesan validasi baru 150 MB. Release terisolasi tersebut lulus lint, typecheck, semua 31 tes Node, dan build produksi.

Penyimpanan masih diblokir secara terpisah: Supabase menolak peningkatan batas bucket dengan HTTP 413, dan pembacaan berikutnya mengonfirmasi batas eksisting 52,428,800 byte. Upload di atas 50 MB tetap tidak tersedia hingga batas penyimpanan proyek-wide dan batas bucket dapat ditingkatkan. Lihat [Supabase storage](../integrations/supabase.md#tutorial-upload-limit-increase).
Laporan verifikasi disimpan secara lokal di
`.data/video-limit-deployment/production-verification.json`.

### Kembalikan batas 50 MB yang didukung

Atas permintaan pengguna, commit `0830ac5` mengembalikan batas upload tutorial ke 50 MB (52,428,800 byte) dan menghapus migrasi peningkatan batas bucket yang belum diterapkan. Ia lulus lint, typecheck, semua 33 tes Node, dan build produksi sebelum dipush ke `main`. Endpoint upload produksi diverifikasi untuk menolak 52,428,801 byte dengan HTTP 400 dan pesan validasi 50 MB. Bucket Supabase `product-videos` diverifikasi secara independen pada 52,428,800 byte.
Ini menggantikan rollout aplikasi sebelumnya 150 MB; tidak perlu peningkatan Storage atau upgrade plan.

## Rilis hero dan target deployment ganda pada 11 September 2026

Rute rilis otomatis yang direncanakan adalah repositori GitHub
`gascomsuperlock-glitch/Gascomp`, cabang `main`, ke
`support.gascompsuperlock.com`.

Commit `38660e4ee07a47833bec4b123d994f3d0eeac547` berisi redesign hero panduan merek. Push memicu build Git untuk kedua hostname support pada 09:42:14 UTC. Build `bantuan` selesai, sedangkan build `support` gagal setelah empat detik dan mengembalikan log build kosong. Hostinger melaporkan bahwa kedua record Node.js website berbagi root dokumen `public_html/bantuan`.
Direktori bersama dan pemicu duplikasi dikonfirmasi; hasil API tidak menetapkan penyebab pasti dari build Git yang gagal.

Arsip sumber dari commit yang sama secara eksplisit dideploy ke `support`.
Build `01a08fdb-1a04-71ec-be8f-a3fb349aaf50` selesai pada pukul 09:46:13 UTC.
Rilis manual ini tidak memperbaiki pemetaan auto-deployment GitHub.

Koneksi GitHub tingkat website harus ditinjau di hPanel sehingga hanya
`support` yang menerima rilis dari repositori ini. API hosting Hostinger yang tersedia mengekspos build dan pengaturan build, tetapi tidak ada operasi untuk mengubah atau memutus koneksi repositori GitHub website. Jangan hapus salah satu website sebagai workaround koneksi-reset: kedua record saat ini berbagi file aplikasi. Pertahankan redirect hostname legacy dan jalur publik eksisting.

## Deployment batas video garansi pada 11 September 2026

Commit `7e6c99d` telah dideploy dan diverifikasi pada formulir klaim produksi.
Video garansi sekarang mengizinkan hingga 50 MB, sesuai dengan bucket `warranty-evidence` privat. Video 1 MB dan 23 MB diterima; video kecil nonkosong tetap diizinkan. Batas permintaan adalah 72 MB untuk mencakup semua bukti dan overhead multipart.

Laporan klaim lokal lengkap dengan video sintetik yang dapat dimainkan berukuran 1 MB, 23 MB, dan 50 MB, termasuk permintaan bukti gabungan sebesar 70 MB. Transportasi produksi dan validasi ukuran berhasil untuk ukuran yang sama menggunakan nama yang disengkan tidak valid untuk mencegah pembuatan tiket. Video sintetik berukuran 23 MB juga diunggah ke Penyimpanan Produksi privat, ukurannya dicatat, dan objek uji coba dihapus. Pemeriksaan desktop/mobile tidak memiliki kesalahan JavaScript atau tumpahan horizontal. Lint, pengecekan tipe, semua 34 uji coba Node, dan build produksi berhasil. Verifikasi tercatat secara lokal di `.data/warranty-video-limit/production-verification.json`.

<a id="gascompcare-release-to-an-existing-site"></a>
## Pelepasan GascompCare ke situs yang ada

Perintah aplikasi repositori adalah `npm run build` (`next build --webpack`) dan `npm run start` (`next start`). Tidak ada perintah yang menerapkan migrasi database, mereset Supabase, mengimpor fixture, atau mengunggah objek Penyimpanan. Saat ini tidak ada direktori alur kerja `.github` dalam checkout ini. Ini tidak memverifikasi pengaturan deploymen Hostinger/GitHub eksternal, yang dapat menjalankan perintah di luar repositori.

Sebelum pelepasan yang sah:

1. Periksa target deploymen hosting, cabang, perintah build/start, dan setiap hook pra/post-deploy. Konfirmasi bahwa proyek Supabase yang dimaksud yang sudah ada dan kredensial server-saja tetap dikonfigurasi. Pertahankan domain publik yang ada, jalur QR produk, bucket Penyimpanan, dan data pelanggan. Selesaikan target deploymen duplikat yang didokumentasikan sebelumnya sebelum mengasumsikan push memiliki satu target.
2. Ikuti prosedur [Supabase preservation](../../setup/supabase.md#preserve-existing-production-data-when-adding-gascompcare): verifikasi cadangan database dan file Penyimpanan independen, periksa skema yang terpasang, dan dapatkan persetujuan spesifik sebelum menerapkan hanya migrasi Care tambahan. Jangan tambahkan reset database, penggantian skema penuh, atau impor fixture lokal ke hook build atau startup otomatis.
3. Pertahankan konfigurasi pratinjau lokal dan akun fiktif di luar lingkungan produksi. Jangan aktifkan `GASCOMP_LOCAL_HTTP_PREVIEW` pada layanan hosting. Cookie pelanggan dan administrator produksi harus tetap dilindungi HTTPS.
4. Jalankan verifikasi repositori dan deploymen revisi aplikasi yang ditinjau hanya ketika sah. Jika migrasi Care tidak ada, Care harus menampilkan keadaan tidak tersedia daripada membuat skema atau data anggota palsu selama startup.
5. Bandingkan baseline data sebelum/sesudah privat, periksa halaman katalog yang ada, gambar produk dan tujuan QR cetak, dan verifikasi bahwa bukti garansi privat tetap dilindungi. Validasi login dan rotasi password Care di staging; setiap pembuatan akun produksi atau klaim uji coba memerlukan otorisasi eksplisit.
6. Jika aplikasi perlu rollback, kembalikan revisi aplikasi sebelumnya dan pertahankan skema Care tambahan dan catatan anggota. Jangan hapus tabel, kembalikan database lama atas penulisan hidup, atau hapus file Penyimpanan sebagai rollback aplikasi.

Uji coba lokal menetapkan bahwa migrasi Care mempertahankan baris yang ada ditanam dan gagal dengan aman pada tabel Care yang sudah ada. Mereka tidak menetapkan bahwa cadangan jarak jauh, hook deploymen, kredensial proyek, atau sejarah migrasi benar. Tidak ada migrasi produksi, push, deploymen, atau perubahan hosting yang diotorisasi oleh persiapan ini saja.

<a id="gascompcare-release-preparation-on-september-15-2026"></a>
### Persiapan pelepasan GascompCare pada 15 September 2026

Pemilik mengotorisasi *push* GitHub dan deploymen Hostinger. Rilis yang ditinjau mencakup manajemen akun Care, penggantian password wajib dengan minimal 8 karakter, kartu anggota, navigasi publik, serta peningkatan admin mobile yang ada. Pembelian Care dan aktivasi hak tetap ditunda. Lint, pengecekan tipe, semua 117 uji coba Node (termasuk SQL), dan build produksi telah lulus. Chromium dan WebKit memverifikasi pembuatan anggota, penggantian password delapan karakter, persistensi sesi, logout, dan login berikutnya secara lokal.

Migrasi Care tambahan diterapkan dan pemeliharaan data yang ada diverifikasi; lihat [Integrasi Supabase](../integrations/supabase.md#gascompcare-member-accounts).
Variabel pratinjau lokal, anggota fiktif, backup, dan kredensial tetap berada di luar rilis. Pemeriksaan produksi awal menemukan halaman rumah dan garansi tersedia dan `/gascomp-care/login` mengembalikan 404. API GitHub yang tersedia melaporkan tidak ada webhook repositori, jalannya Actions, catatan deploymen, atau status komitmen yang menetapkan pemetaan deploymen Hostinger. Akses hosting Hostinger belum terhubung dalam sesi ini; *push* sukses saja tidak boleh dilaporkan sebagai deploymen hosting yang terverifikasi.

<a id="coverage-claim-confirmation-and-deletion-release"></a>
### Rilis cakupan, konfirmasi klaim, dan penghapusan

Pemilik mengotorisasi *push* GitHub berikutnya dan deploymen Hostinger selanjutnya. Rilis ini menambahkan tampilan klaim sisa/kekadaluwarsa pelanggan, catatan pembelian administrator dan Konfirmasi Klaim, pemilihan anggota, serta penghapusan lunak tunggal/bulk. Telah lulus lint, pengecekan tipe, semua 147 uji coba Node, build produksi, dan alur kerja browser lokal, termasuk batas konfirmasi, ulang penghapusan, pencabutan akses, pemeliharaan riwayat, dan tata letak mobile.

Kedua migrasi database baru (`202609150004` dan `202609150005`) telah diterapkan; pemeliharaan data yang ada dicatat dalam [Spesifikasi Supabase](../integrations/supabase.md#gascompcare-member-deletion).
Tidak ada akun fixture atau pembelian yang disalin ke produksi. Akses hosting Hostinger masih tidak tersedia dalam sesi ini; plugin pencarian hanya menemukan Hostinger Mail untuk penyedia tersebut. *Push* bukan bukti deploymen hosting.

<a id="service-center-release-on-september-16-2026"></a>
### Rilis Pusat Layanan pada 16 September 2026

Pemilik mengotorisasi memindahkan direktori Pusat Layanan, peta interaktif, manajemen lokasi administrator, dan impor tautan Google Maps tanpa kunci API ke `main`, serta mengonfirmasi bahwa deploymen otomatis Hostinger dikonfigurasi. Rilis ini menargetkan aplikasi `support.gascompsuperlock.com` yang ada. Lint, pengecekan tipe, build produksi, dan 146 uji coba Node telah lulus; tiga uji coba opsional tidak terkait dilewati. Pemeriksaan browser lokal mencakup impor Google Maps asli, penggantian bidang eksplisit, respons kadaluwarsa, persistensi database, autentikasi administrator, dan tata letak mobile tanpa tumpahan horizontal.

Migrasi tambahan `202609160001` sudah diterapkan. Kesiapan rilis query mengonfirmasi nol baris pusat layanan, mengaktifkan RLS, dan tidak ada akses baca tabel untuk `anon` atau `authenticated`. Tidak diperlukan migrasi atau impor fixture selama deploymen. Administrator mengisi lokasi setelah rilis.

Alat hosting Hostinger tidak tersedia dalam sesi ini, sehingga pengaturan build penyedia dan log tidak dapat diperiksa secara langsung. API GitHub tidak mengekspos hook repositori, jalannya Actions, atau catatan deploymen untuk pemetaan saat ini. Verifikasi rute publik setelah *push* sebelum melaporkan rilis sebagai aktif.

Komit `afea6bc5031a38c4cb3e3e14e7df2607b4822e93` telah dipush ke `main`.
Pada pukul 02:52 UTC, rute publik `/service-center` mengembalikan HTTP 200 dengan direktori baru. Pemeriksaan Chromium produksi memverifikasi kondisi kosong, semua opsi provinsi 38, reset filter, kontrol peta interaktif, respons tile OpenStreetMap yang sukses, perpindahan bahasa Inggris/Indonesia, dan tata letak mobile. Login administrator dan import short-link Google Maps asli berhasil di host produksi.
Draft yang diimport tidak disimpan; kueri database berikutnya mengonfirmasi nol baris lokasi. Pemeriksaan mencatat tidak ada kesalahan JavaScript halaman. Halaman utama, login admin, dan login Care juga mengembalikan HTTP 200. Bukti lokal disimpan di `.data/service-center-release/production-verification.json`.

<a id="warranty-submission-performance-release-on-september-16-2026"></a>
### Pelepasan kinerja pengajuan garansi pada 16 September 2026

Pemilik mengizinkan push perubahan pengajuan garansi yang diverifikasi ke `main` dan deployment melalui jalur pelepasan otomatis Hostinger yang ada. Pelepasan ini menambahkan persentase upload, umpan balik pemrosesan terpisah, transport dan permintaan penyedia terbatas, bukti upload konkuren, dan metadata bukti batched. Tidak diperlukan migrasi skema atau perubahan lingkungan hosting. Rute publik dan akses bukti pribadi yang ada tetap tidak berubah.

Verifikasi lokal lulus lint, typecheck, build produksi, dan 160 uji Node; empat uji SQL opsional dilewati. Chromium memverifikasi upload sintetik 46,4 MiB terhadap simulasi penyimpanan lokal, termasuk progress upload throttled, decoding video penuh, umpan balik kegagalan, dan retensi file. Verifikasi produksi akan menggunakan nama pelanggan yang sengaja tidak valid sehingga transport dan validasi dapat diperiksa tanpa membuat tiket atau menyimpan bukti.

<a id="service-center-deletion-release-on-september-16-2026"></a>
### Pelepasan penghapusan Pusat Layanan pada 16 September 2026

Pemilik mengizinkan push fitur penghapusan Pusat Layanan yang diverifikasi ke `main` dan deployment melalui jalur pelepasan otomatis Hostinger yang ada di `support.gascompsuperlock.com`. Tidak diperlukan migrasi atau perubahan lingkungan.
Fitur ini menambahkan aksi hapus permanen satu lokasi dengan konfirmasi, autentikasi admin, validasi asal dan ID, revalidasi direktori publik, dan umpan balik kesalahan yang mempertahankan draf saat ini.

Lint, typecheck, build produksi, 164 uji Node, dan pemeriksaan browser desktop/mobile lokal lulus; empat uji SQL opsional dilewati. Verifikasi database lokal menghapus hanya dua lokasi tidak aktif sementara dan mempertahankan lokasi yang ada. Verifikasi produksi memeriksa tombol yang dirender dan membatalkan konfirmasi sehingga lokasi yang ada tetap tidak tersentuh. Bukti deployment disimpan secara lokal di bawah `.data/service-center-delete-release/`.
