<a id="duoke-catalog-synchronization"></a>
# Sinkronisasi katalog Duoke

[Indeks spesifikasi](../spec.md)

<a id="scope"></a>
## Ruang lingkup

Ambil data produk dari [Duoke](https://web.duoke.com/#/dk/main/chat) melalui sesi browser yang diotorisasi, normalisasikan dengan Scrapling, sinkronkan dengan katalog admin Gascomp, dan buat catatan terkait dalam gudang Obsidian proyek.

- Ambil SKU produk, identitas sumber, identitas toko bila diperlukan, nama, model, deskripsi, atribut, variasi, dan stempel waktu sumber.
- Pertahankan nama produk sumber, SKU, tanda baca, angka nol di depan, nilai variasi, dan identifikasi penyedia secara persis.
- Jangan ciptakan bidang yang hilang atau gantilah dengan konten demo.
- Penangkapan katalog mengecualikan percakapan, pesan, lampiran, dan data pribadi pelanggan.
- Bidang yang hilang, tidak terformat, atau bertentangan masuk ke laporan tinjauan daripada ditebak secara diam-diam.

<a id="pipeline"></a>
## Alur data

```text
Authorized Duoke browser session
  → product-only response capture
  → normalization and validation
  → data/catalog/duoke-products.json
  → data/reports/duoke-sync-report.json
  → Obsidian product/variation notes
  → idempotent Supabase import
```

Filter tangkap menolak respons yang terkait dengan obrolan, pesan, pelanggan, kontak, dan pesanan. Filter ini juga menghapus bidang berbentuk sensitif dari beban produk yang diterima. Profil browser pribadi dan tangkapan mentah tetap berada di bawah `scraping/.private/` dan diabaikan oleh Git.

Proses pencocokan memakai identitas penyedia/toko/produk yang stabil. Impor memperbarui kolom produk dan variasi milik sumber sambil mempertahankan status, gambar, tutorial, FAQ, dan panduan masalah yang dikelola admin. Identitas sumber yang bertentangan dikeluarkan dan dicatat untuk ditinjau.

Perintah:

```bash
npm run duoke:login
npm run duoke:import
npm run duoke:push
```

Status: Pengambilan data, normalisasi, pelaporan, pembuatan catatan Obsidian, dan impor Supabase telah diimplementasikan. Sesi Duoke yang baru dan terotorisasi diperlukan untuk mengambil data katalog produksi saat ini.

<a id="optional-asynchronous-http-transport"></a>
## Transport HTTP asinkron opsional

HTTPX terpasang di `scraping/.venv` dan dideklarasikan di `scraping/pyproject.toml`
dengan versi yang dikunci di `scraping/uv.lock`. Ulangi instalasi dari akar repositori dengan `uv sync --project scraping --locked --inexact`.

Bantuan yang dapat digunakan kembali adalah `scraping/shared/async_http.py`. Impornya dengan:

```python
from scraping.shared.async_http import fetch_pages

# Inside an async function, using an already verified GET endpoint and session:
results = await fetch_pages(
    endpoint=endpoint,
    headers=authorized_headers,
    cookies=authorized_cookies,
    pages=range(1, 4),
    page_parameter="page",
    concurrency=3,
)
failed_pages = [result for result in results if isinstance(result, Exception)]
if failed_pages:
    raise RuntimeError("The batch is incomplete; handle failed pages before importing.")
```

Titik akhir (endpoint), autentikasi, parameter halaman, penomoran halaman, dan filter harus sesuai dengan permintaan baca yang diverifikasi dari sesi Duoke yang berizin. Helper menggunakan satu klien, mempertahankan filter query, secara default menggunakan tiga permintaan konkuren dan batas waktu HTTPX 30 detik, serta mengembalikan JSON atau pengecualian untuk setiap halaman dalam urutan input. Pengalihan tidak diikuti. Tidak ada upaya ulang otomatis; pemanggilan harus menangani kedaluwarsa autentikasi, batasan laju (termasuk `Retry-After`), dan halaman yang gagal sebelum menyatakan penangkapan lengkap. Gunakan batch terbatas; paginasi kursor yang bergantung memerlukan permintaan berurutan.

Modul ini hanya infrastruktur transportasi. Tidak menemukan titik akhir, mentransfer sesi browser, menyimpan data, atau menggantikan katalog penangkapan yang ada. Integrasi katalog masa depan harus mempertahankan filter produk saja, penyimpanan penangkapan pribadi melalui `scraping.shared.paths`, dan normalisasi yang ada. Pertahankan autentikasi lokal dan jangan pernah mencatat pengecualian mentah yang mungkin berisi URL permintaan atau beban pribadi. Konektivitas dan throughput Duoke langsung belum diverifikasi.

<a id="product-catalog-in-the-conversation-vault"></a>
## Katalog produk di vault percakapan

`scraping/duoke/catalog/archive_duoke_products.py` mengambil katalog produk dari `POST https://web.duoke.com/api/v1/dk/unity/product/list` dan menulis catatan produk ke vault Obsidian yang sama dengan arsip percakapan. Hanya Douke yang menjadi sumber data. Nama marketplace mengidentifikasi kanal yang dikembalikan oleh Douke; proses ekspor tidak pernah mengambil halaman marketplace, URL gambar, atau URL media.

Sesi pribadi dan inventaris toko yang terotorisasi disimpan di bawah `scraping/.private/product-archive/`. Sesi berisi `headers` dan `list_url` yang diverifikasi; inventaris toko hanya mempertahankan metadata yang diperlukan untuk membaca katalog. Data produk mentah dan hasil verifikasi jumlah menggunakan `PRODUCT_ARCHIVE_DIR` yang terpusat. Proses ekspor memilih kolom produk dan varian, serta mengecualikan kredensial akun dan data pelanggan.

```bash
scraping/.venv/bin/python -m scraping.duoke.catalog.archive_duoke_products \
  --fetch --vault "/absolute/path/to/existing/Obsidian vault"
```

Hilangkan `--fetch` untuk memulihkan catatan dan tautan dari katalog lokal yang tersimpan.
Perbarui sesi pribadi dari permintaan browser Douke yang terverifikasi dan terautentikasi jika kedaluwarsa. `messageItemIds` harus berupa string kosong saat meminta katalog tanpa filter. API dapat mengembalikan `hasNextPage: false` sebelum halaman terakhir; enumerasi memakai jumlah halaman dan total produk sebagai gantinya. Setiap halaman harus berasal dari toko dan platform yang diharapkan, dan setiap toko yang selesai harus memiliki jumlah identitas produk sumber unik yang tepat. Respons katalog null dilaporkan terpisah dari katalog kosong yang lengkap.

Catatan produk berada langsung di bawah `Duoke/Produk/`, bersama `Product catalog index.md` yang bernama khusus. Catatan mencakup nama produk sumber, SKU produk dan varian yang tepat, ID sumber, deskripsi lengkap yang tersedia, atribut, harga dan stok saat pengambilan, serta URL media yang disediakan oleh Douke. Media tidak disematkan atau diunduh. Produk dari toko berbeda atau dengan ID sumber berbeda tetap terpisah bahkan ketika SKU mereka cocok. Nilai sumber yang hilang tetap dicatat sebagai hilang. Indeks per toko menghubungkan semua produk.

Pengekspor menambahkan konteks produk pada pembungkus percakapan pribadi yang ada tanpa mengubah isi pesan sumber. Pencocokan dibatasi pada platform dan toko yang sama serta memakai ID kartu produk eksplisit, nama sumber atau SKU persis yang tidak ambigu, atau penyebutan SKU terbatas dalam teks pesan. ID eksplisit yang tidak diketahui, nama terpotong, nama/SKU ambigu, atau potongan SKU tidak boleh mengidentifikasi produk secara diam-diam. Catatan percakapan menautkan produk di samping pesan referensi dan di bagian produk terkait; catatan produk menautkan kembali ke percakapan referensi. Tautan ini menunjukkan referensi, bukan bukti varian yang dibeli atau jawaban pemecahan masalah yang disetujui.

Identitas sumber yang stabil menentukan nama file, dan konten manual di bawah penanda arsip tetap terjaga saat catatan dibuat ulang. Setelah memperbarui arsip percakapan, jalankan ulang pengekspor produk untuk membangun kembali konteks produk. Ekspor ini tidak memublikasikan data katalog ke Supabase atau mengaktifkan jawaban AI.

Pengambilan terverifikasi pada 2026-09-17: Douke mengembalikan 414 produk dan 550 varian dari 12 permintaan katalog marketplace yang selesai, termasuk satu katalog kosong. Kanal Facebook tidak mengembalikan data katalog dan dilaporkan secara terpisah. Terdapat 412 deskripsi teks dan dua deskripsi hanya gambar; URL gambar dipertahankan sebagai referensi tanpa mengambil atau menyematkan media eksternal.
Satu SKU produk dan 23 SKU varian hilang dalam sumber.

Katalog menghubungkan 2.388 pesan dalam 755 dari 881 percakapan yang diarsipkan ke 112 produk yang dirujuk. Referensi pesan lainnya sebanyak 116 ambigu dan memiliki penanda ulasan dalam transkrip mereka, dengan referensi tanpa konten dicatat dalam `scraping/.private/product-archive/context-review.json`. Semua 13.449 pesan sumber tetap utuh. Verifikasi memeriksa 5.371 tautan produk/percakapan yang dihasilkan; jumlah disimpan dalam `scraping/.private/product-archive/link-verification.json`.
