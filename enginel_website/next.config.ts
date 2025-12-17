import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  experimental: {
    dynamicIO: true,
  },
};

export default nextConfig;
