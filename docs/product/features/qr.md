<a id="product-qr-codes-and-urls"></a>
# Kode QR produk dan URL

[Indeks spesifikasi](../spec.md)

- Setiap SKU produk memiliki kode QR tersendiri yang mengarah ke halaman bantuan Gascomp untuk produk tersebut.
- Setiap baris produk pada ringkasan admin membuka tab **Product QR** produk itu secara langsung. Kartu menampilkan nama produk, SKU, URL bantuan yang stabil, dan unduhan PNG.
- Berpindah produk menghapus gambar QR sebelumnya sebelum membuat yang baru. Unduhan dinonaktifkan selama pembuatan masih berlangsung atau gagal; kegagalan menyediakan tindakan untuk mencoba lagi.
- Gambar QR memiliki area kosong di sekelilingnya selebar empat modul. Produk draf menampilkan pengingat untuk menerbitkan dan menyimpan sebelum dibagikan; administrator perlu memeriksa tujuannya sebelum mencetak.
- Administrator dapat mengunduh kode QR sebagai PNG untuk produk atau kemasan.
- Pratinjau dan PNG kode QR produk tetap polos, tanpa logo di tengah. Keduanya mempertahankan koreksi kesalahan tingkat H dan area kosong empat modul. Tujuan produk dan file QR yang sebelumnya diekspor tidak berubah.
- Satu kode QR beranda yang terpisah mengarah persis ke `https://support.gascompsuperlock.com`. Hanya kode QR ini yang memuat logo tulisan Gascomp resmi di tengah dengan latar putih, selebar 26% gambar, padding 1,25%, dan rasio aspek asli. Kode ini merupakan ekspor PNG mandiri, bukan pengganti kode QR produk.
- Kode QR menggunakan origin HTTPS yang ditetapkan dalam `GASCOMP_PUBLIC_BASE_URL`; pembuatan QR untuk localhost dinonaktifkan.
- URL halaman produk tetap stabil ketika tutorial, FAQ, gambar, atau panduan masalah berubah.
- Produk yang tidak lagi dijual tetap tersedia di URL yang sama setelah diarsipkan agar kode QR lama yang sudah dicetak tetap berfungsi.
- Segmen rute berbahasa Indonesia yang sudah ada tetap dipertahankan sebagai kontrak kompatibilitas.

Hostname produksi adalah `support.gascompsuperlock.com`. Verifikasi deployment, DNS, dan HTTPS sebelum mencetak kode QR. Pertahankan tautan lama dengan pengalihan dari `bantuan.gascompsuperlock.com`; lihat [panduan deployment](../operations/deployment.md).

<a id="centered-logo-decision"></a>
## Keputusan logo di tengah

Dikoreksi: 2026-09-18. Setelah meminta satu kode QR beranda yang terpisah dan mempertahankan kode QR produk yang ada, pemilik menjelaskan bahwa logo di tengah hanya untuk kode QR yang mengarah ke `https://support.gascompsuperlock.com`. Keputusan ini menggantikan implementasi sebelumnya yang menambahkan logo pada setiap kode QR produk. Tidak ada alasan tambahan yang disebutkan. Kriteria penerimaan: pratinjau dan unduhan produk tidak memuat logo dan tetap mengarah ke URL produknya; PNG beranda mandiri mempertahankan logo dan terbaca persis sebagai URL beranda. Kode yang sudah dicetak dan hasil ekspor yang tersimpan tidak diubah atau dihapus. Koreksi kesalahan tidak menjamin pemindaian fisik selalu berhasil: uji sampel cetak pada ukuran yang dimaksud dengan beberapa ponsel sebelum membagikannya secara luas.
