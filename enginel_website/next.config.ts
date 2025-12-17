import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  reactStrictMode: true,
  // Disable static page generation for all pages
  dynamicParams: true,
};

export default nextConfig;
