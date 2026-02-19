/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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