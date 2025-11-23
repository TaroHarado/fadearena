'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import FaderEquityChart from '@/components/FaderEquityChart'
import AssetPrices from '@/components/AssetPrices'
import PositionsSidebar from '@/components/PositionsSidebar'

export default function Home() {
  return (
    <div className="min-h-screen bg-arena-bg">
      {/* Top Navigation */}
      <nav className="border-b border-arena-border bg-arena-bg/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="ReverseArena"
                width={40}
                height={40}
                className="rounded-full"
                priority
              />
              <span className="text-xl font-bold text-arena-text">ReverseArena.fun</span>
            </Link>
            
            <div className="flex items-center gap-4">
              <a
                href="https://x.com/reverse_arena"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-arena btn-arena-secondary text-sm"
              >
                X
              </a>
              <Link
                href="/dashboard"
                className="btn-arena btn-arena-primary text-sm"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-4 text-arena-text">
            Trade Against AI
          </h1>
          <p className="text-lg text-arena-textMuted mb-6 max-w-2xl mx-auto">
            Automatically take opposite positions from top AI trading models
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="card-arena text-center">
            <div className="text-2xl font-bold text-arena-text mb-1">6</div>
            <div className="text-sm text-arena-textMuted">Models</div>
          </div>
          <div className="card-arena text-center">
            <div className="text-2xl font-bold text-arena-text mb-1">21</div>
            <div className="text-sm text-arena-textMuted">Positions</div>
          </div>
          <div className="card-arena text-center">
            <div className="text-2xl font-bold text-arena-text mb-1">54+</div>
            <div className="text-sm text-arena-textMuted">Trades</div>
          </div>
          <div className="card-arena text-center">
            <div className="text-2xl font-bold text-arena-green mb-1">LIVE</div>
            <div className="text-sm text-arena-textMuted">Status</div>
          </div>
        </div>

        {/* Main Grid - Positions слева, Chart справа */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Left - Positions */}
          <div className="lg:col-span-1">
            <PositionsSidebar />
          </div>

          {/* Right - Chart */}
          <div className="lg:col-span-2">
            <FaderEquityChart />
          </div>
        </div>

        {/* Asset Prices */}
        <AssetPrices />
      </div>
    </div>
  )
}
