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
      <div className="card-pump">
        <h3 className="text-lg font-bold mb-4 text-gradient-pink uppercase tracking-wider">Open Positions</h3>
        <div className="text-pump-textMuted text-sm">No positions found</div>
      </div>
    )
  }

  const totalPositions = positions.wallets.reduce((sum, w) => sum + w.positions.length, 0)

  return (
    <div className="card-pump max-h-[calc(100vh-200px)] overflow-y-auto animate-pump-slide-up">
      <h3 className="text-lg font-bold mb-4 text-gradient-pink uppercase tracking-wider">
        Open Positions
      </h3>
      <div className="text-xs text-pump-textMuted mb-6 font-bold uppercase tracking-wider">
        {totalPositions} positions • {positions.wallets.length} wallets
      </div>

      <div className="space-y-4">
        {positions.wallets.map((wallet, walletIndex) => {
          if (wallet.positions.length === 0) {
            return null
          }

          const color = FADER_COLORS[wallet.label] || '#888888'
          const pnlColor = wallet.totalUnrealizedPnl >= 0 ? 'text-pump-green' : 'text-pump-red'

          return (
            <div
              key={wallet.label}
              className="border-2 border-pump-border rounded-xl p-4 bg-pump-surface hover:border-pump-pink/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,0,255,0.2)]"
              style={{ animationDelay: `${walletIndex * 100}ms` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full animate-pump-pulse"
                    style={{
                      backgroundColor: color,
                      boxShadow: `0 0 10px ${color}80`,
                    }}
                  />
                  <span className="font-black text-sm uppercase tracking-wider" style={{ color }}>
                    {wallet.label}
                  </span>
                </div>
                <span className="text-xs text-pump-textMuted font-bold">
                  {wallet.positions.length} {wallet.positions.length === 1 ? 'pos' : 'poss'}
                </span>
              </div>

              <div className="space-y-2 mb-3">
                {wallet.positions.map((pos, idx) => {
                  const posPnlColor = pos.unrealizedPnl >= 0 ? 'text-pump-green' : 'text-pump-red'
                  const sideColor = pos.side === 'LONG' ? '#00ff88' : '#ff3366'

                  return (
                    <div
                      key={`${pos.asset}-${idx}`}
                      className="bg-pump-bg border border-pump-border rounded-lg p-3 hover:border-pump-blue/50 transition-all duration-300"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm">{pos.asset}</span>
                        <span
                          className="text-xs font-black px-2 py-0.5 rounded uppercase"
                          style={{
                            backgroundColor: `${sideColor}20`,
                            color: sideColor,
                            border: `1px solid ${sideColor}40`,
                          }}
                        >
                          {pos.side}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-pump-textMuted">Size:</span>
                          <span className="font-bold text-pump-text ml-1">{pos.size.toFixed(4)}</span>
                        </div>
                        <div>
                          <span className="text-pump-textMuted">Lev:</span>
                          <span className="font-bold text-pump-text ml-1">{pos.leverage}x</span>
                        </div>
                        <div>
                          <span className="text-pump-textMuted">Entry:</span>
                          <span className="font-bold text-pump-text ml-1">${pos.entryPrice.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-pump-textMuted">Mark:</span>
                          <span className="font-bold text-pump-text ml-1">${pos.markPrice.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-pump-border flex items-center justify-between">
                        <span className="text-xs text-pump-textMuted font-bold">Notional:</span>
                        <span className="font-black text-xs">
                          ${pos.notional.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-xs text-pump-textMuted font-bold">PnL:</span>
                        <span className={`font-black text-xs ${posPnlColor}`}>
                          {pos.unrealizedPnl >= 0 ? '+' : ''}
                          ${pos.unrealizedPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {wallet.positions.length > 0 && (
                <div className="pt-3 border-t-2 border-pump-border flex items-center justify-between">
                  <span className="text-sm text-pump-textMuted font-bold uppercase tracking-wider">Total PnL:</span>
                  <span className={`font-black text-lg ${pnlColor}`}>
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
