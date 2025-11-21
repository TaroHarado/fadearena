import { useQuery } from '@tanstack/react-query'
import type { ModelResponse } from '@fadearena/shared'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

async function fetchModels(): Promise<ModelResponse> {
  const response = await fetch(`${API_BASE}/api/models`)
  if (!response.ok) {
    throw new Error('Failed to fetch models')
  }
  return response.json()
}

export function useModels() {
  return useQuery({
    queryKey: ['models'],
    queryFn: fetchModels,
    refetchInterval: 10000, // Refetch every 10 seconds
  })
}

