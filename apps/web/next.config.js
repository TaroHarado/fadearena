/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@fadearena/shared'],
  // Для Vercel не нужен standalone output
  // output: 'standalone', // For Docker
  // Подавляем предупреждения о устаревших модулях
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Игнорируем ошибки от расширений браузера
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      }
    }
    return config
  },
  // Игнорируем ошибки от расширений в консоли
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
}

module.exports = nextConfig
