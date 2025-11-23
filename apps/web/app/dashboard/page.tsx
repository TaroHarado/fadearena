'use client'

import { useState } from 'react'
import { LiveTab } from '@/components/tabs/LiveTab'
import { ModelsTab } from '@/components/tabs/ModelsTab'

type Tab = 'live' | 'models'

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('live')

  return (
    <div className="min-h-screen bg-pump-bg p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Tab Navigation */}
        <div className="flex gap-4 border-b-2 border-pump-border">
          <button
            onClick={() => setActiveTab('live')}
            className={`px-6 py-3 text-sm uppercase tracking-wider font-black transition-all duration-300 relative ${
              activeTab === 'live'
                ? 'text-pump-pink'
                : 'text-pump-textMuted hover:text-pump-text'
            }`}
          >
            Live Trades
            {activeTab === 'live' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-pump-pink via-pump-purple to-pump-blue animate-pump-gradient" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('models')}
            className={`px-6 py-3 text-sm uppercase tracking-wider font-black transition-all duration-300 relative ${
              activeTab === 'models'
                ? 'text-pump-pink'
                : 'text-pump-textMuted hover:text-pump-text'
            }`}
          >
            Models
            {activeTab === 'models' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-pump-pink via-pump-purple to-pump-blue animate-pump-gradient" />
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="animate-pump-slide-up">
          {activeTab === 'live' && <LiveTab />}
          {activeTab === 'models' && <ModelsTab />}
        </div>
      </div>
    </div>
  )
}
