'use client'

import Link from 'next/link'
import Image from 'next/image'

export function TopNav() {
  const state = {
    mode: 'live' as 'simulation' | 'live',
    killSwitch: false,
  }

  return (
    <nav className="border-b border-black bg-[#f5f4ef]/95 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="fixarena"
              width={40}
              height={40}
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

          <div className="flex items-center gap-8 text-[11px] uppercase tracking-[0.22em]">
            <Link
              href="/dashboard"
              className="hover:underline"
            >
              Dashboard
            </Link>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <a
              href="https://x.com/fixarena_fun"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-arena btn-arena-secondary"
            >
              X
            </a>
            <a
              href="https://pump.fun"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-arena btn-arena-primary"
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
            <span className="text-[10px] text-neutral-600">
              {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    </nav>
  )
}
