import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // Exclude Prisma from the build
  serverExternalPackages: [],
  // Optimize for serverless
  output: 'standalone',
};

export default nextConfig;
