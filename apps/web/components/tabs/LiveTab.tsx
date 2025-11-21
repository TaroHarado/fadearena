'use client'

import { EquityChart } from '@/components/EquityChart'
import { TradeFeed } from '@/components/TradeFeed'

export function LiveTab() {
  return (
    <div className="space-y-6">
      <EquityChart />
      <TradeFeed />
    </div>
  )
}

