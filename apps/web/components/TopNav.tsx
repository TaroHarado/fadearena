'use client'

import Link from 'next/link'
import Image from 'next/image'
export function TopNav() {
  // Статическое состояние (без API)
  const state = {
    mode: 'live' as 'simulation' | 'live',
    killSwitch: false,
  }

  return (
    <nav className="border-b border-terminal-border bg-terminal-surface">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 font-mono text-lg font-bold">
            <Image
              src="/logo.png"
              alt="FadeArena Logo"
              width={32}
              height={32}
              className="rounded-full"
            />
            <span>FadeArena</span>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-sm text-terminal-textMuted hover:text-terminal-text transition-colors"
            >
              Dashboard
            </Link>
          </div>

          {/* Right side: Social buttons + Status */}
          <div className="flex items-center gap-3">
            {/* Social buttons */}
            <a
              href="https://x.com/fadearena_com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-terminal-surface border border-terminal-border rounded hover:bg-terminal-bg transition-colors text-xs font-medium text-terminal-text"
            >
              Twitter
            </a>
            <a
              href="https://pump.fun"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-terminal-surface border border-terminal-border rounded hover:bg-terminal-bg transition-colors text-xs font-medium text-terminal-text"
            >
              Pump.fun
            </a>

            {/* Status Indicators */}
            {state && (
              <>
                <span
                  className={`pill ${
                    state.mode === 'live' ? 'pill-danger' : 'pill-warning'
                  }`}
                >
                  {state.mode.toUpperCase()}
                </span>
                {state.killSwitch && (
                  <span className="pill pill-danger">KILL SWITCH</span>
                )}
              </>
            )}
            <span className="text-xs text-terminal-textMuted font-mono">
              {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    </nav>
  )
}

