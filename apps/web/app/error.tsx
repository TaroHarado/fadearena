'use client'

export default function Error({
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
    return null
  }

  return (
    <div className="min-h-screen bg-terminal-bg flex items-center justify-center p-8">
      <div className="card max-w-md">
        <h2 className="text-lg font-bold mb-2">Something went wrong!</h2>
        <p className="text-terminal-textMuted mb-4">{error.message}</p>
        <button onClick={reset} className="btn btn-primary">
          Try again
        </button>
      </div>
    </div>
  )
}



