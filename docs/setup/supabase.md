# Menyiapkan Supabase Gascomp

Pemeriksaan terbaru: konfigurasi server berhasil membaca ketujuh tabel katalog (products, product_variations, product_images, site_settings, tutorial_videos, product_issues, faq_items). Semuanya masih kosong. Bucket product-images sudah tersedia dengan batas 5 MiB. Pemeriksaan ini bersifat read-only; CRUD dan kebijakan akses masih perlu diuji.

Jika SQL menghasilkan `42P07: relation "products" already exists`, jangan hapus tabel atau jalankan ulang migrasi awal. Pada proyek yang telah diperiksa, objek katalog sudah tersedia sehingga langkah pembuatan tabel dapat dilewati.

1. Buka proyek Supabase yang dipakai. Periksa tabel yang sudah ada melalui Table Editor.
2. Hanya untuk proyek yang belum memiliki tabel katalog: buka SQL Editor dan jalankan isi `supabase/migrations/202609100001_catalog.sql`. Skrip membuat tabel katalog, kebijakan akses baca publik, dan bucket gambar. Skrip berjalan dalam transaksi dan berhenti jika nama tabel atau bucket sudah digunakan. Jangan menghapus tabel lama untuk mengatasi konflik.
3. Dari pengaturan API Keys proyek, salin secret key ke `.env.local` sebagai `SUPABASE_SECRET_KEY=...`. Jangan menggunakan awalan `NEXT_PUBLIC_` untuk kunci ini. Kode juga mendukung kunci legacy melalui `SUPABASE_SERVICE_ROLE_KEY` jika diperlukan. Jangan kirim nilai kunci melalui chat.
4. Jalankan ulang server development setelah perubahan environment.
5. Uji produk draft dari admin, unggah gambar, lalu publikasi. Pastikan draft tidak terbaca oleh pengunjung dan produk terbit bisa dilihat dari browser lain.

Migrasi ini belum memindahkan katalog lokal, membuat tabel tiket, atau menjalankan impor Duoke. Jangan menganggap integrasi selesai sebelum CRUD dan hak akses diuji dengan secret key yang tersedia.

Bucket `product-images` bersifat publik; hanya untuk foto produk yang boleh diakses publik. Bukti klaim garansi memerlukan bucket privat terpisah. Metadata produk draft dilindungi RLS, tetapi file dalam bucket publik tetap dapat diakses jika URL-nya diketahui.
