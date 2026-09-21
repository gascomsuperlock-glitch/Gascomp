# Konteks folder data

[Peta ruang kerja](../../../CONTEXT.md) · [Aturan akar](../../../AGENTS.md)

## Konteks

Cakupan: `data` dan turunannya, kecuali jika peta ruang kerja menunjukkan konteks yang lebih dekat.

Folder ini memiliki catatan katalog ternormalisasi, pengetahuan runtime, dan laporan sinkronisasi.

## Masukan

Baca rujukan yang relevan untuk tugas yang diminta, bukan semua dokumen tertaut.

- [Penempatan dan ketergantungan](../project-structure.md)
- [Spesifikasi katalog Duoke](../../product/integrations/duoke-catalog.md)
- [Spesifikasi pengetahuan dan balasan](../../product/integrations/duoke-support.md)
- [Spesifikasi impor gudang](../../product/integrations/warehouse.md)

## Tugas

Tanggung jawab ini berlaku ketika diminta, bukan daftar pekerjaan otomatis.

| Ketika diminta mengerjakan | Proses | Hasil yang diharapkan |
| --- | --- | --- |
| `catalog/` | Identifikasi normalizer/importer dan periksa identitas sumber yang stabil. | Catatan ternormalisasi yang divalidasi dengan asal sumber yang jelas. |
| `knowledge/` | Telusuri alur ekspor/tinjauan dan metadata persetujuan. | Pengetahuan yang diterbitkan/ditinjau konsisten dengan sumber yang dimaksud. |
| `reports/` | Hasilkan melalui alur pemilik dan bedakan pratinjau dari hasil yang diterapkan. | Laporan bertanggal tanpa data sensitif, dengan hasil aktual. |

## Batasan

- Jangan ganti nama file hasil secara terpisah dari produsen dan konsumennya.
- Jangan perlakukan catatan hasil sebagai instruksi manual atau bukti persetujuan.

## Keluaran dan verifikasi

Pertahankan file asli dalam folder stabil yang ada. Konteks ini disimpan di luar pohon data/aset dan ditautkan dari peta ruang kerja.

Untuk perubahan dokumentasi saja, validasi tautan relatif, periksa diff akhir termasuk file baru, dan jalankan `git diff --check`. Jika produsen, perilaku pengambilan, atau rendering berubah, jalankan pemeriksaan implementasi dari instruksi akar.

Pekerjaan yang ada: [serah terima pengetahuan](../../work/handoffs/handoff-knowledge-review-v1.md).

Untuk permintaan yang tidak terkait, kembali ke peta ruang kerja. Untuk pekerjaan yang belum selesai, gunakan [indeks serah terima](../../work/README.md) dan [alur keberlanjutan](../../work/workflow.md).
