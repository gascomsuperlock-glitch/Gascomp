import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@ffmpeg/core"],
  outputFileTracingIncludes: {
    "/klaim-garansi": [
      "./src/features/warranty/server/video-inspection-worker.mjs",
      "./node_modules/@ffmpeg/core/dist/umd/*",
      "./node_modules/@ffmpeg/core/package.json",
    ],
  },
  redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "bantuan\\.gascompsuperlock\\.com" }],
        destination: "https://support.gascompsuperlock.com/:path*",
        permanent: true,
      },
    ];
  },
  experimental: {
    serverActions: {
      // Allow a 50 MB video, a 4 MB invoice, four 4 MB photos, and multipart overhead.
      bodySizeLimit: "72mb",
    },
  },
};

export default nextConfig;
