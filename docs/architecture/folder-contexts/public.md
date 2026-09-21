<a id="public-folder-context"></a>
# Konteks folder publik

[Peta ruang kerja ](../../../CONTEXT.md) · [Aturan akar ](../../../AGENTS.md)

<a id="context"></a>
## Konteks

Cakupan: `public` dan turunan-nya kecuali jika konteks yang lebih dekat terdaftar dalam peta ruang kerja.

File sendiri yang diserve langsung di bawah URL publik, termasuk font, lisensi, dan aset merek.

<a id="inputs"></a>
## Input

Baca referensi yang relevan untuk tugas yang diminta, bukan setiap dokumen yang terhubung.

- [Spesifikasi merek ](../../product/design/brand.md)
- [QR dan URL stabil ](../../product/features/qr.md)
- [Penempatan dan ketergantungan ](../project-structure.md)

<a id="tasks"></a>
## Tugas

Ini adalah tanggung jawab yang dipicu oleh permintaan saat ini, bukan daftar tugas otomatis.

| Ketika diminta untuk bekerja pada | Proses | Hasil yang diharapkan |
| --- | --- | --- |
| Aset merek | Temukan konsumen dan referensi merek yang disetujui sebelum penggantian. | Aset yang benar dengan URL referensi yang stabil. |
| fonts/ | Periksa konsumen font dan pertahankan file lisensi yang disediakan. | Font yang berfungsi dan lisensi yang dipertahankan. |
| Pembersihan aset | Jejak semua konsumen dan kontrak URL yang didokumentasikan sebelum penghapusan atau penamaan ulang. | Tidak ada tautan aplikasi yang rusak atau tautan aset yang dibagikan secara eksternal. |

<a id="boundaries"></a>
## Batasan

- Jangan letakkan internal CONTEXT.md atau catatan tugas di dalam folder aset yang diserve secara publik.
- Jangan rename aset yang dirujuk secara eksternal hanya untuk menerapkan penamaan status alur kerja.

<a id="outputs-and-verification"></a>
## Output dan verifikasi

Pertahankan file asli dalam folder stabil yang ada. Konteks ini disimpan di luar pohon data/aset dan terhubung dari peta ruang kerja.

Untuk perubahan dokumentasi saja, validasi tautan relatif, periksa diff akhir termasuk file baru, dan jalankan `git diff --check`. Jika produsen, perilaku pengambilan, atau rendering berubah, jalankan pemeriksaan akar untuk implementasi tersebut.

Untuk permintaan yang tidak terkait, kembali ke peta ruang kerja. Untuk pekerjaan yang belum selesai, gunakan
[indeks serah terima ](../../work/README.md) dan [alur kontinuitas ](../../work/workflow.md).
