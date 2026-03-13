import webpack from 'webpack';

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Ignore node: prefixed imports from pptxgenjs (they're conditionally used in Node only)
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^node:(fs|https|http|path|crypto|stream|zlib|util|buffer)$/,
        })
      );
    }
    return config;
  },
};

export default nextConfig;
