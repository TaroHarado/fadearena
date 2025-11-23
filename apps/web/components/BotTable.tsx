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
      <div className="card-arena">
        <div style={{ color: '#888888', fontSize: '0.875rem' }}>No bot data available</div>
      </div>
    )
  }

  const calculateMetric = (bot: typeof data.bots[0]) => {
    return 0.0
  }

  return (
    <div className="card-arena">
      <h2 className="text-xl font-bold mb-4" style={{ color: '#ffffff' }}>Bot Wallet Positions</h2>
      <div className="overflow-x-auto">
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
              <th className="text-left py-3 px-4 text-xs font-semibold uppercase" style={{ color: '#888888' }}>
                Bot
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold uppercase" style={{ color: '#888888' }}>
                Wallet
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold uppercase" style={{ color: '#888888' }}>
                Positions
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold uppercase" style={{ color: '#888888' }}>
                Unrealized PnL
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold uppercase" style={{ color: '#888888' }}>
                Total PnL
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold uppercase" style={{ color: '#888888' }}>
                Daily PnL
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold uppercase" style={{ color: '#888888' }}>
                Win Rate
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold uppercase" style={{ color: '#888888' }}>
                Metric
              </th>
              <th className="text-center py-3 px-4 text-xs font-semibold uppercase" style={{ color: '#888888' }}>
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {data.bots.map((bot) => {
              const metric = calculateMetric(bot)
              const totalPnL = bot.stats.totalPnL + (bot.currentUnrealizedPnL ?? 0)
              const walletAddress = bot.faderWalletAddress || bot.walletAddress
              
              return (
                <tr
                  key={bot.id}
                  style={{ borderBottom: '1px solid #2a2a2a' }}
                  className="hover:bg-arena-surface/50 transition-colors"
                >
                  <td className="py-3 px-4 font-semibold" style={{ color: '#ffffff' }}>{bot.name}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={`https://app.hyperliquid.xyz/explorer/address/${walletAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs hover:text-arena-blue transition-colors"
                        style={{ color: '#888888' }}
                        title="View on Hyperliquid"
                      >
                        {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                      </a>
                      <a
                        href={`https://app.hyperliquid.xyz/explorer/address/${walletAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-arena-blue transition-colors"
                        style={{ color: '#888888' }}
                        title="View on Hyperliquid"
                      >
                        <ExternalLinkIcon size={14} />
                      </a>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-semibold" style={{ color: '#ffffff' }}>
                    {bot.currentOpenPositions ?? 0}
                  </td>
                  <td className={`py-3 px-4 text-right font-semibold ${
                    (bot.currentUnrealizedPnL ?? 0) >= 0 ? 'pnl-positive' : 'pnl-negative'
                  }`}>
                    ${(bot.currentUnrealizedPnL ?? 0).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className={`py-3 px-4 text-right font-semibold ${
                    totalPnL >= 0 ? 'pnl-positive' : 'pnl-negative'
                  }`}>
                    ${totalPnL.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className={`py-3 px-4 text-right font-semibold ${
                    bot.stats.dailyPnL >= 0 ? 'pnl-positive' : 'pnl-negative'
                  }`}>
                    ${bot.stats.dailyPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold" style={{ color: '#ffffff' }}>
                    {(bot.stats.winRate * 100).toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 text-right font-semibold" style={{ color: '#ffffff' }}>
                    {metric.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`pill-arena ${
                        bot.enabled ? 'pill-arena-success' : 'pill-arena-danger'
                      }`}
                    >
                      {bot.enabled ? 'Enabled' : 'Disabled'}
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
