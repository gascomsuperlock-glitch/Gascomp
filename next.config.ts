import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["ffmpeg-static"],
  outputFileTracingIncludes: {
    "/klaim-garansi": ["./node_modules/ffmpeg-static/ffmpeg*"],
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
      bodySizeLimit: "40mb",
    },
  },
};

export default nextConfig;
