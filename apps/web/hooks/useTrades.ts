import { useQuery } from '@tanstack/react-query'

interface TradeResponse {
  id: string
  type: 'bot' | 'mine'
  botId: string | null
  timestamp: number
  asset: string
  side: 'long' | 'short'
  size: number
  price: number
  notional: number
  pnl: number | null
  simulated: boolean
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface TradesResponse {
  trades: TradeResponse[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface UseTradesOptions {
  page?: number
  limit?: number
  botId?: string
  type?: 'bot' | 'mine' | 'all'
}

async function fetchTrades(options: UseTradesOptions = {}): Promise<TradesResponse> {
  const params = new URLSearchParams()
  if (options.page) params.append('page', options.page.toString())
  if (options.limit) params.append('limit', options.limit.toString())
  if (options.botId) params.append('botId', options.botId)
  if (options.type) params.append('type', options.type)

  const response = await fetch(`${API_BASE}/api/trades?${params}`)
  if (!response.ok) {
    throw new Error('Failed to fetch trades')
  }
  return response.json()
}

export function useTrades(options: UseTradesOptions = {}) {
  return useQuery({
    queryKey: ['trades', options],
    queryFn: () => fetchTrades(options),
    refetchInterval: 5000,
  })
}

