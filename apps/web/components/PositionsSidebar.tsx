'use client'

import { useState } from 'react'
import { STATIC_POSITIONS, type WalletPositions } from '@/data/staticData'

const FADER_COLORS: Record<string, string> = {
  GEMINI: '#8b5cf6',
  GROK: '#00ff88',
  QWEN: '#ffd700',
  KIMI: '#ff3366',
  DEEPSEEK: '#00d4ff',
  CLAUDE: '#00ffff',
}

export default function PositionsSidebar() {
  const [positions] = useState<{ timestamp: number; wallets: WalletPositions[] }>({
    timestamp: Date.now(),
    wallets: STATIC_POSITIONS,
  })

  if (!positions || positions.wallets.length === 0) {
    return (
      <div className="card-arena">
        <h3 className="text-lg font-bold mb-4 text-arena-text">Open Positions</h3>
        <div className="text-arena-textMuted text-sm">No positions found</div>
      </div>
    )
  }

  const totalPositions = positions.wallets.reduce((sum, w) => sum + w.positions.length, 0)

  return (
    <div className="card-arena max-h-[600px] overflow-y-auto">
      <h3 className="text-lg font-bold mb-4 text-arena-text">Open Positions</h3>
      <div className="text-xs text-arena-textMuted mb-4">
        {totalPositions} positions • {positions.wallets.length} wallets
      </div>

      <div className="space-y-4">
        {positions.wallets.map((wallet) => {
          if (wallet.positions.length === 0) {
            return null
          }

          const color = FADER_COLORS[wallet.label] || '#888888'
          const pnlColor = wallet.totalUnrealizedPnl >= 0 ? 'pnl-positive' : 'pnl-negative'

          return (
            <div
              key={wallet.label}
              className="border border-arena-border rounded-lg p-4 bg-arena-bg"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-bold text-sm" style={{ color }}>
                    {wallet.label}
                  </span>
                </div>
                <span className="text-xs text-arena-textMuted">
                  {wallet.positions.length} pos
                </span>
              </div>

              <div className="space-y-2 mb-3">
                {wallet.positions.map((pos, idx) => {
                  const posPnlColor = pos.unrealizedPnl >= 0 ? 'pnl-positive' : 'pnl-negative'
                  const sideColor = pos.side === 'LONG' ? '#00ff88' : '#ff3366'

                  return (
                    <div
                      key={`${pos.asset}-${idx}`}
                      className="bg-arena-surface border border-arena-border rounded p-2 text-xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold">{pos.asset}</span>
                        <span
                          className="px-2 py-0.5 rounded text-xs font-bold"
                          style={{
                            backgroundColor: `${sideColor}20`,
                            color: sideColor,
                          }}
                        >
                          {pos.side}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-xs text-arena-textMuted">
                        <div>Size: <span className="text-arena-text font-mono">{pos.size.toFixed(4)}</span></div>
                        <div>Lev: <span className="text-arena-text font-mono">{pos.leverage}x</span></div>
                      </div>
                      <div className="mt-1 pt-1 border-t border-arena-border flex justify-between">
                        <span className="text-arena-textMuted">Notional:</span>
                        <span className="font-mono">
                          ${pos.notional.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-arena-textMuted">PnL:</span>
                        <span className={`font-bold ${posPnlColor}`}>
                          {pos.unrealizedPnl >= 0 ? '+' : ''}
                          ${pos.unrealizedPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {wallet.positions.length > 0 && (
                <div className="pt-2 border-t border-arena-border flex justify-between">
                  <span className="text-sm text-arena-textMuted font-semibold">Total PnL:</span>
                  <span className={`font-bold text-lg ${pnlColor}`}>
                    {wallet.totalUnrealizedPnl >= 0 ? '+' : ''}
                    ${wallet.totalUnrealizedPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
