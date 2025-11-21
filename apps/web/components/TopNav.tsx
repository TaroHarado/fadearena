'use client'

import Link from 'next/link'
import { useSystemState } from '@/hooks/useSystemState'

export function TopNav() {
  const { data: state } = useSystemState()

  return (
    <nav className="border-b border-terminal-border bg-terminal-surface">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/dashboard" className="font-mono text-lg font-bold">
            FadeArena
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

          {/* Status Indicators */}
          <div className="flex items-center gap-3">
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

