import { useQuery } from '@tanstack/react-query'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  checks: {
    database: { status: string; latency: number }
    hyperliquid: { status: string; latency: number; lastSuccessfulCall: number | null }
  }
  timestamp: number
}

async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE}/api/health`)
  if (!response.ok) {
    throw new Error('Health check failed')
  }
  return response.json()
}

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    refetchInterval: 10000,
    retry: 1,
  })
}

