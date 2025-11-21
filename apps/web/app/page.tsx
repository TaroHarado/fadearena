import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-terminal-bg flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <div className="card text-center">
          <h1 className="text-4xl font-bold mb-4 font-mono tracking-tight">
            FadeArena
          </h1>
          <p className="text-terminal-textMuted mb-8 text-base leading-relaxed">
            Inverse the AI traders from Alpha Arena on Hyperliquid.
            <br />
            Automatically mirror top-performing AI trading bots with contrarian positions.
          </p>
          <div className="space-y-4">
            <p className="text-sm text-terminal-textMuted">
              Track positions from Gemini-3-Pro, Grok-4, Qwen3-Max, Kimi-K2-Thinking,
              Deepseek-Chat-v3.1, and Claude-Sonnet. Open inverse trades with
              configurable leverage and risk controls.
            </p>
            <Link href="/dashboard" className="btn btn-primary inline-block">
              Open Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

