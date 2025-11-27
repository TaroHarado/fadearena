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

const START_BALANCE = 500

const CURRENT_BALANCES: Record<string, number> = {
  'gemini-3-pro': 599,
  'grok-4': 450,
  'qwen3-max': 597,
  'kimi-k2-thinking': 705,
  'deepseek-chat-v3.1': 691,
  'claude-sonnet': 565,
}

const STATIC_BOTS = [
  {
    id: 'gemini-3-pro',
    name: 'gemini-3-pro',
    walletAddress: getWalletAddress('GEMINI'),
    faderWalletAddress: getWalletAddress('GEMINI'),
    stats: {
      totalPnL: CURRENT_BALANCES['gemini-3-pro'] - START_BALANCE,
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
      totalPnL: CURRENT_BALANCES['grok-4'] - START_BALANCE,
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
      totalPnL: CURRENT_BALANCES['qwen3-max'] - START_BALANCE,
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
      totalPnL: CURRENT_BALANCES['kimi-k2-thinking'] - START_BALANCE,
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
      totalPnL: CURRENT_BALANCES['deepseek-chat-v3.1'] - START_BALANCE,
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
      totalPnL: CURRENT_BALANCES['claude-sonnet'] - START_BALANCE,
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
      <h2 className="text-xl font-bold mb-4">Bot Wallet Positions</h2>
      <div className="overflow-x-auto">
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #111111' }}>
              <th className="text-left py-3 px-4 text-xs font-semibold uppercase text-neutral-600">
                Bot
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold uppercase text-neutral-600">
                Wallet
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold uppercase text-neutral-600">
                Positions
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold uppercase text-neutral-600">
                Unrealized PnL
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold uppercase text-neutral-600">
                Total PnL
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold uppercase text-neutral-600">
                Daily PnL
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold uppercase text-neutral-600">
                Win Rate
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold uppercase text-neutral-600">
                Metric
              </th>
              <th className="text-center py-3 px-4 text-xs font-semibold uppercase text-neutral-600">
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
                  style={{ borderBottom: '1px solid #111111' }}
                  className="hover:bg-[#f5f4ef] transition-colors"
                >
                  <td className="py-3 px-4 font-semibold">{bot.name}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={`https://app.hyperliquid.xyz/explorer/address/${walletAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-neutral-600 hover:underline"
                        title="View on Hyperliquid"
                      >
                        {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                      </a>
                      <a
                        href={`https://app.hyperliquid.xyz/explorer/address/${walletAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-neutral-600 hover:text-black transition-colors"
                        title="View on Hyperliquid"
                      >
                        <ExternalLinkIcon size={14} />
                      </a>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-semibold">
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
                  <td className="py-3 px-4 text-right font-semibold">
                    {(bot.stats.winRate * 100).toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 text-right font-semibold">
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
