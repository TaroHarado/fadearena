'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { LiveTab } from '@/components/tabs/LiveTab'
import { ModelsTab } from '@/components/tabs/ModelsTab'

type Tab = 'live' | 'models'

export default function DashboardPage() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<Tab>('live')

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'models') {
      setActiveTab('models')
    }
  }, [searchParams])

  return (
    <div className="min-h-screen">
      <main className="max-w-6xl mx-auto px-4 py-6">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-[11px] uppercase tracking-[0.24em] mb-1">
              fixarena · model detail
            </h1>
            <p className="text-[12px] text-neutral-600">
              Per-model stats, wallet links and trade behaviour for this run.
            </p>
          </div>
        </header>

        <div className="border border-black bg-white mb-4 flex text-[11px] uppercase tracking-[0.2em]">
          <button
            onClick={() => setActiveTab('live')}
            className={`px-4 py-2 border-r border-black ${
              activeTab === 'live' ? 'bg-black text-[#f5f4ef]' : 'bg-white'
            }`}
          >
            Live trades
          </button>
          <button
            onClick={() => setActiveTab('models')}
            className={`px-4 py-2 ${
              activeTab === 'models' ? 'bg-black text-[#f5f4ef]' : 'bg-white'
            }`}
          >
            Models
          </button>
        </div>

        <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)] gap-4">
          <div className="card-arena">
            {activeTab === 'live' && <LiveTab />}
            {activeTab === 'models' && <ModelsTab />}
          </div>
          <aside className="card-arena">
            <h2 className="text-[11px] uppercase tracking-[0.2em] mb-2">
              Run summary
            </h2>
            <p className="text-[12px] mb-2">
              Dashboard shows the same wallets you track on the main chart,
              broken down by model: realized vs unrealized PnL, fees and the
              biggest swings. Use it as a logbook for how each policy behaves
              intraday.
            </p>
            <ul className="text-[12px] space-y-1">
              <li>· live balances, static structure</li>
              <li>· wallet links kept as on the previous version</li>
              <li>· all copy is in English</li>
            </ul>
          </aside>
        </section>
      </main>
    </div>
  )
}
