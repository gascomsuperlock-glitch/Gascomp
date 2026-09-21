<a id="turn-dialogue-into-reusable-work"></a>
# Ubah dialog menjadi pekerjaan yang dapat digunakan kembali

[Alur kelangsungan](workflow.md) · [Peta folder](../../CONTEXT.md) · [Indeks pekerjaan](README.md)

<a id="trigger-and-purpose"></a>
## Pemicu dan tujuan

Gunakan proses ini ketika pemilik memperbaiki perilaku, menjelaskan batasan, mengubah keputusan sebelumnya, atau meminta untuk mempertahankan cara kerja yang berhasil. Gunakan juga ketika tugas yang diselesaikan mengungkapkan proses yang dapat diulang. Tangkap hasil yang berguna sambil melakukan tugas yang diotorisasi; jangan mengharuskan pemilik mengulangi koreksi atau menyetujui pembaruan dokumentasi administratif.

Permintaan untuk mengingat sebuah metode memperbarui dokumentasi. Ini tidak mengotorisasi menjalankan metode tersebut terhadap produksi atau melakukan pekerjaan yang tidak terkait.

<a id="extract-only-what-the-conversation-supports"></a>
## Ekstrak hanya apa yang didukung oleh percakapan

| Kolom | Catatan |
| --- | --- |
| Tujuan | Hasil yang diminta dan cakupan yang terpengaruh |
| Batasan atau koreksi | Apa yang harus berlaku, apa yang salah, atau apa yang berubah |
| Sumber | Tanggal dan parafrasa singkat instruksi pemilik, atau referensi dokumen/isu yang stabil |
| Keputusan dan alasan | Perilaku yang dipilih dan alasan yang sebenarnya dinyatakan; labelkan alasan yang disimpulkan oleh agen secara eksplisit |
| Asumsi | Setiap inferensi yang belum terselesaikan; jangan mengubahnya diam-diam menjadi keputusan pemilik |
| Contoh penerimaan | Input/tindakan konkret dan hasil yang diharapkan yang dapat diamati |
| Bukti | Apa yang diperiksa atau dijalankan, hasilnya, dan apa yang masih belum diverifikasi |

Jangan simpan transkrip percakapan lengkap, detail pelanggan pribadi, jalur lampiran, atau alasan penalaran model tersembunyi. Sebuah alasan keputusan singkat sudah cukup. Jika sumber hilang, katakan begitu saja. Kode menunjukkan perilaku yang ada; itu tidak membuktikan niat pengguna. Koreksi garansi hipotetikal yang digunakan untuk menjelaskan metode ini adalah contoh, bukan instruksi pemilik historis yang dipulihkan.

<a id="put-each-result-in-its-owning-document"></a>
## Masukkan setiap hasil ke dalam dokumen pemiliknya

| Hasil | Tujuan |
| --- | --- |
| Perilaku produk yang tahan lama | Spesifikasi topik yang ada |
| Aturan kerja global | Root AGENTS.md, dengan detail yang terhubung ke alur kerja pemilik |
| Tanggung jawab folder atau keputusan arsitektur | Dokumen konteks folder atau struktur proyek |
| Metode multi-langkah yang dapat diulang | Dokumen fokus di `docs/work/procedures/` |
| Pertanyaan sementara, upaya perbaikan, atau bukti pelaksanaan | Catatan serah terima tugas yang ada |

Tautkan keputusan kanonik dari prosedur dan catatan serah terima alih-alih mengulanginya. Untuk keputusan material, tambahkan catatan ringkas di dokumen pemilik:

```markdown
### <Decision title>

Recorded: YYYY-MM-DD
Source: <owner instruction paraphrase or document/issue reference>
Decision: <behavior and scope>
Reason: <stated rationale, or explicitly labeled inference>
Supersedes: <earlier decision, or None>
Acceptance: <observable example or link to a test/procedure>
Evidence: <link to dated results; do not imply unrun checks passed>
```

Lewati pencatatan terpisah untuk pengeditan minor yang tujuannya sudah jelas dalam teks pemiliknya. Jika keputusan berubah, perbarui aturan kanonik dan tandai keputusan lama sebagai superseded jika mempertahankan alasannya bermanfaat. Hapus instruksi usang dari konteks/prosedur terkait. Tanyakan hanya jika konflik material tidak dapat diselesaikan dari permintaan saat ini dan bukti yang ada.

<a id="build-a-procedure-from-an-actual-task"></a>
## Buat prosedur dari tugas aktual

1. Nyatakan pemicu, cakupan tugas, prasyarat, dan sumber persyaratan.
2. Daftar himpunan terkecil file input dan titik masuk konkret untuk diperiksa.
3. Tulis langkah berurutan dengan hasil perantara yang diharapkan. Tandai di mana asumsi yang belum terselesaikan menghalangi langkah berikutnya.
4. Tambahkan kasus sukses dan kegagalan representatif, dengan hasil yang dapat diamati yang diharapkan.
5. Identifikasi tes atau perintah yang ada dan nyatakan apa yang masing-masing dapat dan tidak dapat membuktikan.
6. Jalankan pemeriksaan yang sesuai untuk pekerjaan yang diotorisasi. Catat tanggal, lingkungan, perintah, hasil, revisi atau identitas working-tree yang ditest, dan batasan dalam serah terima. Jangan pernah mempromosikan metode hanya berdasarkan nama file tesnya.
7. Hubungkan prosedur dari konteks pemilik dan indeks kerja agar permintaan yang cocok dapat menemukannya. Muat hanya prosedur yang sesuai ketika tugas berulang.

Gunakan nama deskriptif dan stabil seperti `warranty-status.md`. Prosedur adalah instruksi yang tahan lama; status serah terima/nama file versi berlaku hanya untuk artefak pekerjaan bertanggal. Sebuah prosedur tidak memerlukan pembungkus SKILL.md untuk secara eksplisit dibaca melalui tautan konteks proyek. Tambahkan otomatisasi hanya ketika langkah deterministik berulang memiliki kebutuhan yang terbukti dan verifikasi yang sesuai.

<a id="evidence-levels"></a>
## Tingkat bukti

| Tingkat | Arti |
| --- | --- |
| Diusulkan | Langkah atau perilaku yang diharapkan ditulis tetapi belum diperiksa terhadap implementasi |
| Diperiksa sumber | Kode dan spesifikasi yang relevan telah diperiksa; eksekusi belum diverifikasi |
| Terverifikasi sebagian | Pemeriksaan bernama telah lulus, dengan jalur atau lingkungan sisanya tercantum |
| Terverifikasi untuk cakupan yang dicatat | Semua pemeriksaan penerimaan untuk cakupan tersebut telah lulus dalam lingkungan yang dinyatakan |

Tingkat ini menggambarkan bukti, bukan persetujuan pemilik atau penyebaran. Tes tiruan yang sempit dapat mendukung metode yang terverifikasi sebagian tanpa membuktikan perilaku browser, ketahanan nyata, atau kesiapan produksi. Perubahan kode atau persyaratan selanjutnya dapat membuat bukti awal menjadi tidak valid; periksa sebelum digunakan kembali. Jika pemeriksaan gagal, catat kegagalan dan revisi metode daripada terus memanggilnya sebagai terverifikasi.

<a id="applying-this-workflow-now"></a>
## Menerapkan alur kerja ini sekarang

Prosedur konkret pertama adalah [prosedur kerja status garansi](procedures/warranty-status.md). Bukti saat ini berada di [catatan serah terima garansi](handoffs/handoff-warranty-review-v1.md). Permintaan pemilik dalam percakapan ini mengizinkan dokumentasi dan penjelasan proses ini. Permintaan itu tidak menyediakan keputusan produk historis yang hilang.
