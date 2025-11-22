// useModels отключен для статической версии без API
// Используйте STATIC_BOTS из @/components/BotTable напрямую

interface ModelResponse {
  bots: Array<{
    id: string
    name: string
    walletAddress: string
    enabled: boolean
    leverageMultiplier: number
    stats: {
      totalTrades: number
      winRate: number
      totalPnL: number
      dailyPnL: number
    }
  }>
}

export function useModels() {
  return {
    data: { bots: [] } as ModelResponse,
    isLoading: false,
    isError: false,
  }
}
