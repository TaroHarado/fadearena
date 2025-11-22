import { useQuery } from '@tanstack/react-query'

interface StateResponse {
  mode: 'simulation' | 'live'
  killSwitch: boolean
  equity: {
    total: number
    botsAggregate: number
    fadeArena: number
  }
  openPositions: {
    count: number
    totalNotional: number
  }
  systemStatus: {
    hyperliquidConnected: boolean
    lastEventTime: number | null
    lastOrderTime: number | null
    uptime: number
  }
  dailyPnL: {
    bots: number
    fadeArena: number
  }
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

async function fetchSystemState(): Promise<StateResponse> {
  const response = await fetch(`${API_BASE}/api/state`)
  if (!response.ok) {
    throw new Error('Failed to fetch system state')
  }
  return response.json()
}

export function useSystemState() {
  return useQuery({
    queryKey: ['systemState'],
    queryFn: fetchSystemState,
    refetchInterval: 5000, // Refetch every 5 seconds
  })
}

