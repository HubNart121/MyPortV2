import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // basePath: '/MyPort',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
