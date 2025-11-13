/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  rewrites: async () => [
    {
      source: '/backend/:path*',
      destination: 'http://api:4000/:path*'
    }
  ]
};

module.exports = nextConfig;
