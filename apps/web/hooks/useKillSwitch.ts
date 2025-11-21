import { useMutation, useQueryClient } from '@tanstack/react-query'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

async function toggleKillSwitch(active: boolean) {
  const response = await fetch(`${API_BASE}/api/kill-switch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active }),
  })
  if (!response.ok) {
    throw new Error('Failed to toggle kill switch')
  }
  return response.json()
}

export function useKillSwitch() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: toggleKillSwitch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      queryClient.invalidateQueries({ queryKey: ['systemState'] })
    },
  })

  return {
    toggleKillSwitch: mutation.mutate,
    isToggling: mutation.isPending,
  }
}

