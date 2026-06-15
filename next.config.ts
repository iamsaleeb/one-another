import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Allow Capacitor dev origins so the Android emulator (10.0.2.2) and iOS
  // simulator (localhost) can load JS bundles from the Next.js dev server.
  // Without this, Next.js 15+ blocks requests with non-localhost Host headers,
  // meaning React never hydrates and onClick handlers never attach.
  allowedDevOrigins: [
    "10.0.2.2", // Android emulator
    "192.168.0.3", // physical device on LAN
  ],
  images: {
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days — optimized images are immutable for a given URL
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/notifications",
        destination: "/inbox",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
