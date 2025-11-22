import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { ErrorHandler } from './error-handler'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'FadeArena - Inverse the AI Traders',
  description: 'Contrarian trading bot on Hyperliquid that automatically opens inverse positions to AI trading wallets',
  icons: {
    icon: '/logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Перехватываем ошибки от расширений браузера до загрузки React
              (function() {
                const originalError = window.onerror;
                window.onerror = function(message, source, lineno, colno, error) {
                  const msg = String(message || '');
                  const src = String(source || '');
                  if (
                    msg.includes('Cannot redefine property: ethereum') ||
                    msg.includes('Cannot redefine property') ||
                    src.includes('chrome-extension://') ||
                    src.includes('moz-extension://') ||
                    src.includes('evmAsk.js')
                  ) {
                    console.warn('Ignored browser extension error:', msg);
                    return true;
                  }
                  if (originalError) {
                    return originalError.call(window, message, source, lineno, colno, error);
                  }
                  return false;
                };
              })();
            `,
          }}
        />
      </head>
      <body>
        <ErrorHandler />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

