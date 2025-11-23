'use client'

import { useState } from 'react'
import { LiveTab } from '@/components/tabs/LiveTab'
import { ModelsTab } from '@/components/tabs/ModelsTab'

type Tab = 'live' | 'models'

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('live')

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0a', padding: '1.5rem' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #2a2a2a', marginBottom: '1.5rem' }}>
          <button
            onClick={() => setActiveTab('live')}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: activeTab === 'live' ? '#ffffff' : '#888888',
              borderBottom: activeTab === 'live' ? '2px solid #00d4ff' : 'none',
              background: 'none',
              border: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
            }}
          >
            Live Trades
          </button>
          <button
            onClick={() => setActiveTab('models')}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: activeTab === 'models' ? '#ffffff' : '#888888',
              borderBottom: activeTab === 'models' ? '2px solid #00d4ff' : 'none',
              background: 'none',
              border: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
            }}
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
