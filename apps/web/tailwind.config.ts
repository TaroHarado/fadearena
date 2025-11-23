import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Pump.fun inspired vibrant theme
        pump: {
          bg: '#000000',
          surface: '#0a0a0a',
          surfaceHover: '#151515',
          border: '#1a1a1a',
          text: '#ffffff',
          textMuted: '#888888',
          textDim: '#555555',
          // Vibrant neon colors
          pink: '#ff00ff',
          purple: '#8b5cf6',
          blue: '#00d4ff',
          cyan: '#00ffff',
          green: '#00ff88',
          yellow: '#ffd700',
          orange: '#ff6b35',
          red: '#ff3366',
          // Gradients
          gradient1: 'linear-gradient(135deg, #ff00ff 0%, #8b5cf6 50%, #00d4ff 100%)',
          gradient2: 'linear-gradient(135deg, #00ff88 0%, #00d4ff 50%, #8b5cf6 100%)',
          gradient3: 'linear-gradient(135deg, #ff6b35 0%, #ff00ff 50%, #00d4ff 100%)',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        'xs': ['11px', { lineHeight: '1.4' }],
        'sm': ['12px', { lineHeight: '1.5' }],
        'base': ['13px', { lineHeight: '1.6' }],
      },
    },
  },
  plugins: [],
}
export default config

