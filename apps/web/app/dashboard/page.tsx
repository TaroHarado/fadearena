'use client'

import { useState } from 'react'
import { LiveTab } from '@/components/tabs/LiveTab'
import { ModelsTab } from '@/components/tabs/ModelsTab'
import { SettingsTab } from '@/components/tabs/SettingsTab'

type Tab = 'live' | 'models' | 'settings'

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('live')

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-terminal-border">
        <button
          onClick={() => setActiveTab('live')}
          className={`px-4 py-2 text-xs uppercase tracking-wider font-medium transition-colors ${
            activeTab === 'live'
              ? 'border-b-2 border-terminal-text text-terminal-text'
              : 'text-terminal-textMuted hover:text-terminal-text'
          }`}
        >
          Live
        </button>
        <button
          onClick={() => setActiveTab('models')}
          className={`px-4 py-2 text-xs uppercase tracking-wider font-medium transition-colors ${
            activeTab === 'models'
              ? 'border-b-2 border-terminal-text text-terminal-text'
              : 'text-terminal-textMuted hover:text-terminal-text'
          }`}
        >
          Models
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 text-xs uppercase tracking-wider font-medium transition-colors ${
            activeTab === 'settings'
              ? 'border-b-2 border-terminal-text text-terminal-text'
              : 'text-terminal-textMuted hover:text-terminal-text'
          }`}
        >
          Settings
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'live' && <LiveTab />}
        {activeTab === 'models' && <ModelsTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  )
}

