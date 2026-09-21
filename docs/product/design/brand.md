<a id="brand-identity-and-public-design"></a>
# Identitas merek dan desain publik

[Indeks spesifikasi](../spec.md)

Panduan merek disimpan di [Gascomp - Panduan.pdf](<../../brand/Gascomp - Guidelines.pdf>); dokumentasi merek harus berada di `docs/brand/`; aset yang digunakan langsung oleh situs web tetap berada di `public/`.

Referensi visual adalah [Situs web Gascomp Superlock](https://gascompsuperlock.com/).

- Gunakan logo resmi, warna, dan tipografi secara konsisten.
- Ikon browser menggunakan supergrafik berbentuk huruf A resmi yang dijelaskan pada halaman 2 dan 5 panduan merek, berwarna putih di atas biru laut Gascomp `#021B40`. `src/app/icon.svg` menyediakan ikon yang dapat diperbesar, dan `src/app/favicon.ico` menyediakan cadangan berukuran 16, 32, dan 48 piksel dengan desain yang sama.
- Arah saat ini menggunakan nama merek biru laut resmi, biru Gascomp jenuh, sian, jarak antar elemen yang luas, dan kontrol berbentuk kapsul. Update tanggal 14 September 2026 menambahkan aksen kuning lime dan merah muda mengikuti preferensi pemilik untuk situs web yang berani dan berwarna-warni.
- Gantikan ilustrasi sementara dengan aset logo dan foto produk yang disetujui ketika file tersebut tersedia.
- Pertahankan alur bantuan yang disepakati: katalog dapat dicari di URL akar dan halaman bantuan khusus produk dibuka melalui QR code.
- Prioritaskan penggunaan mobile karena banyak pelanggan datang dengan memindai kemasan. Pastikan identitas produk, akses tutorial, pemecahan masalah, dan WhatsApp mudah diakses.

<a id="public-home-page-design"></a>
## Desain halaman depan publik

Redesain tanggal 14 September 2026 mencakup halaman depan dan header publik yang dibagikan:

- Gunakan biru Gascomp `#0035B9` untuk hero, biru laut `#021B40` untuk teks dan bagian kontak, sian `#31B4DD`, kuning lime `#DAEF69`, merah muda `#FFB39D`, dan permukaan putih off-white hangat `#FFFDF7`.
- Pertahankan logo resmi. Hero menggunakan judul Raleway yang dihosting secara lokal dan teks pendukung Open Sans; sisinya situs mempertahankan Manrope. File font dan lisensi yang ada tetap berada di `public/fonts`.
- Gunakan judul besar dan ekspresif, ilustrasi panduan miring yang dibangun dari HTML/CSS, pengingat QR code, kartu bantuan berwarna-warni, dan kartu produk yang jelas. Grafik dekoratif tetap disembunyikan dari teknologi bantu.
- Pertahankan pemilihan produk sebagai tindakan utama. Tautan cepat mengarah ke panduan produk, dukungan garansi, dan detail kontak. Pertahankan `#produk`, `#bantuan`, `#hubungi`, URL produk, dan tujuan WhatsApp yang dikonfigurasi.
- Pertahankan katalog dapat dicari berdasarkan nama, model, dan SKU. Sediakan pencarian berlabel, pengumuman hasil, tindakan pencarian yang jelas, dan tautan dukungan ketika tidak ada hasil atau panduan yang diterbitkan tersedia.
- Susun konten secara vertikal di mobile. Pertahankan fokus keyboard yang terlihat, tautan lompat, aksi ramah sentuhan, kontras yang dapat dibaca, dan dukungan gerak berkurang. Kartu produk menggunakan visibilitas konten untuk membatasi pekerjaan rendering untuk katalog besar.
- Dashboard admin mempertahankan sistem desainnya sendiri. Formulir bantuan produk dan garansi publik mempertahankan tata letak yang ada.
