# Laporan kendala CareDirect

[Peta ruang kerja](../../../CONTEXT.md) · [Aturan akar](../../../AGENTS.md)

## Konteks dan masukan

Pemilik formulir keluhan, nomor laporan, penyimpanan video privat, dan ruang kerja laporan admin. Baca [spesifikasi CareDirect](../../../docs/product/features/care-direct.md), [arsitektur](../../../docs/architecture/project-structure.md), serta [Supabase](../../../docs/product/integrations/supabase.md) ketika mengubah persistensi.

## Tugas

| Saat diminta | Proses | Hasil |
| --- | --- | --- |
| Formulir/pengiriman | Telusuri isian, persiapan video, transport, idempotensi, penyimpanan, lalu WhatsApp. | Konfirmasi hanya setelah laporan lengkap tersimpan; pengulangan aman. |
| Admin/status/video | Periksa sesi, asal mutasi, persistensi dan akses Range. | Keluhan privat dengan status yang terkonfirmasi. |
| Tautan/QR | Pertahankan `/lapor-kendala` dan tujuan HTTPS yang didokumentasikan. | Card attention membuka formulir yang tepat. |

## Batas dan keluaran

Logika bisnis berada di fitur ini; routing di `src/app`, utilitas media umum di `src/shared/media`, dan komposisi admin di fitur admin. Jangan campurkan laporan dengan klaim garansi atau akun GascompCare. Tidak ada penulisan atau migrasi produksi tanpa cakupan rilis yang diotorisasi. Ikuti [standar bahasa](../../../docs/architecture/language-standard.md).

## Verifikasi

Jalankan lint, typecheck, tes, dan build sesuai aturan akar; periksa browser desktop/ponsel, kedua bahasa, kegagalan unggah, ulang kirim, status admin dan akses video tanpa sesi. Gunakan data sintetis terisolasi, bukan data pelanggan. Simpan bukti aktual di [serah terima](../../../docs/work/handoffs/handoff-care-direct-complete-v1.md).
