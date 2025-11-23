'use client';

import { useState, useEffect } from 'react';
import { STATIC_POSITIONS, type WalletPositions } from '@/data/staticData';

const FADER_COLORS: Record<string, string> = {
  GEMINI: '#8b5cf6', // purple
  GROK: '#00ff9f',   // green
  QWEN: '#ffb84d',   // amber
  KIMI: '#ff4d6d',   // red
  DEEPSEEK: '#3b82f6', // blue
  CLAUDE: '#06b6d4',  // cyan
};

export default function PositionsSidebar() {
  const [positions] = useState<{ timestamp: number; wallets: WalletPositions[] }>({
    timestamp: Date.now(),
    wallets: STATIC_POSITIONS,
  });

  if (!positions || positions.wallets.length === 0) {
    return (
      <div className="card p-4 w-80">
        <h3 className="text-lg font-bold mb-4 font-mono">Active Positions</h3>
        <div className="text-terminal-textMuted text-sm">No positions found</div>
      </div>
    );
  }

  const totalPositions = positions.wallets.reduce((sum, w) => sum + w.positions.length, 0);

  return (
    <div className="card p-4 w-80 max-h-[calc(100vh-200px)] overflow-y-auto">
      <h3 className="text-lg font-bold mb-4 font-mono">Active Positions</h3>
      <div className="text-xs text-terminal-textMuted mb-4">
        {totalPositions} {totalPositions === 1 ? 'position' : 'positions'} across {positions.wallets.length} {positions.wallets.length === 1 ? 'wallet' : 'wallets'}
      </div>

      <div className="space-y-6">
        {positions.wallets.map((wallet) => {
          if (wallet.positions.length === 0) {
            return null;
          }

          const color = FADER_COLORS[wallet.label] || '#666';
          const pnlColor = wallet.totalUnrealizedPnl >= 0 ? '#00ff9f' : '#ff4d6d';

          return (
            <div key={wallet.label} className="border-b border-terminal-border pb-4 last:border-0 
                                               transition-all duration-300 hover:bg-terminal-bg/30 rounded p-2 -m-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-bold text-sm font-mono">{wallet.label}</span>
                </div>
                <div className="text-xs text-terminal-textMuted">
                  {wallet.positions.length} pos{wallet.positions.length !== 1 ? 's' : ''}
                </div>
              </div>

              <div className="space-y-2">
                {wallet.positions.map((pos, idx) => {
                  const posPnlColor = pos.unrealizedPnl >= 0 ? '#00ff9f' : '#ff4d6d';
                  const sideColor = pos.side === 'LONG' ? '#00ff9f' : '#ff4d6d';

                  return (
                    <div
                      key={`${pos.asset}-${idx}`}
                      className="bg-terminal-bgSecondary p-2 rounded text-xs
                                 transition-all duration-300 hover:bg-terminal-bg/50
                                 hover:scale-[1.02] hover:shadow-md"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-semibold">{pos.asset.replace('xyz:', '')}</span>
                        <span
                          className="font-mono font-bold px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: sideColor + '20',
                            color: sideColor,
                          }}
                        >
                          {pos.side}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1 text-xs text-terminal-textMuted">
                        <div>
                          <span className="text-terminal-textMuted">Size:</span>{' '}
                          <span className="font-mono">{pos.size.toFixed(4)}</span>
                        </div>
                        <div>
                          <span className="text-terminal-textMuted">Entry:</span>{' '}
                          <span className="font-mono">${pos.entryPrice.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-terminal-textMuted">Mark:</span>{' '}
                          <span className="font-mono">${pos.markPrice.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-terminal-textMuted">Lev:</span>{' '}
                          <span className="font-mono">{pos.leverage}x</span>
                        </div>
                      </div>

                      <div className="mt-1.5 pt-1.5 border-t border-terminal-border flex items-center justify-between">
                        <span className="text-terminal-textMuted text-xs">Notional:</span>
                        <span className="font-mono font-semibold text-xs">
                          ${pos.notional.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-terminal-textMuted text-xs">PnL:</span>
                        <span
                          className="font-mono font-bold text-xs"
                          style={{ color: posPnlColor }}
                        >
                          {pos.unrealizedPnl >= 0 ? '+' : ''}
                          ${pos.unrealizedPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {wallet.positions.length > 0 && (
                <div className="mt-3 pt-2 border-t border-terminal-border flex items-center justify-between text-xs">
                  <span className="text-terminal-textMuted">Total PnL:</span>
                  <span
                    className="font-mono font-bold"
                    style={{ color: pnlColor }}
                  >
                    {wallet.totalUnrealizedPnl >= 0 ? '+' : ''}
                    ${wallet.totalUnrealizedPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

