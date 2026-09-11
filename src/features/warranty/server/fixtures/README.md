# Synthetic video fixtures

These files contain generated test patterns, not customer content. The three
valid videos contain one second of a 64-by-64-pixel test pattern at ten frames
per second; MP4 and MOV use H.264, and WebM uses VP8. The audio-only MP4 contains
0.2 seconds of a generated 440 Hz tone encoded as AAC.

They were generated with FFmpeg's `testsrc2` and `sine` sources. Tests damage
copies in memory to exercise truncation and corrupt frame payloads without
needing a native FFmpeg executable in development or production.
