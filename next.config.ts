import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,

  // Optimize production builds
  experimental: {
    // Enable optimized package imports for smaller bundles
    optimizePackageImports: ["lucide-react", "date-fns"],
  },

  // Cache static assets aggressively
  headers: async () => [
    {
      source: "/:all*(svg|jpg|png|webp|ico|woff2)",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ],
    },
    {
      source: "/_next/static/:path*",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ],
    },
  ],
};

export default nextConfig;
