import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Capacitor dev origins so the Android emulator (10.0.2.2) and iOS
  // simulator (localhost) can load JS bundles from the Next.js dev server.
  // Without this, Next.js 15+ blocks requests with non-localhost Host headers,
  // meaning React never hydrates and onClick handlers never attach.
  allowedDevOrigins: [
    "10.0.2.2",   // Android emulator
  ],
};

export default nextConfig;
