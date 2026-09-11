import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
