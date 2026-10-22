export const careDirectCopy = {
  id: {
    title: "Lapor Kendala", intro: "Ceritakan kendala produk Kakak kepada Gascomp CareDirect. Tim kami akan menindaklanjuti laporan ini secara langsung. Layanan ini terpisah dari klaim garansi.",
    name: "Nama", problem: "Keluhan", whatsapp: "Nomor WhatsApp", orderNumber: "Nomor pesanan", video: "Video kendala", submit: "Kirim laporan", required: "Semua isian wajib diisi.",
    videoHint: "Unggah satu video kendala, maksimal 50 MB. Pastikan video menunjukkan kendala dengan jelas.", preparing: "Menyiapkan video…", uploading: "Mengunggah video", processing: "Unggahan selesai. Sedang memeriksa video dan menyimpan laporan…", original: "Gunakan video asli", success: "Laporan berhasil diterima", report: "Nomor laporan", openWhatsapp: "Lanjut ke WhatsApp", redirect: "WhatsApp akan terbuka untuk menghubungi tim kami. Jika belum terbuka, gunakan tombol di bawah.", noWhatsapp: "Simpan nomor laporan ini. Tim kami akan menghubungi nomor WhatsApp yang Kakak berikan.", error: "Laporan belum dapat dikonfirmasi. Isian dan video tetap tersimpan di formulir. Silakan periksa koneksi dan coba lagi.", fieldError: "Periksa kembali isian dan video sebelum mengirim.",
    notes: [
      "Mohon berkenan untuk menunggu ya Kak, tim khusus kami dari Gascomp CareDirect akan segera menghubungi Kakak untuk memberikan solusi terbaik dan penanganan langsung.",
      "🕒 Catatan Operasional: Tim kami aktif melayani pada hari Senin s.d. Jumat pukul 09.00 - 17.00 WIB (Weekend & Tanggal Merah libur). Pesan di luar jam tersebut akan kami balas pada hari kerja berikutnya.",
      "Agar proses kendala Kakak dapat kami selesaikan dengan cepat dan tuntas, kami mohon bantuan Kakak untuk tidak melakukan pengajuan pengembalian barang/dana atau memberikan ulasan terlebih dahulu sebelum mendapatkan arahan langsung dari tim CareDirect kami.",
      "Kenyamanan dan keamanan dapur Kakak adalah prioritas utama kami. Terima kasih banyak atas kesabaran dan kerja samanya, Kak! 🙏✨",
    ],
  },
  en: {
    title: "Report an issue", intro: "Tell Gascomp CareDirect about your product issue. Our team will follow up with you directly. This service is separate from warranty claims.",
    name: "Name", problem: "Issue description", whatsapp: "WhatsApp number", orderNumber: "Order number", video: "Issue video", submit: "Submit report", required: "All fields are required.",
    videoHint: "Upload one video showing the issue, up to 50 MB. Please make sure the issue is clearly visible.", preparing: "Preparing video…", uploading: "Uploading video", processing: "Upload complete. Checking the video and saving your report…", original: "Use original video", success: "Report received", report: "Report number", openWhatsapp: "Continue to WhatsApp", redirect: "WhatsApp will open to contact our team. If it does not open, use the button below.", noWhatsapp: "Keep this report number. Our team will contact the WhatsApp number you provided.", error: "Your report could not be confirmed. Your details and video are still in the form. Check your connection and try again.", fieldError: "Please check your details and video before submitting.",
    notes: [
      "Please bear with us. Our dedicated Gascomp CareDirect team will contact you shortly to provide the best solution and direct assistance.",
      "🕒 Operating hours: Our team is available Monday to Friday, 09:00 - 17:00 WIB (closed on weekends and public holidays). Messages received outside these hours will be answered on the next working day.",
      "To help us resolve your issue quickly and thoroughly, please do not request a return/refund or leave a review before receiving direct guidance from our CareDirect team.",
      "Your kitchen comfort and safety are our top priority. Thank you for your patience and cooperation! 🙏✨",
    ],
  },
};

export const careDirectValidationMessages: Record<string, string> = {
  "Enter a name of up to 120 characters.": "Masukkan nama, maksimal 120 karakter.",
  "Describe the problem in up to 5,000 characters.": "Ceritakan keluhan, maksimal 5.000 karakter.",
  "Enter a valid WhatsApp number including its country code.": "Masukkan nomor WhatsApp yang valid beserta kode negara, misalnya 6281234567890.",
  "Enter an order number of up to 120 characters.": "Masukkan nomor pesanan, maksimal 120 karakter.",
  "Choose one video up to 50 MB.": "Pilih satu video dengan ukuran maksimal 50 MB.",
  "Please select a valid video.": "Pilih video kendala yang valid.",
  "The video could not be read. Please select another video.": "Video tidak dapat dibaca. Silakan pilih video lain.",
};
