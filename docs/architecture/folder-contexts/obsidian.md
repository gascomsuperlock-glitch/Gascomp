<a id="obsidian-folder-context"></a>
# Folder konteks Obsidian

[Peta ruang kerja ](../../../CONTEXT.md) · [Aturan akar ](../../../AGENTS.md)

<a id="context"></a>
## Konteks

Cakupan: `obsidian` dan turunan-nya kecuali jika ada konteks yang lebih dekat yang terdaftar dalam peta ruang kerja.

Catatan produk dan pengetahuan milik sendiri yang digunakan oleh alur ekspor dan pengambilan yang didokumentasikan.

<a id="inputs"></a>
## Input

Baca referensi yang relevan untuk tugas yang diminta, bukan setiap dokumen yang terhubung.

- [Spesifikasi katalog Duoke](../../product/integrations/duoke-catalog.md)
- [Spesifikasi pengetahuan dan balasan](../../product/integrations/duoke-support.md)
- [Spesifikasi bantuan AI](../../product/features/ai-assistance.md)
- [Pembelian sumber pengetahuan](../../setup/ai-assistance.md)

<a id="tasks"></a>
## Tugas

Ini adalah tanggung jawab yang dipicu oleh permintaan saat ini, bukan daftar tugas otomatis.

| Ketika diminta untuk bekerja pada | Proses | Hasil yang diharapkan |
| --- | --- | --- |
| products/ | Temukan alur katalog/pengeluaran produksi dan pertahankan identitas sumber. | Catatan produk dengan tautan yang berfungsi dan bidang sumber yang dapat ditelusuri. |
| knowledge/ | Bedakan konten yang disetujui dari sejarah yang menunggu dan periksa alur produksi. | Status tinjauan yang benar tanpa aktivasi yang tidak diminta. |
| customer-support/ | Baca konvensi jawaban kurasi dan kontrak pengambilan asisten website. | Pengetahuan pelanggan yang diverifikasi dengan metadata yang diharapkan. |
| Vault index | Regenerasi atau edit hanya sesuai dengan pengelolanya. | Indeks yang cocok dengan catatan yang dimaksud tanpa referensi yang rusak. |

<a id="boundaries"></a>
## Batasan

- Pertahankan instruksi agen pemrograman di luar ruang kerja ini agar mereka tidak dapat memasuki pemindaian pengetahuan pelanggan.
- Jangan sertakan percakapan mentah pribadi dalam catatan repositori atau laporan.
- Pertahankan nama file yang dihasilkan dan identifikasi eksternal; tinjauan sumber dilakukan sebelum publikasi.

<a id="outputs-and-verification"></a>
## Output dan verifikasi

Pertahankan file asli dalam folder stabil yang ada. Konteks ini disimpan di luar pohon data/aset dan terhubung dari peta ruang kerja.

Untuk perubahan hanya dokumentasi, validasi tautan relatif, periksa selisih akhir termasuk file baru, dan jalankan `git diff --check`. Jika produsen, perilaku pengambilan, atau rendering berubah, jalankan pemeriksaan akar untuk implementasi tersebut.

Pekerjaan yang ada: [pembelajaran serah terima ](../../work/handoffs/handoff-knowledge-review-v1.md).

Untuk permintaan yang tidak terkait, kembali ke peta ruang kerja. Untuk pekerjaan yang belum selesai, gunakan
[indeks serah terima ](../../work/README.md) dan [alur kontinuitas ](../../work/workflow.md).
