'use client'

import { useTrades } from '@/hooks/useTrades'
import { useLiveEvents } from '@/hooks/useLiveEvents'
import { useEffect, useState } from 'react'
import type { TradeResponse } from '@fadearena/shared'

export function TradeFeed() {
  const { data: initialTrades } = useTrades({ limit: 50 })
  const [trades, setTrades] = useState<TradeResponse[]>([])
  const { events } = useLiveEvents()

  // Merge initial trades with live events
  useEffect(() => {
    if (initialTrades?.trades) {
      setTrades(initialTrades.trades)
    }
  }, [initialTrades])

  useEffect(() => {
    if (events.myTrade) {
      // Add new trade to the top
      setTrades((prev) => [events.myTrade as TradeResponse, ...prev].slice(0, 100))
    }
  }, [events.myTrade])

  if (trades.length === 0) {
    return (
      <div className="card">
        <div className="text-terminal-textMuted text-sm">No trades available</div>
      </div>
    )
  }

  return (
    <div className="card">
      <h2 className="label mb-4">Trade Feed</h2>
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-terminal-surface">
            <tr className="border-b border-terminal-border">
              <th className="text-left py-2 px-3 uppercase text-xs font-medium text-terminal-textMuted">
                Time
              </th>
              <th className="text-left py-2 px-3 uppercase text-xs font-medium text-terminal-textMuted">
                Bot
              </th>
              <th className="text-left py-2 px-3 uppercase text-xs font-medium text-terminal-textMuted">
                Symbol
              </th>
              <th className="text-right py-2 px-3 uppercase text-xs font-medium text-terminal-textMuted">
                Bot Side
              </th>
              <th className="text-right py-2 px-3 uppercase text-xs font-medium text-terminal-textMuted">
                FadeArena Side
              </th>
              <th className="text-right py-2 px-3 uppercase text-xs font-medium text-terminal-textMuted">
                Size
              </th>
              <th className="text-right py-2 px-3 uppercase text-xs font-medium text-terminal-textMuted">
                Price
              </th>
              <th className="text-right py-2 px-3 uppercase text-xs font-medium text-terminal-textMuted">
                PnL
              </th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => (
              <tr
                key={trade.id}
                className="border-b border-terminal-border hover:bg-terminal-bg transition-colors"
              >
                <td className="py-2 px-3 font-mono text-xs text-terminal-textMuted">
                  {new Date(trade.timestamp).toLocaleTimeString()}
                </td>
                <td className="py-2 px-3">
                  <span className="text-xs">
                    {trade.type === 'bot' ? trade.botId || 'N/A' : 'FadeArena'}
                  </span>
                  {trade.simulated && (
                    <span className="ml-2 text-xs text-terminal-textMuted">(SIM)</span>
                  )}
                </td>
                <td className="py-2 px-3 font-mono">{trade.asset}</td>
                <td className="py-2 px-3 text-right">
                  {trade.type === 'bot' ? (
                    <span className="uppercase text-xs">{trade.side}</span>
                  ) : (
                    <span className="text-terminal-textMuted">-</span>
                  )}
                </td>
                <td className="py-2 px-3 text-right">
                  {trade.type === 'mine' ? (
                    <span className="uppercase text-xs">{trade.side}</span>
                  ) : (
                    <span className="text-terminal-textMuted">-</span>
                  )}
                </td>
                <td className="py-2 px-3 text-right number">
                  {trade.size.toFixed(4)}
                </td>
                <td className="py-2 px-3 text-right number">
                  ${trade.price.toFixed(2)}
                </td>
                <td
                  className={`py-2 px-3 text-right number ${
                    trade.pnl !== null
                      ? trade.pnl >= 0
                        ? 'pnl-positive'
                        : 'pnl-negative'
                      : ''
                  }`}
                >
                  {trade.pnl !== null ? `$${trade.pnl.toFixed(2)}` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

