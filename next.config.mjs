/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Handle node: prefixed imports from pptxgenjs
      // First, alias node:xxx to xxx
      config.resolve.alias = {
        ...config.resolve.alias,
        'node:fs': 'fs',
        'node:https': 'https',
        'node:http': 'http',
        'node:path': 'path',
        'node:crypto': 'crypto',
        'node:stream': 'stream',
        'node:zlib': 'zlib',
        'node:util': 'util',
        'node:buffer': 'buffer',
      };
      // Then, set fallbacks to false (empty modules)
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        https: false,
        http: false,
        path: false,
        crypto: false,
        stream: false,
        zlib: false,
        util: false,
        buffer: false,
      };
    }
    return config;
  },
};

export default nextConfig;
