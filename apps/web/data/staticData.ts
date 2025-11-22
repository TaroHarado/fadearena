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

// Статические позиции (из данных пользователя)
export const STATIC_POSITIONS: WalletPositions[] = [
  {
    label: 'GEMINI',
    address: WALLET_ADDRESSES.GEMINI,
    positions: [
      {
        asset: 'TSLA',
        side: 'LONG',
        size: 3.8000,
        entryPrice: 392.26,
        markPrice: 392.26,
        leverage: 10,
        notional: 1484.55,
        unrealizedPnl: -6.04,
        entryTimestamp: getEntryTimestamp(0), // 10:00 AM
      },
      {
        asset: 'NVDA',
        side: 'LONG',
        size: 10.1000,
        entryPrice: 179.73,
        markPrice: 179.73,
        leverage: 10,
        notional: 1812.55,
        unrealizedPnl: -2.73,
        entryTimestamp: getEntryTimestamp(1), // 10:01 AM
      },
      {
        asset: 'PLTR',
        side: 'LONG',
        size: 1.5000,
        entryPrice: 153.77,
        markPrice: 153.77,
        leverage: 10,
        notional: 229.79,
        unrealizedPnl: -0.87,
        entryTimestamp: getEntryTimestamp(2), // 10:02 AM
      },
      {
        asset: 'MSFT',
        side: 'LONG',
        size: 0.6300,
        entryPrice: 471.65,
        markPrice: 471.65,
        leverage: 10,
        notional: 297.13,
        unrealizedPnl: -0.01,
        entryTimestamp: getEntryTimestamp(3), // 10:03 AM
      },
      {
        asset: 'GOOGL',
        side: 'LONG',
        size: 1.2800,
        entryPrice: 304.38,
        markPrice: 304.38,
        leverage: 10,
        notional: 387.71,
        unrealizedPnl: -1.89,
        entryTimestamp: getEntryTimestamp(4), // 10:04 AM
      },
      {
        asset: 'AMZN',
        side: 'LONG',
        size: 0.3400,
        entryPrice: 221.55,
        markPrice: 221.55,
        leverage: 10,
        notional: 75.31,
        unrealizedPnl: -0.01,
        entryTimestamp: getEntryTimestamp(5), // 10:05 AM
      },
    ],
    totalNotional: 4287.04,
    totalUnrealizedPnl: -11.56,
  },
  {
    label: 'GROK',
    address: WALLET_ADDRESSES.GROK,
    positions: [
      {
        asset: 'TSLA',
        side: 'LONG',
        size: 0.8200,
        entryPrice: 392.26,
        markPrice: 392.26,
        leverage: 10,
        notional: 320.35,
        unrealizedPnl: -1.30,
        entryTimestamp: getEntryTimestamp(6), // 10:06 AM
      },
      {
        asset: 'NVDA',
        side: 'LONG',
        size: 12.0000,
        entryPrice: 179.73,
        markPrice: 179.73,
        leverage: 10,
        notional: 2153.52,
        unrealizedPnl: -3.24,
        entryTimestamp: getEntryTimestamp(7), // 10:07 AM
      },
    ],
    totalNotional: 2473.87,
    totalUnrealizedPnl: -4.54,
  },
  {
    label: 'QWEN',
    address: WALLET_ADDRESSES.QWEN,
    positions: [
      {
        asset: 'XYZ100',
        side: 'LONG',
        size: 0.0800,
        entryPrice: 24320.00,
        markPrice: 24320.00,
        leverage: 5,
        notional: 1941.20,
        unrealizedPnl: -4.40,
        entryTimestamp: getEntryTimestamp(8), // 10:08 AM
      },
      {
        asset: 'TSLA',
        side: 'LONG',
        size: 0.0900,
        entryPrice: 390.73,
        markPrice: 390.73,
        leverage: 10,
        notional: 35.16,
        unrealizedPnl: -0.01,
        entryTimestamp: getEntryTimestamp(9), // 10:09 AM
      },
      {
        asset: 'NVDA',
        side: 'LONG',
        size: 0.8600,
        entryPrice: 179.71,
        markPrice: 179.71,
        leverage: 7,
        notional: 154.34,
        unrealizedPnl: -0.22,
        entryTimestamp: getEntryTimestamp(10), // 10:10 AM
      },
      {
        asset: 'PLTR',
        side: 'LONG',
        size: 0.2200,
        entryPrice: 153.77,
        markPrice: 153.77,
        leverage: 10,
        notional: 33.70,
        unrealizedPnl: -0.13,
        entryTimestamp: getEntryTimestamp(11), // 10:11 AM
      },
    ],
    totalNotional: 2164.40,
    totalUnrealizedPnl: -4.75,
  },
  {
    label: 'KIMI',
    address: WALLET_ADDRESSES.KIMI,
    positions: [
      {
        asset: 'TSLA',
        side: 'LONG',
        size: 8.0000,
        entryPrice: 390.73,
        markPrice: 390.73,
        leverage: 10,
        notional: 3125.36,
        unrealizedPnl: -0.48,
        entryTimestamp: getEntryTimestamp(12), // 10:12 AM
      },
      {
        asset: 'NVDA',
        side: 'LONG',
        size: 5.9000,
        entryPrice: 179.71,
        markPrice: 179.71,
        leverage: 10,
        notional: 1058.81,
        unrealizedPnl: -1.48,
        entryTimestamp: getEntryTimestamp(13), // 10:13 AM
      },
    ],
    totalNotional: 4184.17,
    totalUnrealizedPnl: -1.96,
  },
  {
    label: 'DEEPSEEK',
    address: WALLET_ADDRESSES.DEEPSEEK,
    positions: [
      {
        asset: 'TSLA',
        side: 'LONG',
        size: 2.6200,
        entryPrice: 390.73,
        markPrice: 390.73,
        leverage: 10,
        notional: 1023.56,
        unrealizedPnl: -0.16,
        entryTimestamp: getEntryTimestamp(14), // 10:14 AM
      },
      {
        asset: 'NVDA',
        side: 'LONG',
        size: 2.0900,
        entryPrice: 179.71,
        markPrice: 179.71,
        leverage: 10,
        notional: 375.07,
        unrealizedPnl: -0.52,
        entryTimestamp: getEntryTimestamp(15), // 10:15 AM
      },
      {
        asset: 'GOOGL',
        side: 'LONG',
        size: 4.1500,
        entryPrice: 304.36,
        markPrice: 304.36,
        leverage: 10,
        notional: 1257.04,
        unrealizedPnl: -6.06,
        entryTimestamp: getEntryTimestamp(16), // 10:16 AM
      },
    ],
    totalNotional: 2655.67,
    totalUnrealizedPnl: -6.74,
  },
  {
    label: 'CLAUDE',
    address: WALLET_ADDRESSES.CLAUDE,
    positions: [
      {
        asset: 'TSLA',
        side: 'LONG',
        size: 0.7700,
        entryPrice: 392.26,
        markPrice: 392.26,
        leverage: 10,
        notional: 300.82,
        unrealizedPnl: -1.22,
        entryTimestamp: getEntryTimestamp(17), // 10:17 AM
      },
      {
        asset: 'NVDA',
        side: 'LONG',
        size: 2.7500,
        entryPrice: 179.74,
        markPrice: 179.74,
        leverage: 10,
        notional: 493.52,
        unrealizedPnl: -0.77,
        entryTimestamp: getEntryTimestamp(18), // 10:18 AM
      },
      {
        asset: 'PLTR',
        side: 'LONG',
        size: 6.4000,
        entryPrice: 153.77,
        markPrice: 153.77,
        leverage: 10,
        notional: 980.42,
        unrealizedPnl: -3.71,
        entryTimestamp: getEntryTimestamp(19), // 10:19 AM
      },
      {
        asset: 'GOOGL',
        side: 'LONG',
        size: 2.0000,
        entryPrice: 304.39,
        markPrice: 304.39,
        leverage: 10,
        notional: 605.80,
        unrealizedPnl: -2.98,
        entryTimestamp: getEntryTimestamp(20), // 10:20 AM
      },
    ],
    totalNotional: 2380.56,
    totalUnrealizedPnl: -8.69,
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

