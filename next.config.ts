import type { NextConfig } from "next";
import path from "path";

const nextConfig = {
  /* config options here */
  reactCompiler: true,
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
  modularizeImports: {
    "date-fns": {
      transform: "date-fns/{{member}}",
    },
  },
  turbopack: {
    // Set absolute path for Turbopack root to satisfy Next.js workspace detection
    root: path.resolve(__dirname), 
  },
} as import("next").NextConfig;

export default nextConfig;
