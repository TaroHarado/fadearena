'use client'

import { useHealth } from '@/hooks/useHealth'

export function ErrorBanner() {
  const { data: health, isError } = useHealth()

  if (!isError && health?.status === 'healthy') {
    return null
  }

  const message =
    health?.status === 'unhealthy'
      ? 'System unhealthy - check backend connection'
      : health?.status === 'degraded'
      ? 'System degraded - some services may be unavailable'
      : 'Cannot connect to backend'

  return (
    <div className="bg-terminal-red text-white px-4 py-2 text-sm font-medium">
      <div className="container mx-auto">{message}</div>
    </div>
  )
}

