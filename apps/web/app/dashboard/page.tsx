'use client'

import { useState } from 'react'
import { LiveTab } from '@/components/tabs/LiveTab'
import { ModelsTab } from '@/components/tabs/ModelsTab'

type Tab = 'live' | 'models'

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('live')

  return (
    <div className="min-h-screen bg-arena-bg p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex gap-4 border-b border-arena-border">
          <button
            onClick={() => setActiveTab('live')}
            className={`px-6 py-3 text-sm font-semibold transition-colors relative ${
              activeTab === 'live'
                ? 'text-arena-text border-b-2 border-arena-blue'
                : 'text-arena-textMuted hover:text-arena-text'
            }`}
          >
            Live Trades
          </button>
          <button
            onClick={() => setActiveTab('models')}
            className={`px-6 py-3 text-sm font-semibold transition-colors relative ${
              activeTab === 'models'
                ? 'text-arena-text border-b-2 border-arena-blue'
                : 'text-arena-textMuted hover:text-arena-text'
            }`}
          >
            Models
          </button>
        </div>

        <div>
          {activeTab === 'live' && <LiveTab />}
          {activeTab === 'models' && <ModelsTab />}
        </div>
      </div>
    </div>
  )
}
