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
        // Retro terminal colors inspired by nof1.ai
        terminal: {
          bg: '#fafafa',
          surface: '#ffffff',
          border: '#e5e5e5',
          text: '#1a1a1a',
          textMuted: '#666666',
          green: '#00a86b',
          red: '#dc3545',
          amber: '#ffb800',
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
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

