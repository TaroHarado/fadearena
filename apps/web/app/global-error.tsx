'use client'

/**
 * Global error boundary для Next.js
 * Игнорирует ошибки от расширений браузера
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Игнорируем ошибки от расширений браузера
  if (
    error.message?.includes('Cannot redefine property: ethereum') ||
    error.message?.includes('chrome-extension://') ||
    error.message?.includes('moz-extension://')
  ) {
    console.warn('Ignored browser extension error:', error.message)
    // Просто возвращаем null, чтобы не показывать ошибку
    return null
  }

  // Для остальных ошибок показываем стандартную страницу ошибки
  return (
    <html>
      <body>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>Something went wrong!</h2>
          <button onClick={() => reset()}>Try again</button>
        </div>
      </body>
    </html>
  )
}

