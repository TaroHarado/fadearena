import { Router } from 'express';
import { PrismaClient } from '@fadearena/shared';
import type { StateResponse } from '@fadearena/shared';

const router = Router();

export function createStateRouter(prisma: PrismaClient) {
  router.get('/api/state', async (req, res) => {
    try {
      // Get settings
      const settings = await prisma.settings.findUnique({
        where: { id: 'default' },
      });

      // Get system status
      const systemStatus = await prisma.systemStatus.findUnique({
        where: { id: 'default' },
      });

      // Calculate equity (simplified - in production, use EquitySnapshot)
      const openTrades = await prisma.myTrade.findMany({
        where: { closedAt: null },
      });

      const fadeArenaEquity = openTrades.reduce((sum, trade) => {
        return sum + (trade.pnl ? Number(trade.pnl) : 0); // SQLite stores as string, Number() handles it
      }, 0);

      // Get daily PnL
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dailyTrades = await prisma.myTrade.findMany({
        where: {
          timestamp: { gte: today },
          pnl: { not: null },
        },
      });

      const dailyPnLFadeArena = dailyTrades.reduce((sum, trade) => {
        return sum + (trade.pnl ? Number(trade.pnl) : 0);
      }, 0);

      // Calculate uptime
      const uptime = systemStatus?.startedAt
        ? Math.floor((Date.now() - systemStatus.startedAt.getTime()) / 1000)
        : 0;

      const response: StateResponse = {
        mode: (settings?.mode as 'simulation' | 'live') || 'simulation',
        killSwitch: systemStatus?.killSwitch || false,
        equity: {
          total: fadeArenaEquity,
          botsAggregate: 0, // Would need to calculate from bot positions
          fadeArena: fadeArenaEquity,
        },
        openPositions: {
          count: openTrades.length,
          totalNotional: openTrades.reduce((sum, trade) => sum + Number(trade.notional), 0),
        },
        systemStatus: {
          hyperliquidConnected: systemStatus?.hyperliquidConnected || false,
          lastEventTime: systemStatus?.lastEventTime?.getTime() || null,
          lastOrderTime: systemStatus?.lastOrderTime?.getTime() || null,
          uptime,
        },
        dailyPnL: {
          bots: 0, // Would need to calculate from bot events
          fadeArena: dailyPnLFadeArena,
        },
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get state' });
    }
  });

  return router;
}

