/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@fadearena/shared'],
  output: 'standalone', // For Docker
}

module.exports = nextConfig
