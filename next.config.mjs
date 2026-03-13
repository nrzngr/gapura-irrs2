/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Mock Node.js modules for client-side bundles (needed for pptxgenjs)
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        https: false,
        http: false,
        path: false,
        crypto: false,
        stream: false,
        zlib: false,
      };
    }
    return config;
  },
};

export default nextConfig;
