<a id="knowledge-handoff"></a>
# Penyerahan pengetahuan

Diperbarui: 2026-09-18
Status: Menunggu verifikasi

<a id="objective"></a>
## Tujuan

Pertahankan perubahan pengetahuan dan catatan produk yang ada hingga asal-usul dan keadaan publikasi yang direncanakan dapat ditinjau. Tidak ada permintaan untuk refresh pengetahuan baru atau publikasi selama tugas organisasi dokumentasi ini.

<a id="current-evidence"></a>
## Bukti saat ini

Status Git menunjukkan indeks pengetahuan runtime, indeks vault, dan catatan produk yang ada telah dimodifikasi; sebuah catatan tutorial yang disetujui telah dihapus; serta catatan FAQ, isu, dan produk yang belum dilacak. Perubahan ini hadir sebelum tugas ini. Kontennya tidak diaudit, diregenerasi, dibaru nama, atau diimpor selama tugas ini. Penamaan dan penempatan file saja tidak menetapkan persetujuan atau kebenaran.

<a id="remaining-work-and-decisions"></a>
## Pekerjaan dan keputusan yang tersisa

Tentukan alur kerja mana yang menghasilkan perubahan dan apakah penghapusan dan penambahan catatan cocok dengan perubahan sumber yang direncanakan. Verifikasi identitas stabil, tautan, dan metadata persetujuan menggunakan spesifikasi milikannya. Jangan anggap ini adalah catatan manual atau output yang dapat dibuang. Keadaan publikasi dan produksi belum diverifikasi.

<a id="verification"></a>
## Verifikasi

Hanya inventaris pohon kerja dan spesifikasi integrasi yang ditinjau. Konten pengetahuan, tautan yang dihasilkan, dan perilaku pipa tetap belum diverifikasi. Jika kode alur kerja Python berubah, jalankan `npm run duoke:test` menggunakan lingkungan virtual repositori; ikuti pemeriksaan akar untuk perubahan JavaScript manapun. Lebih baik prefer pratinjau lokal jika tersedia dan periksa perilaku perintah sebelum menjalankan eksporter yang mungkin mengakses layanan atau menimpa file.

<a id="next-action"></a>
## Tindakan selanjutnya

Ketika diminta melanjutkan pekerjaan pengetahuan, tinjau selisih saat ini dan alur kerja ekspor/impor yang menghasilkan untuk menetapkan asal-usul dan perubahan yang direncanakan, lalu validasi catatan yang terpengaruh tanpa mengekspos data pelanggan dalam laporan.

<a id="references"></a>
## Referensi

- [Spesifikasi pengetahuan dan balasan](../../product/integrations/duoke-support.md)
- [Spesifikasi sinkronisasi katalog](../../product/integrations/duoke-catalog.md)
- [Ekspor pengetahuan](../../../scripts/duoke/export-duoke-knowledge.mjs)
- [Direktori pengetahuan runtime](../../../data/knowledge/)
- [Vault pengetahuan](../../../obsidian/)
- [Rute Node terpusat](../../../scripts/shared/paths.mjs)
- [Rute Python terpusat](../../../scraping/shared/paths.py)
