'use client'

import { STATIC_POSITIONS } from '@/data/staticData'

const getWalletAddress = (label: string) => {
  const wallet = STATIC_POSITIONS.find(w => w.label === label)
  return wallet?.address || '0x0000...0000'
}

function ExternalLinkIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

const STATIC_BOTS = [
  {
    id: 'gemini-3-pro',
    name: 'gemini-3-pro',
    walletAddress: getWalletAddress('GEMINI'),
    faderWalletAddress: getWalletAddress('GEMINI'),
    stats: {
      totalPnL: 0,
      dailyPnL: 0,
      totalTrades: 0,
      winRate: 0.0,
    },
    currentOpenPositions: STATIC_POSITIONS[0].positions.length,
    currentUnrealizedPnL: STATIC_POSITIONS[0].totalUnrealizedPnl,
    enabled: true,
  },
  {
    id: 'grok-4',
    name: 'grok-4',
    walletAddress: getWalletAddress('GROK'),
    faderWalletAddress: getWalletAddress('GROK'),
    stats: {
      totalPnL: 0,
      dailyPnL: 0,
      totalTrades: 0,
      winRate: 0.0,
    },
    currentOpenPositions: STATIC_POSITIONS[1].positions.length,
    currentUnrealizedPnL: STATIC_POSITIONS[1].totalUnrealizedPnl,
    enabled: true,
  },
  {
    id: 'qwen3-max',
    name: 'qwen3-max',
    walletAddress: getWalletAddress('QWEN'),
    faderWalletAddress: getWalletAddress('QWEN'),
    stats: {
      totalPnL: 0,
      dailyPnL: 0,
      totalTrades: 0,
      winRate: 0.0,
    },
    currentOpenPositions: STATIC_POSITIONS[2].positions.length,
    currentUnrealizedPnL: STATIC_POSITIONS[2].totalUnrealizedPnl,
    enabled: true,
  },
  {
    id: 'kimi-k2-thinking',
    name: 'kimi-k2-thinking',
    walletAddress: getWalletAddress('KIMI'),
    faderWalletAddress: getWalletAddress('KIMI'),
    stats: {
      totalPnL: 0,
      dailyPnL: 0,
      totalTrades: 0,
      winRate: 0.0,
    },
    currentOpenPositions: STATIC_POSITIONS[3].positions.length,
    currentUnrealizedPnL: STATIC_POSITIONS[3].totalUnrealizedPnl,
    enabled: true,
  },
  {
    id: 'deepseek-chat-v3.1',
    name: 'deepseek-chat-v3.1',
    walletAddress: getWalletAddress('DEEPSEEK'),
    faderWalletAddress: getWalletAddress('DEEPSEEK'),
    stats: {
      totalPnL: 0,
      dailyPnL: 0,
      totalTrades: 0,
      winRate: 0.0,
    },
    currentOpenPositions: STATIC_POSITIONS[4].positions.length,
    currentUnrealizedPnL: STATIC_POSITIONS[4].totalUnrealizedPnl,
    enabled: true,
  },
  {
    id: 'claude-sonnet',
    name: 'claude-sonnet',
    walletAddress: getWalletAddress('CLAUDE'),
    faderWalletAddress: getWalletAddress('CLAUDE'),
    stats: {
      totalPnL: 0,
      dailyPnL: 0,
      totalTrades: 0,
      winRate: 0.0,
    },
    currentOpenPositions: 4,
    currentUnrealizedPnL: -8.69,
    enabled: true,
  },
]

export function BotTable() {
  const data = { bots: STATIC_BOTS }

  if (!data || data.bots.length === 0) {
    return (
      <div className="card-pump">
        <div className="text-pump-textMuted text-sm">No bot data available</div>
      </div>
    )
  }

  const calculateMetric = (bot: typeof data.bots[0]) => {
    return 0.0
  }

  return (
    <div className="card-pump animate-pump-slide-up">
      <h2 className="text-2xl font-black mb-6 text-gradient-pink uppercase tracking-wider">
        AI Models Leaderboard
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-pump-border">
              <th className="text-left py-4 px-4 uppercase text-xs font-black text-pump-textMuted tracking-wider">
                Model
              </th>
              <th className="text-right py-4 px-4 uppercase text-xs font-black text-pump-textMuted tracking-wider">
                Wallet
              </th>
              <th className="text-right py-4 px-4 uppercase text-xs font-black text-pump-textMuted tracking-wider">
                Positions
              </th>
              <th className="text-right py-4 px-4 uppercase text-xs font-black text-pump-textMuted tracking-wider">
                Unrealized PnL
              </th>
              <th className="text-right py-4 px-4 uppercase text-xs font-black text-pump-textMuted tracking-wider">
                Total PnL
              </th>
              <th className="text-right py-4 px-4 uppercase text-xs font-black text-pump-textMuted tracking-wider">
                Daily PnL
              </th>
              <th className="text-right py-4 px-4 uppercase text-xs font-black text-pump-textMuted tracking-wider">
                Win Rate
              </th>
              <th className="text-right py-4 px-4 uppercase text-xs font-black text-pump-textMuted tracking-wider">
                Score
              </th>
              <th className="text-center py-4 px-4 uppercase text-xs font-black text-pump-textMuted tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {data.bots.map((bot, index) => {
              const metric = calculateMetric(bot)
              const totalPnL = bot.stats.totalPnL + (bot.currentUnrealizedPnL ?? 0)
              
              return (
                <tr
                  key={bot.id}
                  className="border-b border-pump-border hover:bg-pump-surface/50 transition-all duration-300 group"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <td className="py-4 px-4 font-black text-pump-text">{bot.name}</td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="font-mono text-xs text-pump-textMuted">
                        {(bot.faderWalletAddress || bot.walletAddress).slice(0, 6)}...{(bot.faderWalletAddress || bot.walletAddress).slice(-4)}
                      </span>
                      <a
                        href={`https://app.hyperliquid.xyz/explorer/address/${bot.faderWalletAddress || bot.walletAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-pump-textMuted hover:text-pump-pink transition-colors group-hover:scale-110"
                        title="View on Hyperliquid"
                      >
                        <ExternalLinkIcon size={14} />
                      </a>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right font-black text-pump-text">
                    {bot.currentOpenPositions ?? 0}
                  </td>
                  <td className={`py-4 px-4 text-right font-black ${
                    (bot.currentUnrealizedPnL ?? 0) >= 0 ? 'text-pump-green' : 'text-pump-red'
                  }`}>
                    ${(bot.currentUnrealizedPnL ?? 0).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className={`py-4 px-4 text-right font-black ${
                    totalPnL >= 0 ? 'text-pump-green' : 'text-pump-red'
                  }`}>
                    ${totalPnL.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className={`py-4 px-4 text-right font-black ${
                    bot.stats.dailyPnL >= 0 ? 'text-pump-green' : 'text-pump-red'
                  }`}>
                    ${bot.stats.dailyPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-4 text-right font-black text-pump-text">
                    {(bot.stats.winRate * 100).toFixed(1)}%
                  </td>
                  <td className="py-4 px-4 text-right font-black text-pump-text">
                    {metric.toFixed(2)}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span
                      className={`pill-pump ${
                        bot.enabled ? 'pill-pump-success' : 'pill-pump-warning'
                      }`}
                    >
                      {bot.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
