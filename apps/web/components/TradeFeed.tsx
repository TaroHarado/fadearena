'use client'

import { useState, useEffect } from 'react'
import { STATIC_POSITIONS } from '@/data/staticData'

interface TradeResponse {
  id: string
  type: 'bot' | 'mine'
  botId: string | null
  timestamp: number
  asset: string
  side: 'long' | 'short'
  size: number
  price: number
  notional: number
  pnl: number | null
  simulated: boolean
}

// Преобразуем позиции в сделки для отображения
// Используем entryTimestamp из позиций, если он есть, иначе генерируем фиксированное время
function positionsToTrades(): TradeResponse[] {
  const trades: TradeResponse[] = []
  const now = Date.now()
  const baseTime = new Date()
  baseTime.setHours(10, 0, 0, 0) // 10:00 AM сегодня как базовое время
  let timeOffset = 0
  
  STATIC_POSITIONS.forEach((wallet, walletIndex) => {
    wallet.positions.forEach((pos, posIndex) => {
      // Используем entryTimestamp из позиции, если он есть, иначе генерируем фиксированное время
      // Время должно совпадать с лендосом (время открытия позиции)
      const timestamp = pos.entryTimestamp || (baseTime.getTime() + timeOffset * 60000)
      timeOffset++
      
      trades.push({
        id: `${wallet.label}-${pos.asset}-${walletIndex}-${posIndex}`,
        type: 'mine' as const,
        botId: wallet.label.toLowerCase(),
        timestamp,
        asset: pos.asset.replace('xyz:', ''),
        side: pos.side.toLowerCase() as 'long' | 'short',
        size: pos.size,
        price: pos.entryPrice,
        notional: pos.notional,
        pnl: pos.unrealizedPnl,
        simulated: false,
      })
    })
  })
  
  // Сортируем по времени (новые сверху)
  return trades.sort((a, b) => b.timestamp - a.timestamp)
}

export function TradeFeed() {
  const [trades, setTrades] = useState<TradeResponse[]>([])
  
  // Генерируем данные только на клиенте, чтобы избежать hydration ошибок
  useEffect(() => {
    setTrades(positionsToTrades())
  }, [])

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
              <th className="text-left py-2 px-3 uppercase text-xs font-medium text-terminal-textMuted">
                Side
              </th>
              <th className="text-right py-2 px-3 uppercase text-xs font-medium text-terminal-textMuted">
                Size
              </th>
              <th className="text-right py-2 px-3 uppercase text-xs font-medium text-terminal-textMuted">
                Price
              </th>
              <th className="text-right py-2 px-3 uppercase text-xs font-medium text-terminal-textMuted">
                Notional
              </th>
              <th className="text-right py-2 px-3 uppercase text-xs font-medium text-terminal-textMuted">
                PnL
              </th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => {
              const pnlValue = trade.pnl ?? 0
              const pnlColor = pnlValue >= 0 ? 'pnl-positive' : 'pnl-negative'
              const sideColor = trade.side === 'long' ? '#00ff9f' : '#ff4d6d'
              
              return (
                <tr
                  key={trade.id}
                  className="border-b border-terminal-border hover:bg-terminal-bg transition-colors"
                >
                  <td className="py-2 px-3 text-terminal-textMuted font-mono text-xs">
                    {new Date(trade.timestamp).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>
                  <td className="py-2 px-3 font-medium">{trade.botId}</td>
                  <td className="py-2 px-3 font-mono">{trade.asset}</td>
                  <td className="py-2 px-3">
                    <span
                      className="font-mono font-bold px-1.5 py-0.5 rounded text-xs"
                      style={{
                        backgroundColor: sideColor + '20',
                        color: sideColor,
                      }}
                    >
                      {trade.side.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right number font-mono">
                    {trade.size.toFixed(4)}
                  </td>
                  <td className="py-2 px-3 text-right number font-mono">
                    ${trade.price.toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-right number font-mono">
                    ${trade.notional.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className={`py-2 px-3 text-right number font-mono ${pnlColor}`}>
                    {pnlValue >= 0 ? '+' : ''}
                    ${pnlValue.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
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
