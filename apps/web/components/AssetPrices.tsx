'use client';

import { useState, useEffect } from 'react';

const ASSET_ORDER = ['TSLA', 'NDX', 'NVDA', 'MSFT', 'AMZN', 'GOOGL', 'PLTR'];

// Статические цены активов
const STATIC_PRICES = {
  TSLA: 392.26,
  NDX: 24284.15,
  NVDA: 179.73,
  MSFT: 471.65,
  AMZN: 221.55,
  GOOGL: 304.38,
  PLTR: 153.77,
};

interface PriceData {
  ticker: string;
  symbol: string;
  price: number;
  timestamp: number;
}

export default function AssetPrices() {
  // Инициализируем цены сразу, чтобы избежать "Loading..."
  const initialPrices: PriceData[] = ASSET_ORDER.map((ticker) => ({
    ticker,
    symbol: ticker,
    price: STATIC_PRICES[ticker as keyof typeof STATIC_PRICES] || 0,
    timestamp: Date.now(),
  }));
  
  const [prices, setPrices] = useState<PriceData[]>(initialPrices);

  useEffect(() => {

    // Обновляем цены каждые 5 секунд с небольшими изменениями ±0.01%
    const intervalId = setInterval(() => {
      setPrices((prev) =>
        prev.map((p) => ({
          ...p,
          price: p.price * (1 + (Math.random() - 0.5) * 0.0002), // ±0.01% изменение (0.0002 = 2 * 0.0001)
          timestamp: Date.now(),
        }))
      );
    }, 5000); // Каждые 5 секунд

    return () => clearInterval(intervalId);
  }, []);

  if (prices.length === 0) {
    return (
      <div className="card p-4 mb-6">
        <div className="text-sm text-terminal-textMuted animate-pulse">Loading prices...</div>
      </div>
    );
  }

  return (
    <div className="card p-4 mb-6">
      <h3 className="text-sm font-semibold mb-3 text-terminal-text animate-fade-in">Asset Prices</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {prices.map((asset, index) => (
          <div 
            key={asset.ticker} 
            className="text-center transition-all duration-300 hover:scale-110 hover:bg-terminal-bg/50 p-3 rounded-lg hover:border-terminal-purple/30 border border-transparent animate-fade-in hover:shadow-lg hover:shadow-terminal-purple/20"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="text-xs text-terminal-textMuted mb-1">{asset.ticker}</div>
            <div className="text-sm font-mono font-semibold text-terminal-text">
              ${typeof asset.price === 'number' ? asset.price.toFixed(2) : '0.00'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

