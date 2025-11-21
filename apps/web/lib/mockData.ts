// Mock data for development when backend is not available
import type {
  StateResponse,
  ModelResponse,
  TradeResponse,
  EquityResponse,
  Settings,
} from '@fadearena/shared'

export const mockState: StateResponse = {
  mode: 'simulation',
  killSwitch: false,
  equity: {
    total: 100000,
    botsAggregate: 150000,
    fadeArena: 100000,
  },
  openPositions: {
    count: 5,
    totalNotional: 50000,
  },
  systemStatus: {
    hyperliquidConnected: true,
    lastEventTime: Date.now() - 5000,
    lastOrderTime: Date.now() - 10000,
    uptime: 3600,
  },
  dailyPnL: {
    bots: 5000,
    fadeArena: -2000,
  },
}

export const mockModels: ModelResponse = {
  bots: [
    {
      id: 'gemini-3-pro',
      name: 'Gemini 3 Pro',
      walletAddress: '0x1234567890123456789012345678901234567890',
      enabled: true,
      leverageMultiplier: 1.0,
      currentPositions: [],
      myMirroredPositions: [],
      stats: {
        totalTrades: 45,
        winRate: 0.62,
        totalPnL: 3500,
        dailyPnL: 250,
      },
    },
    {
      id: 'grok-4',
      name: 'Grok 4',
      walletAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      enabled: true,
      leverageMultiplier: 1.5,
      currentPositions: [],
      myMirroredPositions: [],
      stats: {
        totalTrades: 38,
        winRate: 0.58,
        totalPnL: 2100,
        dailyPnL: -150,
      },
    },
  ],
}

export const mockTrades: TradeResponse[] = [
  {
    id: '1',
    type: 'bot',
    botId: 'gemini-3-pro',
    timestamp: Date.now() - 60000,
    asset: 'BTC',
    side: 'long',
    size: 0.1,
    price: 45000,
    notional: 4500,
    pnl: null,
    simulated: false,
  },
  {
    id: '2',
    type: 'mine',
    botId: 'gemini-3-pro',
    timestamp: Date.now() - 55000,
    asset: 'BTC',
    side: 'short',
    size: 0.1,
    price: 45000,
    notional: 4500,
    pnl: -50,
    simulated: true,
  },
]

export const mockEquity: EquityResponse = {
  series: Array.from({ length: 50 }, (_, i) => ({
    timestamp: Date.now() - (50 - i) * 60000,
    botsAggregate: 150000 + Math.random() * 10000,
    fadeArena: 100000 + Math.random() * 5000,
  })),
  interval: '5m',
  startTime: Date.now() - 50 * 60000,
  endTime: Date.now(),
}

export const mockSettings: Settings = {
  mode: 'simulation',
  globalExposureCap: 100000,
  dailyLossLimit: 5000,
  bots: [
    { id: 'gemini-3-pro', name: 'Gemini 3 Pro', walletAddress: '0x...', enabled: true, leverageMultiplier: 1.0 },
    { id: 'grok-4', name: 'Grok 4', walletAddress: '0x...', enabled: true, leverageMultiplier: 1.5 },
  ],
  assetExposureCaps: {},
  killSwitch: false,
}

