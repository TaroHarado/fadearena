import { useQuery } from '@tanstack/react-query'
import type { StateResponse } from '@fadearena/shared'

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

