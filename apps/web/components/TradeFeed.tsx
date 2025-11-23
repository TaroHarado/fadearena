'use client'

import { useState, useEffect } from 'react'

interface Trade {
  id: string
  model: string
  side: 'LONG' | 'SHORT'
  asset: string
  qty: number
  pnl: number
  timestamp: number
}

const TRADES_DATA: Omit<Trade, 'id' | 'timestamp'>[] = [
  { model: 'gpt-5.1', side: 'SHORT', asset: 'AMZN', qty: 0.6940, pnl: -0.18 },
  { model: 'qwen3-max', side: 'LONG', asset: 'NVDA', qty: 0.8505, pnl: -0.12 },
  { model: 'qwen3-max', side: 'LONG', asset: 'NDX', qty: 0.0440, pnl: -1.75 },
  { model: 'gemini-3-pro', side: 'LONG', asset: 'GOOGL', qty: 0.4925, pnl: -0.18 },
  { model: 'gpt-5.1', side: 'SHORT', asset: 'AMZN', qty: 0.0730, pnl: 0.01 },
  { model: 'qwen3-max', side: 'SHORT', asset: 'NDX', qty: 0.0085, pnl: -0.29 },
  { model: 'gpt-5.1', side: 'SHORT', asset: 'NDX', qty: 0.0205, pnl: -0.80 },
  { model: 'qwen3-max', side: 'SHORT', asset: 'NDX', qty: 0.0060, pnl: -0.16 },
  { model: 'qwen3-max', side: 'SHORT', asset: 'NDX', qty: 0.0740, pnl: -2.94 },
  { model: 'qwen3-max', side: 'LONG', asset: 'AMZN', qty: 0.1830, pnl: -0.06 },
  { model: 'mystery-model', side: 'SHORT', asset: 'PLTR', qty: 0.0060, pnl: -0.00 },
  { model: 'deepseek-chat-v3.1', side: 'LONG', asset: 'PLTR', qty: 0.0055, pnl: -0.00 },
  { model: 'kimi-k2-thinking', side: 'SHORT', asset: 'PLTR', qty: 0.6835, pnl: -0.16 },
  { model: 'deepseek-chat-v3.1', side: 'SHORT', asset: 'PLTR', qty: 1.2740, pnl: -0.26 },
  { model: 'kimi-k2-thinking', side: 'LONG', asset: 'GOOGL', qty: 0.3510, pnl: -0.19 },
  { model: 'kimi-k2-thinking', side: 'LONG', asset: 'GOOGL', qty: 0.3285, pnl: -0.18 },
  { model: 'qwen3-max', side: 'SHORT', asset: 'GOOGL', qty: 0.0140, pnl: -0.01 },
  { model: 'deepseek-chat-v3.1', side: 'LONG', asset: 'GOOGL', qty: 0.3425, pnl: -0.29 },
  { model: 'deepseek-chat-v3.1', side: 'LONG', asset: 'GOOGL', qty: 0.0655, pnl: -0.07 },
  { model: 'deepseek-chat-v3.1', side: 'LONG', asset: 'GOOGL', qty: 2.0740, pnl: -2.11 },
  { model: 'deepseek-chat-v3.1', side: 'LONG', asset: 'GOOGL', qty: 2.0740, pnl: -1.86 },
  { model: 'deepseek-chat-v3.1', side: 'SHORT', asset: 'PLTR', qty: 0.0055, pnl: -0.00 },
  { model: 'kimi-k2-thinking', side: 'SHORT', asset: 'PLTR', qty: 0.0060, pnl: -0.00 },
  { model: 'deepseek-chat-v3.1', side: 'SHORT', asset: 'PLTR', qty: 0.0770, pnl: -0.04 },
  { model: 'deepseek-chat-v3.1', side: 'SHORT', asset: 'PLTR', qty: 0.0060, pnl: -0.00 },
  { model: 'claude-sonnet-4-5', side: 'LONG', asset: 'GOOGL', qty: 1.9630, pnl: -4.64 },
  { model: 'deepseek-chat-v3.1', side: 'SHORT', asset: 'PLTR', qty: 0.0060, pnl: -0.00 },
  { model: 'deepseek-chat-v3.1', side: 'LONG', asset: 'PLTR', qty: 0.1115, pnl: -0.02 },
  { model: 'qwen3-max', side: 'SHORT', asset: 'NDX', qty: 0.0295, pnl: -1.18 },
  { model: 'deepseek-chat-v3.1', side: 'SHORT', asset: 'PLTR', qty: 0.0060, pnl: -0.00 },
  { model: 'qwen3-max', side: 'LONG', asset: 'NDX', qty: 0.0050, pnl: -0.09 },
  { model: 'qwen3-max', side: 'LONG', asset: 'NDX', qty: 0.0315, pnl: -0.46 },
  { model: 'gpt-5.1', side: 'SHORT', asset: 'NDX', qty: 0.0235, pnl: -0.94 },
  { model: 'qwen3-max', side: 'LONG', asset: 'NDX', qty: 0.0315, pnl: -0.64 },
  { model: 'qwen3-max', side: 'LONG', asset: 'NDX', qty: 0.0315, pnl: -0.22 },
  { model: 'qwen3-max', side: 'LONG', asset: 'NDX', qty: 0.0155, pnl: -0.32 },
  { model: 'deepseek-chat-v3.1', side: 'SHORT', asset: 'PLTR', qty: 0.0060, pnl: -0.00 },
  { model: 'kimi-k2-thinking', side: 'SHORT', asset: 'PLTR', qty: 0.0060, pnl: -0.00 },
  { model: 'gemini-3-pro', side: 'LONG', asset: 'AMZN', qty: 0.3390, pnl: -0.21 },
  { model: 'kimi-k2-thinking', side: 'SHORT', asset: 'PLTR', qty: 0.0060, pnl: -0.00 },
  { model: 'kimi-k2-thinking', side: 'SHORT', asset: 'PLTR', qty: 0.0060, pnl: -0.00 },
  { model: 'deepseek-chat-v3.1', side: 'SHORT', asset: 'PLTR', qty: 0.6810, pnl: -0.15 },
  { model: 'deepseek-chat-v3.1', side: 'SHORT', asset: 'PLTR', qty: 0.0055, pnl: -0.00 },
  { model: 'kimi-k2-thinking', side: 'SHORT', asset: 'PLTR', qty: 0.0055, pnl: -0.00 },
  { model: 'deepseek-chat-v3.1', side: 'SHORT', asset: 'PLTR', qty: 0.0060, pnl: -0.00 },
  { model: 'deepseek-chat-v3.1', side: 'SHORT', asset: 'PLTR', qty: 0.7400, pnl: 0.16 },
  { model: 'kimi-k2-thinking', side: 'LONG', asset: 'PLTR', qty: 0.8475, pnl: 0.55 },
  { model: 'kimi-k2-thinking', side: 'LONG', asset: 'PLTR', qty: 0.3245, pnl: 0.21 },
  { model: 'gemini-3-pro', side: 'SHORT', asset: 'NDX', qty: 0.0060, pnl: -0.24 },
]

const MODEL_ICONS: Record<string, string> = {
  'gpt-5.1': '🧠',
  'qwen3-max': '🚀',
  'gemini-3-pro': '💎',
  'deepseek-chat-v3.1': '🔷',
  'kimi-k2-thinking': '💫',
  'claude-sonnet-4-5': '🌟',
  'mystery-model': '❓',
}

const ASSET_ICONS: Record<string, string> = {
  'AMZN': '📦',
  'NVDA': '🎮',
  'NDX': '📈',
  'GOOGL': '🔍',
  'PLTR': '🛡️',
  'TSLA': '⚡',
  'MSFT': '💻',
}

const MODEL_COLORS: Record<string, string> = {
  'gpt-5.1': '#ff00ff',
  'qwen3-max': '#8b5cf6',
  'gemini-3-pro': '#00d4ff',
  'deepseek-chat-v3.1': '#00ffff',
  'kimi-k2-thinking': '#ffd700',
  'claude-sonnet-4-5': '#ff3366',
  'mystery-model': '#888888',
}

export function TradeFeed() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [filter, setFilter] = useState<string>('ALL MODELS')
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const now = Date.now()
    const generatedTrades: Trade[] = TRADES_DATA.map((trade, index) => ({
      ...trade,
      id: `trade-${index}`,
      timestamp: now - (index * 60000),
    }))
    setTrades(generatedTrades)
  }, [])

  if (!isMounted) {
    return (
      <div className="card-pump">
        <div className="text-pump-textMuted text-sm animate-pump-pulse">Loading trades...</div>
      </div>
    )
  }

  const filteredTrades = filter === 'ALL MODELS' 
    ? trades 
    : trades.filter(t => t.model.toLowerCase() === filter.toLowerCase())

  const uniqueModels = Array.from(new Set(trades.map(t => t.model)))

  return (
    <div className="card-pump animate-pump-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-pump-border">
        <h2 className="text-2xl font-black text-gradient-pink uppercase tracking-wider">
          Recent Trades
        </h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="input-pump w-auto text-sm cursor-pointer hover:border-pump-pink transition-colors"
        >
          <option value="ALL MODELS">ALL MODELS</option>
          {uniqueModels.map(model => (
            <option key={model} value={model}>{model}</option>
          ))}
        </select>
      </div>

      {/* Trades List */}
      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {filteredTrades.map((trade, index) => {
          const modelColor = MODEL_COLORS[trade.model] || '#888888'
          const isPositive = trade.pnl > 0
          const pnlColor = isPositive ? 'text-pump-green' : 'text-pump-red'
          const sideColor = trade.side === 'LONG' ? '#00ff88' : '#ff3366'
          
          return (
            <div
              key={trade.id}
              className="group border-2 border-pump-border rounded-xl p-4 bg-pump-surface hover:border-pump-pink/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,0,255,0.3)] hover:scale-[1.01]"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              {/* Header Row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span 
                    className="text-2xl transition-transform duration-300 group-hover:scale-125" 
                    style={{ filter: `drop-shadow(0 0 10px ${modelColor}80)` }}
                  >
                    {MODEL_ICONS[trade.model] || '🤖'}
                  </span>
                  <span className="font-black text-base uppercase tracking-wider" style={{ color: modelColor }}>
                    {trade.model}
                  </span>
                  <span className="text-pump-textMuted font-bold">→</span>
                  <span
                    className="font-black text-xs px-3 py-1 rounded-lg uppercase border-2 transition-all duration-300 group-hover:scale-110"
                    style={{
                      backgroundColor: `${sideColor}20`,
                      color: sideColor,
                      borderColor: `${sideColor}60`,
                      boxShadow: `0 0 15px ${sideColor}40`,
                    }}
                  >
                    {trade.side}
                  </span>
                  <span className="font-black text-base flex items-center gap-1">
                    {ASSET_ICONS[trade.asset] || '📊'} {trade.asset}!
                  </span>
                </div>
                <div className="text-xs text-pump-textMuted font-black uppercase tracking-wider">
                  {new Date(trade.timestamp).toLocaleDateString('en-US', {
                    month: '2-digit',
                    day: '2-digit',
                  })}, {new Date(trade.timestamp).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </div>
              </div>

              {/* Details Row */}
              <div className="grid grid-cols-5 gap-4 text-xs font-black">
                <div>
                  <div className="text-pump-textMuted mb-1 text-[10px] uppercase tracking-wider">Price</div>
                  <div className="text-pump-text">-</div>
                </div>
                <div>
                  <div className="text-pump-textMuted mb-1 text-[10px] uppercase tracking-wider">Quantity</div>
                  <div className="text-pump-text">{trade.qty.toFixed(4)}</div>
                </div>
                <div>
                  <div className="text-pump-textMuted mb-1 text-[10px] uppercase tracking-wider">Notional</div>
                  <div className="text-pump-text">-</div>
                </div>
                <div>
                  <div className="text-pump-textMuted mb-1 text-[10px] uppercase tracking-wider">Holding time</div>
                  <div className="text-pump-text">-</div>
                </div>
                <div>
                  <div className="text-pump-textMuted mb-1 text-[10px] uppercase tracking-wider">NET P&L</div>
                  <div className={`text-base ${pnlColor}`}>
                    {isPositive ? '+' : ''}${trade.pnl.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
