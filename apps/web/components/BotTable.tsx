'use client'

import { useModels } from '@/hooks/useModels'

// Simple external link icon component
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

export function BotTable() {
  const { data } = useModels()

  if (!data || data.bots.length === 0) {
    return (
      <div className="card">
        <div className="text-terminal-textMuted text-sm">No bot data available</div>
      </div>
    )
  }

  // Calculate Sharpe-like metric (simplified: win rate * avg PnL)
  const calculateMetric = (bot: typeof data.bots[0]) => {
    if (bot.stats.totalTrades === 0) return 0
    const avgPnL = bot.stats.totalPnL / bot.stats.totalTrades
    return bot.stats.winRate * avgPnL
  }

  return (
    <div className="card">
      <h2 className="label mb-4">Models / Leaderboard</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-terminal-border">
              <th className="text-left py-2 px-3 uppercase text-xs font-medium text-terminal-textMuted">
                Bot
              </th>
              <th className="text-right py-2 px-3 uppercase text-xs font-medium text-terminal-textMuted">
                Wallet
              </th>
              <th className="text-right py-2 px-3 uppercase text-xs font-medium text-terminal-textMuted">
                Total PnL
              </th>
              <th className="text-right py-2 px-3 uppercase text-xs font-medium text-terminal-textMuted">
                Daily PnL
              </th>
              <th className="text-right py-2 px-3 uppercase text-xs font-medium text-terminal-textMuted">
                Trades
              </th>
              <th className="text-right py-2 px-3 uppercase text-xs font-medium text-terminal-textMuted">
                Win Rate
              </th>
              <th className="text-right py-2 px-3 uppercase text-xs font-medium text-terminal-textMuted">
                Metric
              </th>
              <th className="text-center py-2 px-3 uppercase text-xs font-medium text-terminal-textMuted">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {data.bots.map((bot) => {
              const metric = calculateMetric(bot)
              return (
                <tr
                  key={bot.id}
                  className="border-b border-terminal-border hover:bg-terminal-bg transition-colors"
                >
                  <td className="py-3 px-3 font-medium">{bot.name}</td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="font-mono text-xs text-terminal-textMuted">
                        {bot.walletAddress.slice(0, 6)}...{bot.walletAddress.slice(-4)}
                      </span>
                      <a
                        href={`https://app.hyperliquid.xyz/address/${bot.walletAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-terminal-textMuted hover:text-terminal-text transition-colors"
                        title="View on Hyperliquid"
                      >
                        <ExternalLinkIcon size={14} />
                      </a>
                    </div>
                  </td>
                  <td
                    className={`py-3 px-3 text-right number ${
                      bot.stats.totalPnL >= 0 ? 'pnl-positive' : 'pnl-negative'
                    }`}
                  >
                    ${bot.stats.totalPnL.toLocaleString(2)}
                  </td>
                  <td
                    className={`py-3 px-3 text-right number ${
                      bot.stats.dailyPnL >= 0 ? 'pnl-positive' : 'pnl-negative'
                    }`}
                  >
                    ${bot.stats.dailyPnL.toLocaleString(2)}
                  </td>
                  <td className="py-3 px-3 text-right number">
                    {bot.stats.totalTrades}
                  </td>
                  <td className="py-3 px-3 text-right number">
                    {(bot.stats.winRate * 100).toFixed(1)}%
                  </td>
                  <td className="py-3 px-3 text-right number">
                    {metric.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`pill ${
                        bot.enabled ? 'pill-success' : 'pill-warning'
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

