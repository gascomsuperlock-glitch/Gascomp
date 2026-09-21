<a id="synthetic-video-fixtures"></a>
# Penanda video sintetik

File-file ini berisi pola uji yang dihasilkan, bukan konten pelanggan. Tiga video yang valid masing-masing berisi satu detik dari pola uji berukuran 64x64 piksel pada sepuluh frame per detik; MP4 dan MOV menggunakan H.264, sedangkan WebM menggunakan VP8. Audio-only MP4 berisi 0,2 detik nada buatan 440 Hz yang dikodekan sebagai AAC.

File-file tersebut dihasilkan dengan sumber `testsrc2` dan `sine` dari FFmpeg. Uji menguji salinan rusak di memori untuk melatih pemotongan dan payload frame yang rusak tanpa memerlukan eksekusi FFmpeg sungguhan dalam pengembangan atau produksi.

Kontainer tambahan berisi 0,4 detik pola yang sama pada 25 fps: MKV dan M2TS menggunakan H.264; AVI dan 3GP menggunakan MPEG-4 Part 2; MPG menggunakan MPEG-2; WMV menggunakan WMV2; FLV menggunakan FLV1; OGV menggunakan Theora.

`hevc-with-audio.mov` berisi pola HEVC (`hvc1`) berukuran 320x180 selama satu detik dan audio PCM 48 kHz, mencakup codec video Apple yang umum dan audio QuickTime.

`variable-frame-rate.mov` berisi dua detik pola H.264 berukuran 320x180.
Ini mereproduksi timestamp rekaman layar yang valid yang sebelumnya dibulatkan ke satuan waktu pada laju frame nominal dan ditolak oleh muxer verifikasi output.
Buatlah dengan:

```sh
ffmpeg -f lavfi -i testsrc2=size=320x180:rate=30 -t 2 \
  -vf "setpts='if(eq(mod(N,2),0),N,N-0.9)/(30*TB)'" \
  -fps_mode passthrough -enc_time_base 1:600 -video_track_timescale 600 \
  -c:v libx264 -preset ultrafast variable-frame-rate.mov
```
