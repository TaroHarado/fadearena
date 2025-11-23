'use client'

import Link from 'next/link'
import Image from 'next/image'

export function TopNav() {
  const state = {
    mode: 'live' as 'simulation' | 'live',
    killSwitch: false,
  }

  return (
    <nav className="border-b border-arena-border bg-arena-bg/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="ReverseArena"
              width={40}
              height={40}
              className="rounded-full"
            />
            <span className="text-xl font-bold text-arena-text">ReverseArena.fun</span>
          </Link>

          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-sm font-semibold text-arena-textMuted hover:text-arena-text transition-colors"
            >
              Dashboard
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://x.com/reverse_arena"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-arena btn-arena-secondary text-sm"
            >
              X
            </a>
            <a
              href="https://pump.fun"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-arena btn-arena-primary text-sm"
            >
              Pump.fun
            </a>

            {state && (
              <>
                <span
                  className={`pill-arena ${
                    state.mode === 'live' ? 'pill-arena-danger' : 'pill-arena-success'
                  }`}
                >
                  {state.mode.toUpperCase()}
                </span>
                {state.killSwitch && (
                  <span className="pill-arena pill-arena-danger">KILL SWITCH</span>
                )}
              </>
            )}
            <span className="text-xs text-arena-textMuted font-mono">
              {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    </nav>
  )
}
