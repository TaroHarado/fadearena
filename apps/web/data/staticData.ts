// Статические данные для работы без API

export interface Position {
  asset: string;
  side: 'LONG' | 'SHORT';
  size: number;
  entryPrice: number;
  markPrice: number;
  notional: number;
  unrealizedPnl: number;
  leverage: number;
  entryTimestamp?: number; // Время открытия позиции (timestamp в миллисекундах)
}

export interface WalletPositions {
  label: string;
  address: string;
  positions: Position[];
  totalNotional: number;
  totalUnrealizedPnl: number;
}

// Реальные адреса кошельков из .env
const WALLET_ADDRESSES = {
  GEMINI: '0x6f2ea87352a816480ccdf19eb9e0f2192b0ef492',
  GROK: '0x228b0c07a852b303619b59fa548d0e542ccc3aee',
  QWEN: '0x894f3a60c06e9e96d251fd9137ce0962969e924b',
  KIMI: '0x4f3d2a8e226b0f1123ab3ed3b697847ef2488b37',
  DEEPSEEK: '0x0a780c3b47765d60b72b5f11d4513e71c691782a',
  CLAUDE: '0xb1a397558c7a2ea43b46114addd2fb277216500b',
};

// Генерируем фиксированные времена открытия позиций (10:00 AM сегодня + смещение)
function getEntryTimestamp(offsetMinutes: number): number {
  const baseTime = new Date();
  baseTime.setHours(10, 0, 0, 0); // 10:00 AM сегодня
  return baseTime.getTime() + offsetMinutes * 60000;
}

// Текущие цены активов (для расчета размеров позиций)
const CURRENT_PRICES = {
  TSLA: 426.82,
  NDX: 25231.50,
  NVDA: 180.20,
  MSFT: 486.23,
  AMZN: 229.10,
  GOOGL: 320.40,
  PLTR: 165.40,
};

// Статические позиции (из данных пользователя)
export const STATIC_POSITIONS: WalletPositions[] = [
  {
    label: 'GEMINI',
    address: WALLET_ADDRESSES.GEMINI,
    positions: [
      {
        asset: 'TSLA',
        side: 'SHORT',
        size: 0.9140,
        entryPrice: CURRENT_PRICES.TSLA,
        markPrice: CURRENT_PRICES.TSLA,
        leverage: 10,
        notional: 358.50,
        unrealizedPnl: 5.34,
        entryTimestamp: getEntryTimestamp(0),
      },
      {
        asset: 'AMZN',
        side: 'SHORT',
        size: 1.7460,
        entryPrice: CURRENT_PRICES.AMZN,
        markPrice: CURRENT_PRICES.AMZN,
        leverage: 10,
        notional: 386.90,
        unrealizedPnl: -1.34,
        entryTimestamp: getEntryTimestamp(1),
      },
      {
        asset: 'NDX',
        side: 'SHORT',
        size: 0.0211,
        entryPrice: CURRENT_PRICES.NDX,
        markPrice: CURRENT_PRICES.NDX,
        leverage: 10,
        notional: 512.00,
        unrealizedPnl: 5.93,
        entryTimestamp: getEntryTimestamp(2),
      },
    ],
    totalNotional: 1257.40,
    totalUnrealizedPnl: 9.93,
  },
  {
    label: 'GROK',
    address: WALLET_ADDRESSES.GROK,
    positions: [
      {
        asset: 'MSFT',
        side: 'SHORT',
        size: 2.9800,
        entryPrice: CURRENT_PRICES.MSFT,
        markPrice: CURRENT_PRICES.MSFT,
        leverage: 10,
        notional: 1406.50,
        unrealizedPnl: 23.13,
        entryTimestamp: getEntryTimestamp(3),
      },
      {
        asset: 'NDX',
        side: 'SHORT',
        size: 0.0354,
        entryPrice: CURRENT_PRICES.NDX,
        markPrice: CURRENT_PRICES.NDX,
        leverage: 10,
        notional: 859.00,
        unrealizedPnl: 16.73,
        entryTimestamp: getEntryTimestamp(4),
      },
      {
        asset: 'NVDA',
        side: 'SHORT',
        size: 0.2007,
        entryPrice: CURRENT_PRICES.NVDA,
        markPrice: CURRENT_PRICES.NVDA,
        leverage: 10,
        notional: 36.10,
        unrealizedPnl: 0.48,
        entryTimestamp: getEntryTimestamp(5),
      },
      {
        asset: 'TSLA',
        side: 'SHORT',
        size: 0.0439,
        entryPrice: CURRENT_PRICES.TSLA,
        markPrice: CURRENT_PRICES.TSLA,
        leverage: 10,
        notional: 17.20,
        unrealizedPnl: 0,
        entryTimestamp: getEntryTimestamp(6),
      },
    ],
    totalNotional: 2318.80,
    totalUnrealizedPnl: 40.34,
  },
  {
    label: 'QWEN',
    address: WALLET_ADDRESSES.QWEN,
    positions: [
      {
        asset: 'MSFT',
        side: 'SHORT',
        size: 0.0151,
        entryPrice: CURRENT_PRICES.MSFT,
        markPrice: CURRENT_PRICES.MSFT,
        leverage: 10,
        notional: 7.10,
        unrealizedPnl: 0.01,
        entryTimestamp: getEntryTimestamp(7),
      },
      {
        asset: 'NDX',
        side: 'SHORT',
        size: 0.1266,
        entryPrice: CURRENT_PRICES.NDX,
        markPrice: CURRENT_PRICES.NDX,
        leverage: 10,
        notional: 3074.00,
        unrealizedPnl: -0.21,
        entryTimestamp: getEntryTimestamp(8),
      },
      {
        asset: 'NVDA',
        side: 'SHORT',
        size: 2.0507,
        entryPrice: CURRENT_PRICES.NVDA,
        markPrice: CURRENT_PRICES.NVDA,
        leverage: 10,
        notional: 368.80,
        unrealizedPnl: 0.60,
        entryTimestamp: getEntryTimestamp(9),
      },
      {
        asset: 'TSLA',
        side: 'SHORT',
        size: 0.0285,
        entryPrice: CURRENT_PRICES.TSLA,
        markPrice: CURRENT_PRICES.TSLA,
        leverage: 10,
        notional: 11.20,
        unrealizedPnl: 0.01,
        entryTimestamp: getEntryTimestamp(10),
      },
    ],
    totalNotional: 3461.10,
    totalUnrealizedPnl: 0.41,
  },
  {
    label: 'KIMI',
    address: WALLET_ADDRESSES.KIMI,
    positions: [
      {
        asset: 'PLTR',
        side: 'SHORT',
        size: 7.4500,
        entryPrice: CURRENT_PRICES.PLTR,
        markPrice: CURRENT_PRICES.PLTR,
        leverage: 10,
        notional: 1146.50,
        unrealizedPnl: 24.24,
        entryTimestamp: getEntryTimestamp(11),
      },
      {
        asset: 'NDX',
        side: 'SHORT',
        size: 0.0502,
        entryPrice: CURRENT_PRICES.NDX,
        markPrice: CURRENT_PRICES.NDX,
        leverage: 10,
        notional: 1219.00,
        unrealizedPnl: 28.29,
        entryTimestamp: getEntryTimestamp(12),
      },
    ],
    totalNotional: 2365.50,
    totalUnrealizedPnl: 52.53,
  },
  {
    label: 'DEEPSEEK',
    address: WALLET_ADDRESSES.DEEPSEEK,
    positions: [
      {
        asset: 'NDX',
        side: 'SHORT',
        size: 0.0588,
        entryPrice: CURRENT_PRICES.NDX,
        markPrice: CURRENT_PRICES.NDX,
        leverage: 10,
        notional: 1429.50,
        unrealizedPnl: 0,
        entryTimestamp: getEntryTimestamp(13),
      },
    ],
    totalNotional: 1429.50,
    totalUnrealizedPnl: 0,
  },
  {
    label: 'CLAUDE',
    address: WALLET_ADDRESSES.CLAUDE,
    positions: [
      {
        asset: 'NDX',
        side: 'SHORT',
        size: 0.0132,
        entryPrice: CURRENT_PRICES.NDX,
        markPrice: CURRENT_PRICES.NDX,
        leverage: 10,
        notional: 321.50,
        unrealizedPnl: 7.29,
        entryTimestamp: getEntryTimestamp(14),
      },
      {
        asset: 'GOOGL',
        side: 'LONG',
        size: 1.2160,
        entryPrice: CURRENT_PRICES.GOOGL,
        markPrice: CURRENT_PRICES.GOOGL,
        leverage: 10,
        notional: 370.30,
        unrealizedPnl: -0.76,
        entryTimestamp: getEntryTimestamp(15),
      },
    ],
    totalNotional: 691.80,
    totalUnrealizedPnl: 6.53,
  },
];

// Базовые значения для чарта (примерные, из БД)
// Будем генерировать динамически с актуальным временем
export function generateInitialChartData() {
  const now = Date.now();
  const baseValues = {
    GEMINI: 500.0,
    GROK: 480.0,
    QWEN: 520.0,
    KIMI: 510.0,
    DEEPSEEK: 490.0,
    CLAUDE: 505.0,
  };

  // Генерируем данные за последние 6 часов (каждые 10 секунд = 2160 точек)
  // Но для производительности сделаем каждые 1 минуту = 360 точек
  const points: Array<{ time: number; GEMINI: number; GROK: number; QWEN: number; KIMI: number; DEEPSEEK: number; CLAUDE: number }> = [];
  
  const startTime = now - 6 * 60 * 60 * 1000; // 6 часов назад
  const interval = 60 * 1000; // 1 минута
  
  for (let t = startTime; t <= now; t += interval) {
    // Добавляем небольшую случайную вариацию ±0.01%
    const variation = 0.0001; // 0.01%
    points.push({
      time: t,
      GEMINI: baseValues.GEMINI * (1 + (Math.random() - 0.5) * variation * 2),
      GROK: baseValues.GROK * (1 + (Math.random() - 0.5) * variation * 2),
      QWEN: baseValues.QWEN * (1 + (Math.random() - 0.5) * variation * 2),
      KIMI: baseValues.KIMI * (1 + (Math.random() - 0.5) * variation * 2),
      DEEPSEEK: baseValues.DEEPSEEK * (1 + (Math.random() - 0.5) * variation * 2),
      CLAUDE: baseValues.CLAUDE * (1 + (Math.random() - 0.5) * variation * 2),
    });
  }

  return points;
}

