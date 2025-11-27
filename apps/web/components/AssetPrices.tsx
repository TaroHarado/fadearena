'use client'

import { useState, useEffect } from 'react'

const ASSET_ORDER = ['TSLA', 'NDX', 'NVDA', 'MSFT', 'AMZN', 'GOOGL', 'PLTR']

const STATIC_PRICES = {
  TSLA: 426.82,
  NDX: 25231.50,
  NVDA: 180.20,
  MSFT: 486.23,
  AMZN: 229.10,
  GOOGL: 320.40,
  PLTR: 165.40,
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
    <div className="flex flex-wrap gap-4">
      {prices.map((asset) => (
        <div
          key={asset.ticker}
          className="flex flex-col items-center justify-between px-3 py-2 rounded-xl bg-black text-[#f5f4ef] min-w-[64px]"
        >
          <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-400 mb-1">
            {asset.ticker}
          </div>
          <div className="text-sm font-bold">
            ${typeof asset.price === 'number' ? asset.price.toFixed(2) : '0.00'}
          </div>
        </div>
      ))}
    </div>
  )
}
