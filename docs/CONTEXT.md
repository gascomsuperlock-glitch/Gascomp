<a id="documentation-workspace"></a>
# Ruang kerja dokumentasi

[Peta ruang kerja](../CONTEXT.md) · [Aturan akar](../AGENTS.md)

<a id="context"></a>
## Konteks

Cakupan: `docs` dan seluruh turunannya, kecuali jika peta ruang kerja menunjukkan konteks yang lebih dekat.

Folder ini memiliki kesepakatan produk, aturan arsitektur, petunjuk penyiapan, rujukan, dan keberlanjutan pekerjaan.

<a id="inputs"></a>
## Masukan

Baca rujukan yang relevan dengan tugas, bukan semua dokumen yang tertaut.

- [Indeks topik](product/spec.md)
- [Penempatan dan ketergantungan](architecture/project-structure.md)
- [Bahasa dan kompatibilitas](architecture/language-standard.md)
- [Alur keberlanjutan](work/workflow.md)
- [Koreksi dan metode yang dapat digunakan kembali](work/learning.md)

<a id="tasks"></a>
## Tugas

Tanggung jawab berikut berlaku saat diminta dalam tugas saat ini, bukan daftar pekerjaan otomatis.

| Saat diminta mengerjakan | Proses | Hasil yang diharapkan |
| --- | --- | --- |
| `product/` | Arahkan menurut topik dan catat keputusan perilaku yang tetap pada spesifikasi pemilik. | Indeks ringkas dan satu dokumen topik yang menjadi rujukan utama. |
| `architecture/` | Jelaskan batasan, penamaan, dan perubahan tanggung jawab. | Penempatan file dan kontrak folder yang konsisten. |
| `setup/` | Cocokkan instruksi dengan perintah yang tersedia dan kebutuhan lingkungan yang didokumentasikan. | Penyiapan yang dapat dijalankan dengan prasyarat jelas. |
| `brand/` dan `reference/` | Pertahankan atribusi sumber dan identitas rujukan asli. | Bahan rujukan yang tertaut dari spesifikasi pemilik. |
| `work/` | Cocokkan file dan hasil pemeriksaan yang diamati sebelum memperbarui catatan serah terima terkait. | Kemajuan bertanggal, hal yang belum selesai, dan langkah berikutnya yang dapat dilakukan. |

<a id="boundaries"></a>
## Batasan

- Dokumen Markdown (`.md`) milik proyek dan percakapan dengan pemilik menggunakan bahasa Indonesia. Nama teknis serta nilai kompatibilitas tetap dipertahankan.
- Rujukan dan transkrip eksternal tidak menggantikan aturan akar.
- Jangan menduplikasi daftar tugas di konteks, spesifikasi, dan catatan serah terima.

<a id="outputs-and-verification"></a>
## Keluaran dan verifikasi

Simpan persyaratan utama di spesifikasi, tanggung jawab folder yang stabil di konteks, dan pekerjaan yang benar-benar belum selesai di catatan serah terima.

Untuk perubahan dokumentasi saja, validasi tautan relatif, periksa diff akhir termasuk file baru, dan jalankan `git diff --check`.

Untuk permintaan yang tidak terkait, kembali ke peta ruang kerja. Untuk pekerjaan yang belum selesai, gunakan [indeks serah terima](work/README.md) dan [alur keberlanjutan](work/workflow.md).
