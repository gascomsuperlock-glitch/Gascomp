import {
  ALL_FORMATS, BlobSource, BufferTarget, Conversion, Input, Mp4OutputFormat,
  Output, Quality, WebMOutputFormat, canEncodeAudio, canEncodeVideo,
} from "mediabunny";
import type { CompressionMessage } from "./video-compression";

function report(message: CompressionMessage) { self.postMessage(message); }

async function compress(file: File): Promise<File | null> {
  const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });
  try {
    const videos = await input.getVideoTracks();
    const audios = await input.getAudioTracks();
    const track = videos[0];
    // Preserve unusual evidence as-is, including HDR colors and alternate tracks.
    if (videos.length !== 1 || audios.length > 1 || !await track.canDecode() || await track.hasHighDynamicRange()) return null;
    const duration = await input.computeDuration();
    if (!Number.isFinite(duration) || duration <= 0) return null;
    const sourceWidth = await track.getDisplayWidth();
    const sourceHeight = await track.getDisplayHeight();
    const scale = Math.min(1, 1280 / Math.max(sourceWidth, sourceHeight), 720 / Math.min(sourceWidth, sourceHeight));
    const width = Math.max(2, Math.floor(sourceWidth * scale / 2) * 2);
    const height = Math.max(2, Math.floor(sourceHeight * scale / 2) * 2);
    const quality = new Quality({ bitrate: 1_200_000 });
    const mp4 = await canEncodeVideo("avc", { width, height, quality })
      && (!audios.length || await audios[0].getCodec() === "aac" || await canEncodeAudio("aac"));
    if (!mp4 && (!await canEncodeVideo("vp8", { width, height, quality })
      || (audios.length > 0 && !await canEncodeAudio("opus")))) return null;

    const target = new BufferTarget();
    const output = new Output({ format: mp4 ? new Mp4OutputFormat({ fastStart: "fragmented" }) : new WebMOutputFormat(), target });
    const conversion = await Conversion.init({
      input, output, showWarnings: false,
      video: { codec: mp4 ? "avc" : "vp8", width, height, fit: "contain", quality, keyFrameInterval: 2, allowRotationMetadata: false },
      // Copy AAC when possible; otherwise retain sound by encoding the audio track.
      audio: mp4 && audios.length && await audios[0].getCodec() === "aac"
        ? {} : { codec: mp4 ? "aac" : "opus", quality: new Quality({ bitrate: 96_000 }) },
    });
    if (!conversion.isValid || conversion.discardedTracks.some(({ track }) => track.type === "video" || track.type === "audio")) {
      await conversion.cancel();
      return null;
    }
    // Stop growing output before it can consume more memory than the source.
    target.on("write", ({ end }) => { if (end >= file.size * 0.9) throw new Error("Compression did not reduce the video size."); });
    conversion.onProgress = (progress) => report({ percent: progress * 100 });
    await conversion.execute();
    if (!target.buffer?.byteLength || target.buffer.byteLength >= file.size * 0.9) return null;
    const result = new File([target.buffer], `${file.name.replace(/\.[^.]+$/, "")}-compressed.${mp4 ? "mp4" : "webm"}`, { type: mp4 ? "video/mp4" : "video/webm", lastModified: file.lastModified });
    const check = new Input({ formats: ALL_FORMATS, source: new BlobSource(result) });
    try {
      const resultDuration = await check.computeDuration();
      if (!Number.isFinite(resultDuration) || Math.abs(resultDuration - duration) > Math.max(0.25, duration * 0.01)
        || (await check.getVideoTracks()).length !== videos.length || (await check.getAudioTracks()).length !== audios.length) return null;
    } finally { check.dispose(); }
    return result;
  } finally { input.dispose(); }
}

self.onmessage = async ({ data }: MessageEvent<File>) => {
  try { report({ file: await compress(data) }); }
  catch { report({ file: null }); }
};
