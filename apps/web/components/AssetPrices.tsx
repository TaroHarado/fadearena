'use client';

import { useEffect, useState } from 'react';
import type { AssetPricesResponse } from '@fadearena/shared';

const API_BASE_URL = 
  typeof window !== 'undefined' 
    ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001')
    : 'http://localhost:3001';

const ASSET_ORDER = ['TSLA', 'NDX', 'NVDA', 'MSFT', 'AMZN', 'GOOGL', 'PLTR'];

export default function AssetPrices() {
  const [prices, setPrices] = useState<AssetPricesResponse['prices']>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let intervalId: NodeJS.Timeout | null = null;

    async function fetchPrices() {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 секунд таймаут

        const response = await fetch(`${API_BASE_URL}/api/prices/assets`, {
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data: AssetPricesResponse = await response.json();
        
        if (!mounted) return;

        // Сортируем по порядку ASSET_ORDER
        const sortedPrices = data.prices.sort((a, b) => {
          const indexA = ASSET_ORDER.indexOf(a.ticker);
          const indexB = ASSET_ORDER.indexOf(b.ticker);
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        });

        setPrices(sortedPrices);
        setLoading(false);
      } catch (err) {
        if (!mounted) return;
        console.error('Failed to fetch asset prices:', err);
        setLoading(false);
      }
    }

    // Загружаем сразу
    fetchPrices();

    // Обновляем каждые 15 секунд
    intervalId = setInterval(fetchPrices, 15_000);

    return () => {
      mounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  if (loading && prices.length === 0) {
    return (
      <div className="card p-4 mb-6">
        <div className="text-sm text-terminal-textMuted animate-pulse">Loading prices...</div>
      </div>
    );
  }

  if (prices.length === 0) {
    return null;
  }

  return (
    <div className="card p-4 mb-6">
      <h3 className="text-sm font-semibold mb-3 text-terminal-text animate-fade-in">Asset Prices</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {prices.map((asset, index) => (
          <div 
            key={asset.ticker} 
            className="text-center transition-all duration-300 hover:scale-105 hover:bg-terminal-bg/50 p-2 rounded animate-fade-in"
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

