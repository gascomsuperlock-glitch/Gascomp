import { readFile, writeFile, mkdir, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { root } from "../shared/paths.mjs";
import { safeUrl } from "../../src/features/main-site/model/content.mjs";
import {
  selectRelease,
  collectImages,
  recordDigest,
  recordKey,
} from "../../src/features/main-site/model/release.mjs";
const directory = join(root, ".data/main-site");

export async function mirrorImage(url, fetcher = fetch) {
  if (!safeUrl(url, true)) throw new Error("Image source is not allowed");
  const response = await fetcher(url, {
    redirect: "error",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok || !response.body) throw new Error("Image download failed");
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      if ((size += part.value.length) > 12_000_000)
        throw new Error("Image too large");
      chunks.push(Buffer.from(part.value));
    }
  } finally {
    await reader.cancel();
  }
  const input = Buffer.concat(chunks);
  const processor = sharp(input, {
    limitInputPixels: 32_000_000,
    animated: false,
    failOn: "warning",
  });
  const metadata = await processor.metadata();
  if (!["jpeg", "png", "webp", "gif", "avif", "heif"].includes(metadata.format))
    throw new Error("Unsupported raster image");
  // Re-encoding removes scripts, attached payloads and source metadata.
  const bytes = await processor
    .rotate()
    .resize({
      width: 1600,
      height: 1600,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 85 })
    .toBuffer();
  const hash = createHash("sha256").update(bytes).digest("hex");
  return { hash, bytes };
}

async function main() {
  const args = process.argv.slice(2);
  if (
    args.some((arg) => !["--review-template", "--write"].includes(arg)) ||
    args.length > 1
  )
    throw new Error(
      "Use --review-template, --write, or no arguments for dry run",
    );
  const snapshot = JSON.parse(
    await readFile(join(directory, "snapshot.json"), "utf8"),
  );
  if (args.includes("--review-template")) {
    const review = {
      decisions: snapshot.records.map((record) => ({
        key: recordKey(record),
        digest: recordDigest(record),
        action: "pending",
        reason: "",
      })),
    };
    await writeFile(
      join(directory, "review.json"),
      JSON.stringify(review, null, 2),
      { flag: "wx", mode: 0o600 },
    );
    console.log(
      "Review template created. Existing reviews are never overwritten.",
    );
    return;
  }
  const release = selectRelease(
    snapshot,
    JSON.parse(await readFile(join(directory, "review.json"), "utf8")),
  );
  const images = collectImages(release.records);
  if (!args.includes("--write")) {
    console.log(
      JSON.stringify({
        records: release.records.length,
        retired: release.retired.length,
        images: images.length,
        written: false,
      }),
    );
    return;
  }
  await mkdir(join(directory, "media"), { recursive: true, mode: 0o700 });
  for (const url of images) {
    const { hash, bytes } = await mirrorImage(url);
    await writeFile(join(directory, "media", `${hash}.webp`), bytes, {
      mode: 0o600,
    });
    release.media[url] = `/main-media/${hash}.webp`;
  }
  const temporary = join(directory, `release-${process.pid}.tmp`);
  try {
    await writeFile(temporary, JSON.stringify(release), {
      mode: 0o600,
      flag: "wx",
    });
    await rename(temporary, join(directory, "release.json"));
  } finally {
    await rm(temporary, { force: true });
  }
  console.log(
    JSON.stringify({
      records: release.records.length,
      retired: release.retired.length,
      images: images.length,
      written: true,
    }),
  );
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch(() => {
    console.error(
      "Release preparation failed. Check review completeness and media availability. The previous release was preserved.",
    );
    process.exitCode = 1;
  });
}
