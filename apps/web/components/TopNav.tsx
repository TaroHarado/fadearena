'use client'

import Link from 'next/link'
import Image from 'next/image'

export function TopNav() {
  const state = {
    mode: 'live' as 'simulation' | 'live',
    killSwitch: false,
  }

  return (
    <nav className="border-b-2 border-pump-border bg-pump-bg/90 backdrop-blur-xl sticky top-0 z-50 shadow-[0_0_30px_rgba(255,0,255,0.1)]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-pump-pink via-pump-purple to-pump-blue rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity animate-pump-pulse" />
              <Image
                src="/logo.png"
                alt="ReverseArena"
                width={40}
                height={40}
                className="rounded-full relative z-10 animate-pump-float"
              />
            </div>
            <span className="text-xl font-black text-gradient-pink">ReverseArena.fun</span>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-sm font-bold text-pump-textMuted hover:text-pump-pink transition-colors uppercase tracking-wider"
            >
              Dashboard
            </Link>
          </div>

          {/* Right side: Social buttons + Status */}
          <div className="flex items-center gap-3">
            {/* Social buttons */}
            <a
              href="https://x.com/reversearena_fun"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-pump btn-pump-secondary text-xs px-4 py-2"
            >
              X
            </a>
            <a
              href="https://pump.fun"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-pump btn-pump-primary text-xs px-4 py-2"
            >
              Pump.fun
            </a>

            {/* Status Indicators */}
            {state && (
              <>
                <span
                  className={`pill-pump ${
                    state.mode === 'live' ? 'pill-pump-danger' : 'pill-pump-warning'
                  }`}
                >
                  {state.mode.toUpperCase()}
                </span>
                {state.killSwitch && (
                  <span className="pill-pump pill-pump-danger">KILL SWITCH</span>
                )}
              </>
            )}
            <span className="text-xs text-pump-textMuted font-black uppercase tracking-wider">
              {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    </nav>
  )
}
