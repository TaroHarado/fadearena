/**
 * Metrics collection and computation
 * 
 * Minimal metric set:
 * - Uptime %
 * - Average latency (bot trade detection → order placement)
 * - Realized/unrealized PnL
 * - Daily PnL
 * - Number of orders
 * - Number of Hyperliquid API errors
 */

import { PrismaClient } from '@prisma/client';

export interface Metrics {
  uptime: {
    percentage: number;
    startedAt: number;
    currentTime: number;
  };
  latency: {
    average: number; // ms
    count: number;
  };
  pnl: {
    realized: number;
    unrealized: number;
    daily: number;
  };
  orders: {
    total: number;
    successful: number;
    failed: number;
    simulated: number;
  };
  errors: {
    hyperliquidApi: number;
    total: number;
  };
}

export async function computeMetrics(prisma: PrismaClient): Promise<Metrics> {
  // Uptime
  const systemStatus = await prisma.systemStatus.findUnique({
    where: { id: 'default' },
  });
  const startedAt = systemStatus?.startedAt?.getTime() || Date.now();
  const currentTime = Date.now();
  const uptimeMs = currentTime - startedAt;
  const uptimePercentage = 100; // Simplified - would need to track downtime

  // Latency (from BotTradeEvent timestamp to MyTrade timestamp)
  const tradesWithEvents = await prisma.myTrade.findMany({
    where: {
      botTradeEventId: { not: null },
      timestamp: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      },
    },
    include: {
      botTradeEvent: true,
    },
    take: 100,
  });

  let totalLatency = 0;
  let latencyCount = 0;
  for (const trade of tradesWithEvents) {
    if (trade.botTradeEvent) {
      const latency = trade.timestamp.getTime() - trade.botTradeEvent.timestamp.getTime();
      if (latency > 0 && latency < 60000) {
        // Sanity check: latency should be positive and < 60s
        totalLatency += latency;
        latencyCount++;
      }
    }
  }
  const averageLatency = latencyCount > 0 ? totalLatency / latencyCount : 0;

  // PnL
  const allTrades = await prisma.myTrade.findMany({
    where: {
      pnl: { not: null },
    },
  });

  const realizedPnL = allTrades.reduce((sum, trade) => {
    return sum + (trade.pnl ? Number(trade.pnl) : 0);
  }, 0);

  // Daily PnL
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dailyTrades = await prisma.myTrade.findMany({
    where: {
      timestamp: { gte: today },
      pnl: { not: null },
    },
  });

  const dailyPnL = dailyTrades.reduce((sum, trade) => {
    return sum + (trade.pnl ? Number(trade.pnl) : 0);
  }, 0);

  // Unrealized PnL (simplified - would need current positions)
  const unrealizedPnL = 0;

  // Orders
  const totalOrders = await prisma.myTrade.count();
  
  // Для SQLite orderResult хранится как String (JSON), поэтому фильтруем в коде
  // Или используем более простую логику: не-simulated с orderResult != null считаем успешными
  const nonSimulatedTrades = await prisma.myTrade.findMany({
    where: {
      simulated: false,
      orderResult: { not: null },
    },
    select: { orderResult: true },
  });
  
  let successfulOrders = 0;
  let failedOrders = 0;
  for (const trade of nonSimulatedTrades) {
    if (trade.orderResult) {
      try {
        const result = JSON.parse(trade.orderResult);
        if (result.status === 'filled') {
          successfulOrders++;
        } else if (result.status === 'rejected') {
          failedOrders++;
        }
      } catch {
        // Если не удалось распарсить, считаем неуспешным
        failedOrders++;
      }
    }
  }
  
  const simulatedOrders = await prisma.myTrade.count({
    where: { simulated: true },
  });

  // Errors (from SystemEvent table)
  const hyperliquidErrors = await prisma.systemEvent.count({
    where: {
      category: 'api',
      level: 'error',
      message: { contains: 'Hyperliquid' },
      timestamp: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
  });

  const totalErrors = await prisma.systemEvent.count({
    where: {
      level: 'error',
      timestamp: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
  });

  return {
    uptime: {
      percentage: uptimePercentage,
      startedAt,
      currentTime,
    },
    latency: {
      average: averageLatency,
      count: latencyCount,
    },
    pnl: {
      realized: realizedPnL,
      unrealized: unrealizedPnL,
      daily: dailyPnL,
    },
    orders: {
      total: totalOrders,
      successful: successfulOrders,
      failed: failedOrders,
      simulated: simulatedOrders,
    },
    errors: {
      hyperliquidApi: hyperliquidErrors,
      total: totalErrors,
    },
  };
}

