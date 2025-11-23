import Link from 'next/link'
import Image from 'next/image'
import FaderEquityChart from '@/components/FaderEquityChart'
import AssetPrices from '@/components/AssetPrices'
import PositionsSidebar from '@/components/PositionsSidebar'
import { AnimatedBackground } from '@/components/AnimatedBackground'

export default function Home() {
  return (
    <div className="min-h-screen bg-terminal-bg p-8 relative overflow-hidden">
      <AnimatedBackground />
      
      {/* Top right buttons */}
      <div className="fixed top-8 right-8 z-20 flex gap-3">
        <a
          href="https://x.com/shortarena_fun"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-terminal-surface border border-terminal-border rounded-lg hover:border-terminal-purple/50 hover:bg-terminal-surface/80 transition-all text-sm font-medium text-terminal-text hover:shadow-lg hover:shadow-terminal-purple/20"
        >
          Twitter
        </a>
        <a
          href="https://pump.fun"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-terminal-surface border border-terminal-border rounded-lg hover:border-terminal-blue/50 hover:bg-terminal-surface/80 transition-all text-sm font-medium text-terminal-text hover:shadow-lg hover:shadow-terminal-blue/20"
        >
          Pump.fun
        </a>
      </div>
      
      <div className="max-w-[1600px] mx-auto relative z-10">
        <div className="text-center mb-8 animate-fade-in">
          <div className="flex justify-center mb-4 animate-float">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-terminal-purple via-terminal-blue to-terminal-cyan rounded-full blur-xl opacity-50 animate-pulse-glow" />
              <Image
                src="/logo.png"
                alt="ShortArena Logo"
                width={120}
                height={120}
                className="rounded-full relative z-10 animate-glow"
                priority
              />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4 font-mono tracking-tight 
                         bg-gradient-to-r from-terminal-purple via-terminal-blue to-terminal-cyan 
                         bg-clip-text text-transparent animate-gradient
                         animate-fade-in">
            ShortArena.fun
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
            <Link href="/dashboard" className="btn btn-primary inline-block transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-terminal-purple/40 animate-shimmer">
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

