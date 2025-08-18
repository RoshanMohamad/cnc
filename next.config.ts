import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Removed API rewrites - ESP32 should connect directly to Next.js server
};

export default nextConfig;
