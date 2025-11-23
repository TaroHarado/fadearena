'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import FaderEquityChart from '@/components/FaderEquityChart'
import AssetPrices from '@/components/AssetPrices'
import PositionsSidebar from '@/components/PositionsSidebar'
import { PumpBackground } from '@/components/PumpBackground'
import { Modal } from '@/components/Modal'

export default function Home() {
  const [showInfoModal, setShowInfoModal] = useState(false)

  return (
    <div className="min-h-screen bg-pump-bg relative overflow-hidden">
      <PumpBackground />
      
      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 border-b-2 border-pump-border bg-pump-bg/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-pump-pink via-pump-purple to-pump-blue rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity animate-pump-pulse" />
                <Image
                  src="/logo.png"
                  alt="ReverseArena"
                  width={48}
                  height={48}
                  className="rounded-full relative z-10 animate-pump-float"
                  priority
                />
              </div>
              <span className="text-2xl font-bold text-gradient-pink">ReverseArena.fun</span>
            </Link>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowInfoModal(true)}
                className="px-4 py-2 rounded-xl bg-pump-surface border-2 border-pump-border hover:border-pump-blue text-pump-text hover:text-pump-blue transition-all duration-300 font-medium"
              >
                About
              </button>
              <Link
                href="/dashboard"
                className="btn-pump btn-pump-primary"
              >
                Launch App
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12 animate-pump-slide-up">
            <h1 className="text-6xl md:text-7xl font-black mb-6 text-gradient-pink animate-pump-gradient">
              Trade Against AI
            </h1>
            <p className="text-xl md:text-2xl text-pump-textMuted mb-4 max-w-3xl mx-auto leading-relaxed">
              Flip the script on AI trading bots. Automatically take opposite positions 
              from top-performing models and profit from their moves.
            </p>
            <p className="text-base text-pump-textDim mb-8 max-w-2xl mx-auto">
              Watch positions from Gemini, Grok, Qwen, Kimi, DeepSeek, and Claude. 
              Execute inverse trades with smart leverage and risk management.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link
                href="/dashboard"
                className="btn-pump btn-pump-primary text-lg px-8 py-4"
              >
                Start Trading
              </Link>
              <a
                href="https://x.com/reversearena_fun"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-pump btn-pump-secondary text-lg px-8 py-4"
              >
                Follow on X
              </a>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {[
              { label: 'Active Models', value: '6', color: 'pink' },
              { label: 'Total Positions', value: '21', color: 'purple' },
              { label: 'Live Trades', value: '54+', color: 'blue' },
              { label: 'Status', value: 'LIVE', color: 'green' },
            ].map((stat, index) => (
              <div
                key={stat.label}
                className="card-pump text-center animate-pump-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`text-3xl font-black mb-2 text-gradient-${stat.color}`}>
                  {stat.value}
                </div>
                <div className="text-sm text-pump-textMuted font-medium uppercase tracking-wider">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Charts */}
            <div className="lg:col-span-2 space-y-6">
              <AssetPrices />
              <FaderEquityChart />
            </div>

            {/* Right Column - Positions */}
            <div className="lg:col-span-1">
              <PositionsSidebar />
            </div>
          </div>
        </div>
      </div>

      {/* Info Modal */}
      <Modal
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        title="About ReverseArena"
        size="md"
      >
        <div className="space-y-4 text-pump-text">
          <p className="text-lg leading-relaxed">
            <span className="text-gradient-pink font-bold">ReverseArena.fun</span> is a contrarian trading platform 
            that automatically mirrors top AI trading bots with inverse positions.
          </p>
          <p className="text-pump-textMuted">
            We track positions from leading AI models including Gemini-3-Pro, Grok-4, Qwen3-Max, 
            Kimi-K2-Thinking, DeepSeek-Chat-v3.1, and Claude-Sonnet.
          </p>
          <p className="text-pump-textMuted">
            When these models open positions, we automatically execute opposite trades with 
            configurable leverage and advanced risk controls.
          </p>
          <div className="pt-4 border-t-2 border-pump-border">
            <div className="flex items-center gap-4">
              <a
                href="https://x.com/reversearena_fun"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-pump btn-pump-secondary flex-1 text-center"
              >
                Follow on X
              </a>
              <a
                href="https://pump.fun"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-pump btn-pump-primary flex-1 text-center"
              >
                Visit Pump.fun
              </a>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
