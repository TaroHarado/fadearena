'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="card">
      <h2 className="text-lg font-bold mb-2">Something went wrong!</h2>
      <p className="text-terminal-textMuted mb-4">{error.message}</p>
      <button onClick={reset} className="btn">
        Try again
      </button>
    </div>
  )
}

