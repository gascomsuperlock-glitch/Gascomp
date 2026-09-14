# Synthetic video fixtures

These files contain generated test patterns, not customer content. The three
valid videos contain one second of a 64-by-64-pixel test pattern at ten frames
per second; MP4 and MOV use H.264, and WebM uses VP8. The audio-only MP4 contains
0.2 seconds of a generated 440 Hz tone encoded as AAC.

They were generated with FFmpeg's `testsrc2` and `sine` sources. Tests damage
copies in memory to exercise truncation and corrupt frame payloads without
needing a native FFmpeg executable in development or production.

The additional containers contain 0.4 seconds of the same pattern at 25 fps:
MKV and M2TS use H.264; AVI and 3GP use MPEG-4 Part 2; MPG uses MPEG-2;
WMV uses WMV2; FLV uses FLV1; OGV uses Theora.

`hevc-with-audio.mov` contains a one-second 320x180 HEVC (`hvc1`) pattern
and 48 kHz PCM audio, covering a common Apple video codec and QuickTime audio.

`variable-frame-rate.mov` contains two seconds of a 320x180 H.264 pattern.
It reproduces valid screen recording timestamps that used to be rounded to
nominal frame-rate ticks and rejected by the verification output muxer.
Generate it with:

```sh
ffmpeg -f lavfi -i testsrc2=size=320x180:rate=30 -t 2 \
  -vf "setpts='if(eq(mod(N,2),0),N,N-0.9)/(30*TB)'" \
  -fps_mode passthrough -enc_time_base 1:600 -video_track_timescale 600 \
  -c:v libx264 -preset ultrafast variable-frame-rate.mov
```
