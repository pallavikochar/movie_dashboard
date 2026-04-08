
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/movie_dashboard",
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co'
      }
    ],
  },
};

export default nextConfig;
