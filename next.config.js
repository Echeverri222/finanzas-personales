/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // /ahorros and /stock-analysis import recharts statically (the dashboard gets it
  // via next/dynamic instead), so "Collecting page data" has to evaluate the whole
  // chart library for those two routes. On a loaded dev machine that exceeds the
  // 60s default and fails the build. Raising the ceiling does not slow a build
  // that was already finishing in time.
  staticPageGenerationTimeout: 180,
  modularizeImports: {
    'recharts': {
      transform: 'recharts/{{member}}',
    },
  },
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Avoid filesystem cache corruption (ENOENT on .pack.gz) that can cause 404s
      config.cache = { type: 'memory' };
      if (!isServer) {
        config.watchOptions = {
          ignored: ['**/node_modules', '**/.git', '**/.next'],
          aggregateTimeout: 300,
        };
      }
    }
    return config;
  },
}

module.exports = nextConfig