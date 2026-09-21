<a id="warehouse-sku-import"></a>
# Impor SKU Gudang

[Spesifikasi indeks](../spec.md)

Pipa impor massal sementara membaca ekspor XLSX gudang melalui `warehouse:normalize` dan `warehouse:push`.

- Kolom sumber **Nomor SKU**, **Judul**, **Kategori**, **Tautan Gambar**, dan **Kode Produk** dipertahankan karena merupakan kunci skema eksternal.
- Harga, biaya, stok, GTIN, berat, dimensi, tanggal, catatan gudang, tag merek/bahan/kegunaan, dan detail kombinasi-SKU dikecualikan dari skema admin.
- Produk baru adalah draf. Pencocokan menggunakan identitas sumber terlebih dahulu dan SKU tepat kedua agar impor berulang tetap idempoten.
- Nama, status, gambar, tutorial, FAQ, dan panduan masalah yang dikelola admin yang ada dipertahankan.
- Gambar baru hanya diunduh dari host pasar HTTPS yang diperbolehkan, divalidasi sebagai JPG/PNG/WebP hingga 5 MB, dan disalin ke `product-images`.

Hasil impor pada 10 September 2026: 109 baris sumber dinormalisasi; 108 produk draf baru dibuat; SKU `GRS-915` yang ada dipertahankan; 107 gambar disalin. SKU `GHO 50 HP` tetap draf tanpa gambar karena sumber tidak memiliki link gambar. Produk yang tidak ada di buku kerja tidak dihapus.
