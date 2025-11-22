/** @type {import('next').NextConfig} */
const path = require('path')

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
    // Явно настраиваем пути для разрешения модулей
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './'),
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
