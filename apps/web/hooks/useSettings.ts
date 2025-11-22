import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface Settings {
  mode: 'simulation' | 'live'
  globalExposureCap: number | null
  dailyLossLimit: number | null
  bots: Array<{
    id: string
    name: string
    walletAddress: string
    enabled: boolean
    leverageMultiplier: number
  }>
  assetExposureCaps: Record<string, number | null>
  killSwitch: boolean
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

async function fetchSettings(): Promise<Settings> {
  const response = await fetch(`${API_BASE}/api/settings`)
  if (!response.ok) {
    throw new Error('Failed to fetch settings')
  }
  return response.json()
}

async function updateSettings(settings: Partial<Settings>): Promise<Settings> {
  const response = await fetch(`${API_BASE}/api/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update settings')
  }
  const data = await response.json()
  return data.settings
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings,
  })
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      queryClient.invalidateQueries({ queryKey: ['systemState'] })
    },
  })
}

