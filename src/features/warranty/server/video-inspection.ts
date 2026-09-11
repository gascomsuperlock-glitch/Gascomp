import "server-only";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";

const run = promisify(execFile);

export async function inspectVideo(file: File): Promise<"valid" | "invalid" | "unavailable" | "timeout"> {
  if (!ffmpegPath) return "unavailable";
  let directory: string | undefined;
  try {
    directory = await mkdtemp(path.join(tmpdir(), "warranty-video-"));
    const inputPath = path.join(directory, "evidence");
    await writeFile(inputPath, Buffer.from(await file.arrayBuffer()), { mode: 0o600 });
    const { stdout, stderr } = await run(ffmpegPath, [
      "-hide_banner", "-nostdin", "-loglevel", "error", "-xerror",
      "-max_alloc", "67108864", "-threads", "1", "-err_detect", "explode",
      "-protocol_whitelist", "file,pipe",
      "-f", file.type === "video/webm" ? "matroska" : "mov", "-i", inputPath,
      "-map", "0:V:0", "-map", "0:a?", "-sn", "-dn",
      "-threads", "1", "-progress", "pipe:1", "-f", "null", "-",
    ], { timeout: 30_000, killSignal: "SIGKILL", maxBuffer: 64 * 1024, windowsHide: true });
    // Decode the entire video, including later frames; metadata alone can look valid on a damaged file.
    const hasFrames = [...stdout.matchAll(/^frame=(\d+)/gm)].some((match) => Number(match[1]) > 0);
    return hasFrames && !stderr.trim() ? "valid" : "invalid";
  } catch (error) {
    const failure = error as NodeJS.ErrnoException & { killed?: boolean };
    if (failure.killed) return "timeout";
    if (["ENOENT", "EACCES", "ENOEXEC", "ENOSPC"].includes(failure.code ?? "")) return "unavailable";
    return "invalid";
  } finally {
    if (directory) await rm(directory, { recursive: true, force: true });
  }
}
