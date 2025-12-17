import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // Disable static page generation
  experimental: {
    isrMemoryCacheSize: 0,
  },
};

export default nextConfig;
