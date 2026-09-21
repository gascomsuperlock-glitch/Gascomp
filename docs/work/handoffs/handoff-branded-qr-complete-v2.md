<a id="qr-logo-scope-handoff"></a>
# Ruang lingkup penugasan logo QR

Diperbarui: 2026-09-18
Status: Selesai

<a id="objective"></a>
## Tujuan

Pertahankan pratinjau unduhan produk QR sederhana. Simpan logo Gascomp berpusat hanya untuk satu QR mandiri yang mengarah ke `https://support.gascompsuperlock.com`.

<a id="current-evidence"></a>
## Bukti saat ini

- Kartu [QR](../../../src/features/catalog/components/qr-code-card.tsx) telah dipulihkan dan diluncurkan dengan generasi QR sederhana menggunakan URL asli, dimensi, warna, zona diam, dan koreksi level H.
- Generator [bermerk](../../../src/features/catalog/model/branded-qr.ts) tetap tersedia. Ekspor halaman utama yang ada di `.data/qr-exports/gascomp-support-home.png` telah dipertahankan byte-per-byte dan tujuannya diverifikasi.
- Perubahan pengguna yang ada di Duoke, dokumentasi katalog Simpan, dan konfigurasi Playwright/paket telah dipertahankan.
- Peluncuran produk-logo sebelumnya `5eab260a468ade889eeb66091a7f03c05b67f6f5` diluncurkan setelah jalannya GitHub Actions run 35328293358. Build arsip Hostinger `01a0b3cc-b06a-7271-a45e-a16868b8cec9` berhasil setelah deployment Git otomatis gagal tanpa log. Peluncuran sebelumnya ini digantikan oleh koreksi ruang lingkup yang telah diluncurkan `5486035e2fd661a705b76efc32270840d8963e44`.

<a id="remaining-work-and-decisions"></a>
## Pekerjaan dan keputusan yang tersisa

Deployment dan verifikasi produksi terautentikasi telah selesai. Ekspor halaman utama dan file QR produk yang ada telah dipertahankan. Pemindaian cetak fisik masih belum diverifikasi. Build Git Hostinger otomatis masih gagal tanpa log; fallback arsip yang ada berhasil.

<a id="decisions-and-corrections"></a>
## Keputusan dan koreksi

Sumber: klarifikasi pemilik pada 2026-09-18 bahwa logo tengah hanya untuk QR halaman utama, setelah meminta satu QR tambahan dan mempertahankan QR produk yang ada. Ini menggantikan implementasi logo semua produk sebelumnya. Tidak ada alasan tambahan yang dinyatakan. [Spesifikasi QR](../../product/features/qr.md#centered-logo-decision) memiliki persyaratan yang telah dikoreksi. Pemilik secara eksplisit mengizinkan deployment pada pesan berikutnya pada 2026-09-18.

<a id="verification"></a>
## Verifikasi

Koreksi pohon kerja lokal diperiksa pada 2026-09-18:

- `npm run lint`, `npm run typecheck`, dan `npm run build` lulus.
- `npm run test`: 241 lulus, 6 dilewati, 0 gagal.
- Headless Chrome menguji kartu QR aktual dalam perancah terisolasi pada lebar desktop dan mobile. Gambar produk hanya berisi warna gelap dan putih asli, tanpa logo, dan didekode menjadi URL produk yang tepat. Byte unduhan PNG cocok dengan pratinjau; tata letak mobile tidak memiliki tumpahan horizontal.
- PNG halaman utama mandiri telah dipertahankan byte-per-byte dan secara independen didekode menjadi persis `https://support.gascompsuperlock.com`.

Verifikasi deployment pada 2026-09-18:

- Checkout rilis terisolasi: lint, pengecekan tipe, pembangunan produksi, dan 285 tes Node/SQL berhasil dengan tanpa tes yang dilewati.
- Hanya kartu QR dan spesifikasi QR milik yang berubah dalam commit `5486035e2fd661a705b76efc32270840d8963e44`. Tidak ada perubahan skema atau pekerjaan lokal yang tidak terkait yang disertakan.
- [Pelaksanaan GitHub Actions 35330808513](https://github.com/gascomsuperlock-glitch/Gascomp/actions/runs/35330808513) lulus verifikasi dan mempromosikan commit tersebut secara tepat ke `main`.
- Pembangunan Git otomatis Hostinger `01a0b3e6-01c9-7068-9f6d-c405b8ba3967` gagal dengan nol baris log. Arsip sumber dari commit yang sama diunggah melalui alat deployment yang ada; pembangunan arsip `01a0b3e6-efd5-73bd-acf1-050f7441e1e9` selesai dengan sukses.
- Pemeriksaan Chrome produksi terautentikasi membuka produk diterbitkan yang sudah ada: hanya warna piksel gelap/putih asli yang hadir, tidak dideteksi logo tengah, jsQR mendekode URL produk yang tepat, dan halaman tersebut mengembalikan HTTP 200. Byte unduhan PNG cocok dengan pratinjau. Tata letak mobile tidak memiliki overflow horizontal; tidak terjadi kesalahan halaman browser.
- Lintas pertama browser lulus pemeriksaan QR/gambar/unduh tetapi menemukan socket hang-up saat mengambil tujuan. Pengulangan ulang pada produk diterbitkan dengan transport retry terbatas selesai dengan sukses.
- Verifikasi SHA-256 mengonfirmasi bahwa PNG halaman utama mandiri tetap tidak berubah dari byte ke byte. Tidak dilakukan Simpan katalog, mutasi data pelanggan, perubahan lingkungan, atau perubahan DNS.
- Bukti operasional lokal ada di `.data/plain-qr-release/`. Kredensial tidak dicetak atau dikomitkan.

<a id="next-action"></a>
## Tindakan selanjutnya

Perbarui halaman admin produksi dan buka Product QR untuk mengunduh PNG produk polos. Terus menggunakan PNG halaman utama bermerk yang sudah ada. Verifikasi sampel fisik sebelum mencetak secara skala besar.

<a id="references"></a>
## Referensi

- [Spesifikasi QR](../../product/features/qr.md)
- [Spesifikasi Deploymentemen](../../product/operations/deployment.md)
