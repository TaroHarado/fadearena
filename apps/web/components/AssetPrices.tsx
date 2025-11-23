'use client'

import { useState, useEffect } from 'react'

const ASSET_ORDER = ['TSLA', 'NDX', 'NVDA', 'MSFT', 'AMZN', 'GOOGL', 'PLTR']

const STATIC_PRICES = {
  TSLA: 392.26,
  NDX: 24284.15,
  NVDA: 179.73,
  MSFT: 471.65,
  AMZN: 221.55,
  GOOGL: 304.38,
  PLTR: 153.77,
}

interface PriceData {
  ticker: string
  symbol: string
  price: number
  timestamp: number
}

export default function AssetPrices() {
  const initialPrices: PriceData[] = ASSET_ORDER.map((ticker) => ({
    ticker,
    symbol: ticker,
    price: STATIC_PRICES[ticker as keyof typeof STATIC_PRICES] || 0,
    timestamp: Date.now(),
  }))
  
  const [prices, setPrices] = useState<PriceData[]>(initialPrices)

  useEffect(() => {
    const intervalId = setInterval(() => {
      setPrices((prev) =>
        prev.map((p) => ({
          ...p,
          price: p.price * (1 + (Math.random() - 0.5) * 0.0002),
          timestamp: Date.now(),
        }))
      )
    }, 5000)

    return () => clearInterval(intervalId)
  }, [])

  const colors = [
    'from-pump-pink to-pump-purple',
    'from-pump-purple to-pump-blue',
    'from-pump-blue to-pump-cyan',
    'from-pump-cyan to-pump-green',
    'from-pump-green to-pump-yellow',
    'from-pump-yellow to-pump-orange',
    'from-pump-orange to-pump-pink',
  ]

  return (
    <div className="card-pump animate-pump-slide-up">
      <h3 className="text-lg font-bold mb-4 text-gradient-pink uppercase tracking-wider">
        Market Prices
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
        {prices.map((asset, index) => (
          <div
            key={asset.ticker}
            className="group relative p-4 rounded-xl bg-pump-surface border-2 border-pump-border hover:border-pump-pink/50 transition-all duration-300 hover:scale-110 hover:shadow-[0_0_20px_rgba(255,0,255,0.3)]"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="text-xs text-pump-textMuted mb-2 font-bold uppercase tracking-wider">
              {asset.ticker}
            </div>
            <div className={`text-lg font-black bg-gradient-to-r ${colors[index % colors.length]} bg-clip-text text-transparent`}>
              ${typeof asset.price === 'number' ? asset.price.toFixed(2) : '0.00'}
            </div>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r opacity-0 group-hover:opacity-10 transition-opacity"
                 style={{ background: `linear-gradient(135deg, ${colors[index % colors.length]})` }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
