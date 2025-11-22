import { Router } from 'express';
import { PrismaClient } from '@fadearena/shared';
import type { FaderEquityResponse, FaderEquityHistoryResponse } from '@fadearena/shared';

const FADER_CONFIG = [
  { label: 'GEMINI', envVar: 'MY_GEMINI_FADE_WALLET' },
  { label: 'GROK', envVar: 'MY_GROK_FADE_WALLET' },
  { label: 'QWEN', envVar: 'MY_QWEN_FADE_WALLET' },
  { label: 'KIMI', envVar: 'MY_KIMI_FADE_WALLET' },
  { label: 'DEEPSEEK', envVar: 'MY_DEEPSEEK_FADE_WALLET' },
  { label: 'CLAUDE', envVar: 'MY_CLAUDE_FADE_WALLET' },
];

const HYPERLIQUID_INFO_URL = 'https://api.hyperliquid.xyz/info';

/**
 * Получить account value (equity) из Hyperliquid API с повторными попытками
 */
async function getAccountValue(address: string, retries: number = 3): Promise<number> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Получаем данные из default DEX
      const defaultResponse = await fetch(HYPERLIQUID_INFO_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'clearinghouseState',
          user: address,
        }),
      });

      if (!defaultResponse.ok) {
        throw new Error(`HTTP ${defaultResponse.status}: ${defaultResponse.statusText}`);
      }

      const data: any = await defaultResponse.json();
      
      // Получаем данные из xyz DEX (для stock perps)
      let xyzData: any = null;
      try {
        const xyzResponse = await fetch(HYPERLIQUID_INFO_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'clearinghouseState',
            user: address,
            dex: 'xyz',
          }),
        });
        
        if (xyzResponse.ok) {
          xyzData = await xyzResponse.json();
        }
      } catch (xyzError) {
        // Игнорируем ошибки xyz DEX, продолжаем с default
        console.warn(`[EQUITY] Failed to fetch xyz DEX for ${address.substring(0, 10)}...:`, xyzError);
      }
      
      // Account Total Value = сумма стейблов + сумма позиций (БЕЗ ПЛЕЧА)
      // Используем marginSummary.accountValue, который уже включает все это
      
      let accountValue = 0;
      
      // Получаем Account Total Value из default DEX
      if (data.marginSummary?.accountValue !== undefined) {
        accountValue = parseFloat(String(data.marginSummary.accountValue));
      } else if (data.withdrawable !== undefined) {
        // Fallback: если accountValue нет, используем withdrawable
        // Но это не идеально, т.к. не включает позиции
        accountValue = parseFloat(String(data.withdrawable));
      }
      
      // Добавляем Account Total Value из xyz DEX (stock perps), если есть
      if (xyzData && xyzData.marginSummary?.accountValue !== undefined) {
        const xyzAccountValue = parseFloat(String(xyzData.marginSummary.accountValue));
        if (!isNaN(xyzAccountValue)) {
          accountValue += xyzAccountValue;
        }
      } else if (xyzData && xyzData.withdrawable !== undefined) {
        // Fallback для xyz DEX
        const xyzBalance = parseFloat(String(xyzData.withdrawable));
        if (!isNaN(xyzBalance) && xyzBalance > 0) {
          accountValue += xyzBalance;
        }
      }
      
      // Equity = Account Total Value (уже включает баланс + позиции без плеча)
      const equity = accountValue;
      
      if (!isNaN(equity)) {
        return equity;
      }
      
      return 0;
      
      // Если структура ответа неверная, пробуем еще раз
      if (attempt < retries) {
        console.log(`[RETRY] Invalid response structure for ${address.substring(0, 10)}..., retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 секунда перед повтором
        continue;
      }
      
      return 0;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[ATTEMPT ${attempt}/${retries}] Error fetching account value for ${address.substring(0, 10)}...:`, lastError.message);
      
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 500)); // 0.5 секунды перед повтором
      }
    }
  }
  
  throw lastError || new Error('Failed to fetch account value after all retries');
}

/**
 * Сохранить снапшот в БД
 */
async function saveSnapshot(prisma: PrismaClient, data: FaderEquityResponse): Promise<void> {
  try {
    // Проверяем, существует ли таблица
    if (!prisma.faderEquitySnapshot) {
      console.warn('[FADER] faderEquitySnapshot table not found, skipping save');
      return;
    }
    
    await prisma.faderEquitySnapshot.create({
      data: {
        timestamp: new Date(data.timestamp),
        data: JSON.stringify(data),
      },
    });
  } catch (error) {
    // Игнорируем ошибки если таблица не существует
    if (error instanceof Error && error.message.includes('does not exist')) {
      console.warn('[FADER] Table fader_equity_snapshots does not exist yet, skipping save');
    } else {
      console.error('Error saving fader equity snapshot:', error);
    }
  }
}

/**
 * Собрать и сохранить снапшот балансов (для cron job)
 */
export async function collectFaderEquity(prisma: PrismaClient): Promise<void> {
  try {
    const wallets = FADER_CONFIG
      .map(({ label, envVar }) => {
        const address = process.env[envVar];
        if (!address || !address.trim()) {
          return null;
        }
        return { label, address: address.trim() };
      })
      .filter((w): w is { label: string; address: string } => w !== null);

    if (wallets.length === 0) {
      return;
    }

    // Последовательно запрашиваем балансы с задержкой 3 секунды
    const walletsData: FaderEquityResponse['wallets'] = [];
    
      for (let i = 0; i < wallets.length; i++) {
        const w = wallets[i];
        try {
          console.log(`[COLLECT] Fetching ${w.label} (${w.address.substring(0, 10)}...) [${i + 1}/${wallets.length}]`);
          const equity = await getAccountValue(w.address, 2); // 2 попытки для cron job
          console.log(`[COLLECT] ${w.label} equity: $${equity}`);
          walletsData.push({
            label: w.label,
            address: w.address,
            equityUsd: equity,
          });
          
          // Задержка 0.5 секунды перед следующим запросом (кроме последнего) - быстрее
          if (i < wallets.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error) {
          console.error(`[COLLECT] Error fetching ${w.label}:`, error);
          walletsData.push({
            label: w.label,
            address: w.address,
            equityUsd: 0,
          });
          // Продолжаем даже при ошибке, но с минимальной задержкой
          if (i < wallets.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }

    const payload: FaderEquityResponse = {
      timestamp: Date.now(),
      wallets: walletsData,
    };

    await saveSnapshot(prisma, payload);
  } catch (error) {
    console.error('Error collecting fader equity:', error);
  }
}

export function createFaderEquityRouter(prisma: PrismaClient) {
  const router = Router();
  
  // Текущий баланс
  router.get('/api/equity/faders', async (req, res) => {
    // Устанавливаем таймаут для ответа (60 секунд, т.к. запросы последовательные)
    req.setTimeout(60000);
    
    try {
      console.log('[FADER] GET /api/equity/faders called');
      // Получаем все кошельки из env
      const wallets = FADER_CONFIG
        .map(({ label, envVar }) => {
          const address = process.env[envVar];
          console.log(`[DEBUG] ${envVar}: ${address ? 'SET' : 'NOT SET'}`);
          if (!address || !address.trim()) {
            return null;
          }
          return { label, address: address.trim() };
        })
        .filter((w): w is { label: string; address: string } => w !== null);

      console.log(`[DEBUG] Found ${wallets.length} wallets configured`);

      if (wallets.length === 0) {
        return res.json({
          timestamp: Date.now(),
          wallets: [],
        });
      }

      // Последовательно запрашиваем балансы с задержкой 3 секунды между запросами
      console.log(`[DEBUG] Fetching equity for ${wallets.length} wallets sequentially...`);
      const walletsData: FaderEquityResponse['wallets'] = [];
      
      for (let i = 0; i < wallets.length; i++) {
        const w = wallets[i];
        try {
          console.log(`[DEBUG] Fetching ${w.label} (${w.address.substring(0, 10)}...) [${i + 1}/${wallets.length}]`);
          // getAccountValue теперь уже возвращает баланс + notional
          const equity = await getAccountValue(w.address);
          console.log(`[DEBUG] ${w.label} equity: $${equity}`);
          
          walletsData.push({
            label: w.label,
            address: w.address,
            equityUsd: equity,
          });
          
          // Задержка 1 секунда перед следующим запросом (кроме последнего)
          if (i < wallets.length - 1) {
            console.log(`[DEBUG] Waiting 1 second before next request...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          console.error(`[ERROR] Failed to fetch ${w.label}:`, error);
          walletsData.push({
            label: w.label,
            address: w.address,
            equityUsd: 0,
          });
          // Продолжаем даже при ошибке, но с задержкой
          if (i < wallets.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }
      }

      const payload: FaderEquityResponse = {
        timestamp: Date.now(),
        wallets: walletsData,
      };

      // Сохраняем снапшот в БД (асинхронно, не блокируем ответ)
      saveSnapshot(prisma, payload).catch(err => 
        console.error('Failed to save snapshot:', err)
      );

      res.json(payload);
    } catch (error) {
      console.error('Fader equity error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch fader equity',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // История за последние N часов (или с 12 PM сегодня)
  router.get('/api/equity/faders/history', async (req, res) => {
    try {
      const windowHours = parseInt(req.query.windowHours as string) || 2;
      
      // Вычисляем время с 12 PM сегодняшнего дня
      const now = new Date();
      const todayNoon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
      const todayNoonMs = todayNoon.getTime();
      
      // Используем максимум из: 12 PM сегодня или windowHours назад
      const windowMs = windowHours * 60 * 60 * 1000;
      const fromTime = Math.max(todayNoonMs, Date.now() - windowMs);
      
      const snapshots = await prisma.faderEquitySnapshot.findMany({
        where: {
          timestamp: {
            gte: new Date(fromTime),
          },
        },
        orderBy: {
          timestamp: 'asc',
        },
      });

      const points = snapshots.map(snapshot => {
        const data = JSON.parse(snapshot.data) as FaderEquityResponse;
        return {
          timestamp: snapshot.timestamp.getTime(),
          wallets: data.wallets,
        };
      });

      const response: FaderEquityHistoryResponse = {
        from: fromTime,
        to: Date.now(),
        points,
      };

      res.json(response);
    } catch (error) {
      console.error('Fader equity history error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch fader equity history',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  return router;
}

