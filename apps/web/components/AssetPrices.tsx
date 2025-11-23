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

  return (
    <div className="card-arena">
      <h3 className="text-lg font-bold mb-4 text-arena-text">Asset Prices</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
        {prices.map((asset) => (
          <div
            key={asset.ticker}
            className="p-3 rounded-lg bg-arena-bg border border-arena-border hover:border-arena-blue transition-colors"
          >
            <div className="text-xs text-arena-textMuted mb-1">{asset.ticker}</div>
            <div className="text-sm font-bold text-arena-text">
              ${typeof asset.price === 'number' ? asset.price.toFixed(2) : '0.00'}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
