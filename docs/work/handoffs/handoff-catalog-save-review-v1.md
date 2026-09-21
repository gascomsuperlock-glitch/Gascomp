<a id="online-catalog-save-diagnosis-and-persistence-change"></a>
# Katalog online simpan diagnosis dan perubahan persistensi

Diperbarui: 2026-09-18
Status: Diterapkan; pemilik menunggu ulang

<a id="objective"></a>
## Tujuan

Pulihkan produk baru Simpan di `https://support.gascompsuperlock.com/admin`.
Pemilik melaporkan respons simpan terputus yang bertahan setelah mencoba ulang.

<a id="current-evidence"></a>
## Bukti saat ini

- Pemilik mengonfirmasi bahwa produk baru yang gagal memiliki **no photos**. Ini
  menggantikan hipotesis unggah gambar. Perubahan langsung unggah gambar eksperimental
  yang dilakukan selama diagnosis sepenuhnya dihapus dari diff akhir.
- Browser live mengirim katalog JSON ke `/admin/content`; produk baru kosong menghasilkan
  sekitar 112 KB. Permintaan tidak valid kecil mengembalikan HTTP 400 yang diharapkan
  sebelum persistensi. Probe padding 128 KB dikembalikan dalam 2,8 detik; probe
  2 MB menabrak batas waktu 60 detik klien diagnostik. Waktu ini tidak menetapkan
  penyebab kegagalan tanpa foto pemilik.
- Baca katalog produksi dan tes persistensi PGlite sekali pakai berhasil. Implementasi
  sebelumnya menulis ulang semua produk dan semua lima tabel anak pada setiap Simpan.
  Dalam salinan sekali pakai, menambahkan produk kosong melakukan 11 mutasi database.
  Implementasi baru melakukan satu upsert produk untuk skenario yang sama tersebut,
  dengan baca prasyarat berjalan secara bersamaan.
- Diff akhir terbatas pada modul persistensi katalog, tes regresinya baru di database,
  spesifikasi admin pemiliknya, dan ini handoff/index. Perubahan ruang kerja yang sudah
  ada secara ekstensif dipertahankan.
- Tidak ada Simpan katalog produksi, unggahan, penerapan, mutasi database, atau migrasi
  yang dilakukan. Tidak ada migrasi skema diperlukan untuk perubahan ini.
- Log waktu berjalan tetap tidak tersedia: refresh OAuth Hostinger yang ada memerlukan
  login. Kegagalan transport yang tepat belum direproduksi atau dikaitkan dengan
  batas waktu hosting tertentu. Ini adalah peningkatan persistensi yang diverifikasi, bukan
  bukti bahwa insiden live terpecahkan.

<a id="follow-up-http2-transport-error"></a>
### Lanjutan: kesalahan transport HTTP/2

Pemilik kemudian melaporkan `net::ERR_HTTP2_PROTOCOL_ERROR` pada
`/admin/warranty-tickets`. Endpoint ini melakukan baca untuk notifikasi garansi (setiap 30 detik dan
saat tab menjadi terlihat); terpisah dari endpoint Simpan katalog. Permintaan ditolaknya
ditangkap oleh UI notifikasi dan tidak secara langsung menonaktifkan Simpan katalog.
Laporan ini adalah bukti kegagalan transport, bukan bukti kesalahan validasi produk atau
dari hipotesis volume tulis sebelumnya.

Cek live baca-hanya pada 2026-09-18 mengembalikan HTTP 200 untuk semua empat kombinasi
antara HTTP/1.1 versus HTTP/2 dan identitas versus respons kompresi. Semua koneksi
terselesaikan langsung ke `145.223.108.57`; probe tersebut tidak menetapkan bahwa
Cloudflare merutekan permintaan. Tiga baca Chromium otentikasi berikutnya juga mengembalikan
JSON sukses valid dari endpoint tiket. Kesalahan HTTP/2 yang dilaporkan tidak direproduksi,
sehingga masalah hosting/proteksi/koneksi atau klien tertentu yang bersifat intermiten
masih mungkin. Tidak ada konfigurasi aplikasi atau hosting yang diubah untuk lanjutan ini,
dan tidak ada otorisasi penerapan diberikan.
Hasil perbandingan protokol ada di file lokal yang diabaikan
`.data/catalog-save-diagnosis/http-protocol.json`; tidak ada beban pelanggan disertakan dalam outputnya. Perubahan pending sebelumnya
saat ini distage oleh aktor lain; pertahankan index dan jangan menyimpulkan bahwa mereka
telah diterapkan.

<a id="access-blocker-and-support-packet"></a>
### Pemblokir akses dan paket dukungan

Upaya baca-only lagi untuk mengambil log runtime Hostinger satu jam terakhir
masih gagal dengan persyaratan refresh/sign-in OAuth. Tidak ada konektor Hostinger
yang tersedia dalam katalog alat saat ini. Paket dukungan tanpa kredensial disiapkan di `.data/catalog-save-diagnosis/hostinger-support.txt` bagi pemilik untuk
mengirim ke Hostinger atau menggunakan saat menyediakan log runtime/proxy yang diminta. Tidak ada pesan yang dikirim ke pihak eksternal. Pada tindak lanjut ini, Git melaporkan transfer sebelumnya dan file persistensi katalog bersih; itu tidak menetapkan apakah aktor lain menaruhnya. Sinkronisasi keadaan rilis sebelum menaruh.

<a id="production-release-on-september-18-2026"></a>
### Rilis produksi pada 18 September 2026

Permintaan deploys GitHub dan Hostinger berulang dari pemilik mengotorisasi rilis ini. Perubahan persistensi yang disiapkan hanya telah ditunggu ke cabang fitur, sementara `main` produksi masih berakhir sebelum komit itu. Komit rilis `406abc32cedcd66b6611ab8a02079cb5de5aa8e1` merebase perubahan empat file berskala pada sejarah produksi saat ini. GitHub Actions menjalankan `35320069160` lulus gerbang verifikasi dan migrasi penuh, lalu mempromosikan komit yang sama persis ke `release` dan `main`.

Deploys Git otomatis Hostinger
`01a0b371-95ac-71f6-a567-7fda3dc9e85a` mendeteksi komit yang benar tetapi gagal
sebelum menghasilkan log build apa pun. Arsip Git sumber-satu dari komit yang sama,
dengan SHA-256 `3891b4594b461bdf2743f520fdc1d83fea5f9bf55bd10aea10349c5fb6b0bfa6`,
ditaruh melalui API deploys JavaScript Hostinger. Deploys arsip `01a0b374-2a88-705c-bb09-87ab898e7ca3` selesai sukses.

Sesi Chromium produksi terotentikasi terpisah kemudian mengirimkan katalog saat ini tidak berubah. `POST /admin/content` mengembalikan JSON HTTP 200 dalam sekitar
6 detik, daskbor melaporkan Disimpan, reload readback tetap identik, dan tidak ada kesalahan halaman terjadi. Verifikasi no-op ini tidak melakukan mutasi katalog.
Ini mengonfirmasi transportasi yang ditaruh dan jalur konten tidak berubah; produk baru spesifik pemilik yang masih perlu retry dari tab asli.

<a id="renewed-github-and-http2-check-on-september-18-2026"></a>
### Cek GitHub dan HTTP/2 diperbarui pada 18 September 2026

`git ls-remote` segar mengonfirmasi kedua cabang produksi (`main` dan `release`)
di `4d2cdc266bc565818a968314823de465ec483948`. API GitHub Actions melaporkan
[run 35323472548](https://github.com/gascomsuperlock-glitch/Gascomp/actions/runs/35323472548)
selesai sukses untuk komit itu. Perubahan sumbernya menambahkan pencatatan kedatangan katalog Simpan; itu tidak mengubah endpoint notifikasi garansi. Revisi Hostinger aktif tidak dapat diverifikasi secara independen dengan alat yang tersedia.

Probes baca-only terotentikasi segar mengembalikan HTTP 200 atas HTTP/1.1 dengan dan
tanpa kompresi dan atas HTTP/2 dengan kompresi. Kasus encoding identitas yang diminta HTTP/2,
time out setelah 30 detik tanpa respons HTTP atau versi HTTP dinegosiasikan dilaporkan. Ini adalah time out koneksi yang diamati, bukan reproduksi
kesalahan protokol Chromium yang tepat atau bukti bahwa negosiasi HTTP/2 menyebabkan itu.
Laporan probe pertama disimpan secara pribadi di
`.data/catalog-save-diagnosis/http-protocol-first-followup.json`.
Perbandingan protokol empat kasus berulang mengembalikan HTTP 200 dalam semua kasus.
Tiga fetch Chromium headless terotentikasi berikutnya mengembalikan JSON HTTP 200 sukses dalam 736–929 ms. Badan pelanggan dan kredensial tidak dicetak.

Tidak ada konfigurasi aplikasi atau hosting yang diubah, dan tidak ada push atau deployment baru yang dilakukan dalam pemeriksaan ini. Kegagalan intermiten yang tepat tetap belum terpecahkan. Bukti selanjutnya yang diperlukan: waktu permintaan/protokol atau NetLog dari browser yang gagal, dikorelasikan dengan log runtime/proxy Hostinger dan revisi rilis aktifnya.

<a id="save-interruption-and-database-readback-follow-up"></a>
### Penelusuran lanjutan gangguan penyimpanan dan pembacaan kembali database

Pemilik melaporkan pesan Penyimpanan (Save) terputus lagi dan mengonfirmasi bahwa tidak ada VPN/proksi yang digunakan. Pemilik meminta pemeriksaan langsung ke database karena operasi tersebut menambahkan produk baru. Inspeksi Supabase hanya baca (read-only) mengonfirmasi 43 produk, termasuk satu produk baru Food Chopper EHC-01 yang diterbitkan dibuat pada
2026-09-18 08:33:18.869671 UTC (15:33:18 WIB). SKU-nya tetap `NEW-SKU-6P7LP9`; tidak diubah selama diagnosis. Pemilik masih perlu mengonfirmasi bahwa ini adalah produk yang dimaksud dan bahwa bidang-bidang tersimpannya cocok dengan edit mereka.

Akses log runtime Hostinger berhasil melalui klien otentikasi lokal yang ada. Permintaan Penyimpanan 229,918 byte pada 08:33:16 UTC selesai dengan HTTP 200 setelah 2,806 ms dan 43 produk. Jalur ini mengirim tidak ada penulisan katalog yang valid, sehingga permintaan tersebut berasal dari sesi lain; timestamennya cocok dengan baris database baru. Ini menetapkan persistensi produk tersebut, bukan pengiriman respons kepada browser pemilik. Bukti runtime mentah pribadi dipertahankan di bawah direktori `.data/catalog-save-diagnosis/` yang diabaikan.

Dua permintaan Chromium yang otentikasi berisi data berbentuk katalog yang tidak valid berukuran sekitar 112 KB dan 230 KB mengembalikan HTTP 400 yang diharapkan dengan header trace permintaan dalam 5,6 dan 11,1 detik. Permintaan ini pernah memanggil persistensi. Probe HTTP/2 beban-terbobot lebih besar curl terpisah waktu habis (timeout); sampel HTTP/1,1 dari batch tersebut tidak valid karena nama file diagnostik bertabrakan dan dikeluarkan dari kesimpulan. Observasi ini tidak menetapkan akar penyebab kode aplikasi.

API build Hostinger melaporkan Git build `01a0b397-c400-7179-b892-2a06b30e5e32` untuk `4d2cdc2` gagal, sementara Git build sebelumnya `ffd37cd` selesai. Respons langsung dan log tetap mengekspos pelacakan kedatangan permintaan dari sumber yang lebih lambat. Metadata build dan runtime yang diamati tidak menetapkan deployment tepat-eksak bersih. Tidak ada deployment atau konfigurasi hosting yang diubah.

Selanjutnya: konfirmasi produk baru dengan pemilik dan simpan bidang-bidang tersimpan yang belum tersimpan apa pun. Korelasikan permintaan browser yang gagal dengan ID permintaan server/NetLognya untuk mengisolasi pengiriman respons, dan selaraskan build Hostinger yang gagal sebelum rilis lain. Jangan buat produk duplikat atau ulangi penulisan secara otomatis hanya karena browser melaporkan respons terputus.

<a id="emrc-01-successful-retry-and-save-performance-follow-up"></a>
## EMRC-01 ulang coba sukses dan penelusuran lanjutan kinerja Penyimpanan

Pemilik mengidentifikasi EMRC-01 sebagai produk yang gagal; kesuksesan sebelumnya EHC-01 bukan bukti untuk permintaan ini. EMRC-01 tidak hadir selama ulang coba yang gagal, sementara permintaan kontrol kecil membuktikan bahwa pencatatan kedatangan berfungsi. Ulang coba pemilik berikutnya sukses: kedatangan permintaan adalah 2026-09-18 09:38:48.750 UTC, penyelesaian adalah HTTP 200 setelah 2,770 ms, dan ukuran permintaan adalah 214,981 byte. Pembacaan kembali database mengonfirmasi baris EMRC-01 diterbitkan yang dibuat pada 09:38:51.073 UTC dan 44 produk. Pemilik kemudian melaporkan bahwa Penyimpanan terlalu lambat. Tidak ada patch lokal yang di-deploy, sehingga kesuksesan ini tidak dikaitkan dengan perubahan yang disiapkan. Penyebab tepat dari gangguan transport sebelumnya tetap belum terbukti.

Implementasi berskala terbatas siap di `/private/tmp/douke-web-save-readback`, cabang `fix/catalog-save-readback`, berdasarkan `5486035`. Editor mengirim produk yang berubah, penghapusan eksplisit, dan pengaturan yang berubah alih-alih seluruh katalog. Server menggabungkan ini ke dalam snapshot terproteksi yang ada, mempertahankan konten yang tidak terkait, dan mengembalikan hanya produk/pengaturan yang berubah untuk rekonsiliasi klien. Permintaan Simpan penuh legacy tetap didukung. Respons terputus menggunakan readback autentikasi dan mengonfirmasi sukses hanya untuk konten lengkap yang cocok. Tidak diperkenalkan ulang penulisan otomatis atau migrasi. Edit simultan produk yang sama tetap last-writer wins; readback secara konservatif tidak dapat memvalidasi byte gambar baru yang diunggah.

Pengukuran baca-hanya dari snapshot database 44-produk saat ini, menganggap EMRC-01 sebagai produk yang ditambahkan, menghasilkan 115.144 byte permintaan penuh versus 1.112 byte permintaan berubah (99,0% lebih kecil). Respons penuh adalah 115.171 byte versus 1.189 byte respons ringkas. Ini adalah pengukuran snapshot, bukan rekonstruksi setiap byte dalam permintaan 214.981-byte pemilik.

Verifikasi: lint, typecheck, build produksi lulus. Suite Node: 255 lulus, 6 opsional dilewati, 0 gagal. Uji PGlite disposable satu-snapshot, satu-upsert simpan-produk-baru, retry no-op, penambahan/pengaturan tidak terkait, penghapusan eksplisit, preservasi arsip/media, penolakan duplikat-URL, dan baca-gagal sebelum tulis diliput. Enam aliran Chromium build produksi lulus pada lebar desktop/mobile 1440/390: simpan aplikasi nyata ke simulasi penyimpanan loopback-hanya, respons terputus dengan readback yang cocok, dan readback hilang mempertahankan edit. Setiap mengirim satu POST; badan produk-baru baru kosong adalah 395 byte. Tidak ada kesalahan halaman atau overflow horizontal. Respons pemulihan browser dimock; perilaku database nyata diliput secara terpisah oleh PostgreSQL disposable. Tidak ada penulisan produksi dibuat.

Tes jaringan Chromium lokal terpisah pada upload 16 KiB/s dan latensi 50 ms mengukur 7.229 ms untuk permintaan penuh 116.323 byte dan 68 ms untuk permintaan ringkas 399 byte. Keduanya melalui rute aplikasi nyata ke penyimpanan lokal simulasi. Angka ini mengisolasi overhead transport dan tidak menjanjikan latensi produksi atau membuktikan bahwa kesalahan protokol intermiten Hostinger diperbaiki. Bukti ada di folder `.data/save-readback/` yang diabaikan di worktree.

Status rilis: belum dikomitmen, belum dipush, belum dideploy. Instruksi terbaru pemilik meminta Simpan lebih cepat; rilis produksi memerlukan otorisasi di bawah aturan root. Sebelum rilis, rekonsiliasi `main` terbaru karena kerja QR terpisah aktif. Setelah rilis yang diotorisasi, verifikasi revisi Hostinger yang tepat dan waktu Simpan nyata, pertahankan tab lama yang belum tersimpan apa pun, dan periksa readback produk sebelum mencoba menulis ulang.

Sumber keputusan/koreksi: klarifikasi pemilik pada 2026-09-18 mengidentifikasi EMRC-01 lalu meminta simpan lebih cepat. Ruang lingkup: Simpan katalog. Akseptansi: menambahkan satu produk mentransfer hanya perubahannya, mempertahankan baris katalog lain, dan mengonfirmasi hasil; Simpan sukses produk berbeda tidak pernah diperlakukan sebagai sukses produk yang gagal. Perilaku pemilik ada dalam spesifikasi admin worktree terisolasi.

<a id="ekef-01-follow-up-and-release-preparation"></a>
## EKEF-01 follow-up dan persiapan rilis

Pada 2026-09-18, pemilik melaporkan kegagalan baru lagi untuk menyimpan produk baru untuk EKEF-01.
Query hanya baca pada 10:00:13, 10:00:34, dan 10:01:16 UTC tidak menemukan produk atau variasi yang cocok, dan pemilik mengonfirmasi bahwa browser menampilkan kesalahan. Tidak ada entri katalog *Save* yang muncul dalam log runtime saat ini. Tidak ada durasi sukses yang dapat ditugaskan pada permintaan tersebut yang gagal.

Hostinger melaporkan deploys arsip selesai pada 09:46:10 UTC setelah build Git `5486035` gagal. GitHub `main` dan `release` berada di `5486035`. Perubahan sejak basis sebelumnya hanya menyangkut render QR; implementasi *Save* compact dan readback tidak ada dalam produksi. Cabang terisolasi dipush tanpa konflik ke `5486035`, mempertahankan perubahan QR tersebut, dan verifikasi dilakukan berulang kali sebelum mempersiapkan rilis *Save*. Akses ke tab browser pemilik yang memiliki edit tidak tersedia; tidak ada tab admin yang cocok yang terekspos oleh sesi Chrome atau Safari lokal. Simpan tab tersebut sampai bidang yang belum disimpan dapat dipulihkan atau disalin ke editor yang baru dimuat setelah rilis yang diotorisasi.

Pertanyaan deploys yang menunda belum menerima persetujuan rilis eksplisit.
Tidak ada push, deploys, penulisan produksi, atau perubahan konfigurasi hosting yang dilakukan.

<a id="remaining-work-and-decisions"></a>
## Pekerjaan dan keputusan yang tersisa

- Pemilik harus mencoba *Save* lagi di tab asli tanpa memperbarui. Periksa produk dalam tab autentikasi lain terlebih dahulu karena respons yang hilang sebelumnya mungkin sudah menyimpannya.
- Jika kegagalan transport berlanjut, dapatkan status/timing Network untuk permintaan yang gagal dan log runtime hosting; pulihkan autentikasi Hostinger sesuai kebutuhan.
- Protokol permintaan konten penuh dan penulisan nontransaksional tetap ada. Perubahan ini tidak memperkenalkan deteksi konflik editor konkuren atau penundaan mutasi otomatis.

<a id="decisions-and-corrections"></a>
## Keputusan dan koreksi

Sumber: klarifikasi pemilik pada 2026-09-18, "tidak ada foto." Ruang lingkup: insiden ini.
Keputusan: investigasikan persistensi tanpa foto dan hapus perubahan upload gambar eksperimental yang tidak terkait. Alasan: gambar tidak hadir dalam alur kerja yang gagal.
Inferensi Agen: mutasi katalog penuh berurutan yang tidak perlu dapat meningkatkan paparan terhadap timeout hosting; kegagalan hidup yang tepat masih belum dikonfirmasi.
Perilaku yang tahan lama dicatat di [admin specification](../../product/features/admin.md).

Penerimaan: menambahkan produk baru kosong menyimpan produk tersebut tanpa menghapus atau menulis ulang kembali panduan produk yang ada. Ulangi tanpa edit lebih lanjut tidak melakukan penulisan.

<a id="verification"></a>
## Verifikasi

- `npm run lint` lulus.
- `npm run typecheck` lulus setelah build akhir. Satu percobaan antara menemui tipe hasil generasi yang usang dari rute gambar eksperimental yang sudah dihapus; build berikutnya membuat ulang artefak tersebut.
- `npm run test`: 241 lulus, 6 tes opsional dilewati, 0 gagal. Lima tes PGlite baru mencakup produk baru, baris lama yang dipertahankan, isi dan urutan catatan anak, percobaan ulang tanpa perubahan, pengaturan, retensi arsip/media, penghapusan draf, dan kegagalan baca sebelum penulisan. Transport Supabase dan Storage menggunakan tiruan; batas relasional dan pembacaan ulang memakai PostgreSQL sementara yang nyata.
- `npm run build` lulus untuk implementasi persistensi akhir.
- GitHub Actions run `35320069160` meluluskan verifikasi dan pemeriksaan migrasi, lalu mempromosikan commit rilis `406abc3` ke `main`.
- Deployment arsip Hostinger `01a0b374-2a88-705c-bb09-87ab898e7ca3` selesai setelah build Git otomatis gagal tanpa log.
- Save produksi terautentikasi tanpa perubahan mengembalikan JSON HTTP 200 dalam sekitar 6 detik; status Saved dan pembacaan ulang setelah reload lulus tanpa mengubah nilai katalog.
- Persistensi snapshot produksi yang dibaca saja lulus di PGlite sementara dengan dan tanpa gambar sintetis; Storage gambar menggunakan tiruan. Tidak ada penulisan ke proyek produksi.
- Pemeriksaan Chromium terautentikasi pada situs aktif mengonfirmasi permintaan Save dan UI kegagalan yang ada. Tidak ada mutasi valid dikirim ke situs aktif. Perubahan akhir ini hanya memengaruhi persistensi; UI yang terlihat tidak berubah. Uji browser untuk percobaan upload gambar yang dibatalkan tidak menjadi bukti penerimaan perubahan ini.
- Diff sesuai cakupan, tautan dokumentasi, dan spasi putih diperiksa. Log verifikasi lokal, hash sumber, dan patch rilis tiga file berada di `.data/catalog-save-diagnosis/` yang diabaikan Git. Jangan terbitkan diagnostik privat.

<a id="next-action"></a>
## Tindakan selanjutnya

Coba lagi Save produk baru yang belum disimpan dari tab pemilik. Jika browser yang sama masih melaporkan respons terputus, ambil status dan waktu permintaan `/admin/content` di panel Network, lalu bandingkan dengan permintaan produksi tanpa perubahan yang terverifikasi sebelum mengubah protokol persistensi lagi.

<a id="references"></a>
## Referensi

- [Spesifikasi admin](../../product/features/admin.md)
- [Persistensi](../../../src/features/catalog/server/content-store.ts)
- [Tes regresi database](../../../src/features/catalog/server/content-store.test.mjs)
- [Transport Save](../../../src/features/catalog/model/save-request.ts)

<a id="september-18-photo-upload-investigation-and-deployed-correction"></a>
## Investigasi unggah foto dan perbaikan yang dideploy pada 18 September

Pemilik mengonfirmasi bahwa percobaan gagal menyertakan foto/video dan memakai tab baru setelah pukul 17:10 WIB. Karena itu insiden ini tidak boleh dikaitkan dengan tab lama. Permintaan tidak valid yang terkendali mereproduksi `ERR_HTTP2_PROTOCOL_ERROR` pada 29.994 ms: koneksi hosting mengirim `RST_STREAM CANCEL` dan `GOAWAY PROTOCOL_ERROR` sebelum handler menerima permintaan. Unggahan besar melalui HTTP/1 juga lambat. Aturan tepat penyedia hosting tetap belum diketahui.

Compact Save `87c5b43` dideploy pada 10:10:45 UTC; EKEF-01 sudah tersimpan pada 10:03:12 UTC. Perbaikan lanjutan untuk unggah foto langsung `37bd09f` lulus CI run `35335021007` dan berada di `main`/`release`. Build arsip Hostinger `01a0b413-8f5e-7009-a1ac-d8ed3ea138ba` selesai pada 10:34:33 UTC (17:34 WIB), setelah deployment Git otomatis gagal. Foto kini diunggah langsung ke Storage sebelum Save metadata; transfer yang selesai di-cache untuk percobaan ulang. Video sudah menggunakan unggahan langsung. Tidak ada perubahan skema.

Lint, typecheck, dan build lulus; 260 tes Node lulus dan enam tes opsional dilewati. Dua belas pemeriksaan browser lokal pada desktop/ponsel lulus dengan tiruan transfer media/Save serta jalur compact Save, pembacaan ulang, dan persistensi lokal. Save produksi tanpa perubahan membutuhkan 848/967 ms dan mempertahankan 48 produk. Otorisasi foto bertanda tangan yang nyata berhasil dalam 5.201/448 ms; PUT Storage yang sengaja diblokir mempertahankan edit dan mencegah Save katalog. Tidak ada media atau produk produksi yang dibuat. Satu verifikasi GET mengalami `socket hang up`; verifikasi baca saja berikutnya berhasil setelah percobaan ulang dengan koneksi baru. Bukti ini tidak membuktikan bahwa semua gangguan transport hosting telah selesai atau bahwa unggahan media asli pemilik telah terverifikasi.

Bukti privat awal disimpan dalam checkout terisolasi `/private/tmp/douke-web-save-readback` dan `.data/media-save-diagnosis/` pada saat investigasi; checkout sementara tersebut sudah tidak tersedia pada 21 September. Perubahan checkout pemilik yang tidak terkait dipertahankan. Penerimaan unggah foto/video oleh pemilik dari tab yang dimuat setelah 17:34 WIB masih perlu dipisahkan dari verifikasi teknis di atas. Jangan bagikan NetLog atau token sesi mentah.
