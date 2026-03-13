import NodePolyfillPlugin from 'node-polyfill-webpack-plugin';

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Polyfill Node.js modules for client-side bundles (needed for pptxgenjs)
      config.plugins.push(new NodePolyfillPlugin());
    }
    return config;
  },
};

export default nextConfig;
