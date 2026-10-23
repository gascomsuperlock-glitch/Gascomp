import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  rewrites() {
    if (process.env.GASCOMP_MAIN_SITE_ENABLED !== "true") return [];
    return {
      beforeFiles: [
        { source: "/sitemap.xml", destination: "/site-sitemap" },
        { source: "/robots.txt", destination: "/site-robots" },
        { source: "/", destination: "/site" },
        { source: "/produk/:path*", destination: "/site/produk/:path*" },
      ],
      afterFiles: [],
      fallback: [{ source: "/:path*", destination: "/site/:path*" }],
    };
  },
  headers() {
    return [
      ...(process.env.GASCOMP_MAIN_SITE_ENABLED === "true"
        ? [
            {
              source: "/:path*",
              headers: [
                { key: "X-Content-Type-Options", value: "nosniff" },
                {
                  key: "Referrer-Policy",
                  value: "strict-origin-when-cross-origin",
                },
                { key: "X-Frame-Options", value: "DENY" },
                {
                  key: "Content-Security-Policy",
                  value:
                    "object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
                },
              ],
            },
          ]
        : []),
      {
        source: "/admin/main-site/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          {
            key: "Content-Security-Policy",
            value:
              "object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
          },
        ],
      },
    ];
  },
  serverExternalPackages: ["@ffmpeg/core"],
  outputFileTracingIncludes: {
    "/admin/tiket/*/lampiran/*": [
      "./src/features/warranty/server/video-preview-worker.mjs",
      "./node_modules/@ffmpeg/core/dist/umd/*",
      "./node_modules/@ffmpeg/core/package.json",
    ],
    "/care-direct/reports": [
      "./src/shared/media/server/video-inspection-worker.mjs",
      "./node_modules/@ffmpeg/core/dist/umd/*",
      "./node_modules/@ffmpeg/core/package.json",
    ],
    "/warranty/claims": [
      "./src/shared/media/server/video-inspection-worker.mjs",
      "./node_modules/@ffmpeg/core/dist/umd/*",
      "./node_modules/@ffmpeg/core/package.json",
    ],
    "/klaim-garansi": [
      "./src/shared/media/server/video-inspection-worker.mjs",
      "./node_modules/@ffmpeg/core/dist/umd/*",
      "./node_modules/@ffmpeg/core/package.json",
    ],
  },
  redirects() {
    return [
      ...(process.env.GASCOMP_MAIN_SITE_ENABLED === "true"
        ? [
            ...[
              "klaim-garansi",
              "lapor-kendala",
              "service-center",
              "gascomp-care",
            ].map((path) => ({
              source: `/${path}/:path*`,
              destination: `https://support.gascompsuperlock.com/${path}/:path*`,
              permanent: true,
            })),
            {
              source: "/dll",
              destination: "https://support.gascompsuperlock.com/klaim-garansi",
              permanent: true,
            },
            {
              source: "/wp-admin/:path*",
              destination: "/admin",
              permanent: true,
            },
            {
              source: "/wp-login.php",
              destination: "/admin/login",
              permanent: true,
            },
          ]
        : []),
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
