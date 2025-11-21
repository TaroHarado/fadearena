import { useQuery } from '@tanstack/react-query'
import type { EquityResponse } from '@fadearena/shared'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface UseEquityOptions {
  startTime?: number
  endTime?: number
  interval?: string
  botId?: string
}

async function fetchEquity(options: UseEquityOptions = {}): Promise<EquityResponse> {
  const params = new URLSearchParams()
  if (options.startTime) params.append('startTime', options.startTime.toString())
  if (options.endTime) params.append('endTime', options.endTime.toString())
  if (options.interval) params.append('interval', options.interval)
  if (options.botId) params.append('botId', options.botId)

  const response = await fetch(`${API_BASE}/api/equity?${params}`)
  if (!response.ok) {
    throw new Error('Failed to fetch equity')
  }
  return response.json()
}

export function useEquity(options: UseEquityOptions = {}) {
  return useQuery({
    queryKey: ['equity', options],
    queryFn: () => fetchEquity(options),
    refetchInterval: 10000,
  })
}

