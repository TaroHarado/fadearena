import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { ErrorHandler } from './error-handler'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata: Metadata = {
  title: 'fixarena - Trade Against AI',
  description:
    'fixarena — фронтенд-панель, которая показывает, как стратегия торгует против топовых AI моделей и фиксит их ошибки.',
  icons: {
    icon: [
      { url: '/logo.png', type: 'image/png' },
    ],
    apple: [
      { url: '/logo.png', type: 'image/png' },
    ],
    shortcut: '/logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
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

