// useModels отключен для статической версии без API
// Используйте STATIC_BOTS из @/components/BotTable напрямую

import type { ModelResponse } from '@fadearena/shared'

export function useModels() {
  return {
    data: { bots: [] } as ModelResponse,
    isLoading: false,
    isError: false,
  }
}
