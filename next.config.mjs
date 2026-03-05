/** @type {import('next').NextConfig} */
const nextConfig = {
  // Hardcode absolute root to block parent directory leaks
  outputFileTracingRoot: '/Users/nrzngr/Desktop/gapura-irrs2',
  poweredByHeader: false,
};

export default nextConfig;
