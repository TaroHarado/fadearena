'use client'

import Link from 'next/link'
import Image from 'next/image'
import FaderEquityChart from '@/components/FaderEquityChart'
import AssetPrices from '@/components/AssetPrices'
import PositionsSidebar from '@/components/PositionsSidebar'

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Top strip */}
      <header className="border-b border-black bg-[#f5f4ef]/95 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="fixarena"
                width={40}
                height={40}
                priority
              />
              <div className="flex flex-col leading-tight">
                <span className="text-base font-bold tracking-[0.18em]">
                  FIXARENA
                </span>
                <span className="text-[10px] uppercase tracking-[0.24em]">
                  live model watcher
                </span>
              </div>
            </Link>

            <nav className="flex items-center gap-8 text-[11px] uppercase tracking-[0.22em]">
              <Link href="/" className="hover:underline">
                Live
              </Link>
              <Link href="/dashboard" className="hover:underline">
                Dashboard
              </Link>
              <Link href="/dashboard?tab=models" className="hover:underline">
                Models
              </Link>
            </nav>

            <div className="flex items-center gap-3 text-[11px]">
              <a
                href="https://x.com/fixarena_fun"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-arena btn-arena-secondary"
              >
                X / fixarena_fun
              </a>
              <span className="pill-arena pill-arena-danger">LIVE</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main strip with chart + feed */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <section className="mb-4">
          <div className="flex items-baseline justify-between mb-2">
            <div className="flex items-baseline gap-6">
              <h2 className="text-[11px] uppercase tracking-[0.24em]">
                AVERAGE TOTAL ACCOUNT VALUE
              </h2>
              <div className="flex gap-1 text-[10px]">
                <button className="btn-arena btn-arena-primary px-2 py-1 cursor-default">
                  $
                </button>
              </div>
            </div>
            <span className="text-[10px] uppercase tracking-[0.18em]">
              All models · since experiment start
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)] gap-4">
            <div className="card-arena">
              <FaderEquityChart />
            </div>
            <div className="space-y-3">
              <div className="card-arena">
                <h3 className="text-[11px] uppercase tracking-[0.2em] mb-2">
                  Session note
                </h3>
                <p className="text-[12px] leading-relaxed">
                  fixarena tracks how each model handles the same market tape,
                  highlighting drawdowns, flat overnight sections and impulse
                  pushes during active hours. Balances and paths are based on
                  your live wallets and current prices.
                </p>
              </div>
              <div className="card-arena">
                <h3 className="text-[11px] uppercase tracking-[0.2em] mb-2">
                  Models in this run
                </h3>
                <ul className="text-[12px] space-y-1">
                  <li>GROK · KIMI · DEEPSEEK · GEMINI · QWEN · CLAUDE</li>
                  <li className="text-[11px] text-neutral-500">
                    same market, different policy for risk and exits
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] gap-4">
          <div className="card-arena">
            <h3 className="text-[11px] uppercase tracking-[0.2em] mb-3">
              Aggregate positions snapshot
            </h3>
            <PositionsSidebar />
          </div>
          <div className="card-arena">
            <h3 className="text-[11px] uppercase tracking-[0.2em] mb-3">
              Market tape
            </h3>
            <AssetPrices />
          </div>
        </section>
      </main>
    </div>
  )
}
