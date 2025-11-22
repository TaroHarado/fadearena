import Link from 'next/link'
import Image from 'next/image'
import FaderEquityChart from '@/components/FaderEquityChart'
import AssetPrices from '@/components/AssetPrices'
import PositionsSidebar from '@/components/PositionsSidebar'

export default function Home() {
  return (
    <div className="min-h-screen bg-terminal-bg p-8 relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-terminal-bg via-terminal-bg to-terminal-surface/20 pointer-events-none animate-pulse opacity-50" />
      
      {/* Top right buttons */}
      <div className="fixed top-8 right-8 z-20 flex gap-3">
        <a
          href="https://x.com/fadearena_com"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-terminal-surface border border-terminal-border rounded hover:bg-terminal-bg transition-colors text-sm font-medium text-terminal-text"
        >
          Twitter
        </a>
        <a
          href="https://pump.fun"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-terminal-surface border border-terminal-border rounded hover:bg-terminal-bg transition-colors text-sm font-medium text-terminal-text"
        >
          Pump.fun
        </a>
      </div>
      
      <div className="max-w-[1600px] mx-auto relative z-10">
        <div className="text-center mb-8 animate-fade-in">
          <div className="flex justify-center mb-4">
            <Image
              src="/logo.png"
              alt="FadeArena Logo"
              width={120}
              height={120}
              className="rounded-full"
              priority
            />
          </div>
          <h1 className="text-4xl font-bold mb-4 font-mono tracking-tight 
                         bg-gradient-to-r from-terminal-text to-terminal-textMuted 
                         bg-clip-text text-transparent
                         animate-fade-in">
            FadeArena
          </h1>
          <p className="text-terminal-textMuted mb-8 text-base leading-relaxed animate-fade-in">
            Inverse the AI traders from Alpha Arena on Hyperliquid.
            <br />
            Automatically mirror top-performing AI trading bots with contrarian positions.
          </p>
          <div className="space-y-4 animate-fade-in-delay">
            <p className="text-sm text-terminal-textMuted">
              Track positions from Gemini-3-Pro, Grok-4, Qwen3-Max, Kimi-K2-Thinking,
              Deepseek-Chat-v3.1, and Claude-Sonnet. Open inverse trades with
              configurable leverage and risk controls.
            </p>
            <Link href="/dashboard" className="btn btn-primary inline-block transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-terminal-text/20">
              Open Dashboard
            </Link>
          </div>
        </div>

        {/* Main Content with Sidebar */}
        <div className="flex gap-6 items-start">
          {/* Main Content */}
          <div className="flex-1 space-y-8 animate-slide-in">
            {/* Asset Prices */}
            <AssetPrices />
            
            {/* Fader Equity Chart */}
            <FaderEquityChart />
          </div>

          {/* Sidebar with Positions */}
          <div className="flex-shrink-0 animate-slide-in" style={{ animationDelay: '0.1s', opacity: 0 }}>
            <PositionsSidebar />
          </div>
        </div>
      </div>
    </div>
  )
}

