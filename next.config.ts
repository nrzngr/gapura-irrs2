import type { NextConfig } from "next";
import path from "path";

const nextConfig = {
  /* config options here */
  reactCompiler: true,
  turbopack: {
    // Set absolute path for Turbopack root to satisfy Next.js workspace detection
    root: path.resolve(__dirname), 
  },
} as import("next").NextConfig;

export default nextConfig;
