import { Router } from 'express';
import { PrismaClient } from '@fadearena/shared';
import type { TradeResponse } from '@fadearena/shared';

const router = Router();

export function createTradesRouter(prisma: PrismaClient) {
  router.get('/api/trades', async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const botId = req.query.botId as string | undefined;
      const type = (req.query.type as string) || 'all';
      const startTime = req.query.startTime ? parseInt(req.query.startTime as string) : undefined;
      const endTime = req.query.endTime ? parseInt(req.query.endTime as string) : undefined;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};

      if (botId) {
        where.botId = botId;
      }

      if (startTime || endTime) {
        where.timestamp = {};
        if (startTime) {
          where.timestamp.gte = new Date(startTime);
        }
        if (endTime) {
          where.timestamp.lte = new Date(endTime);
        }
      }

      // Get bot trades
      const botTrades: TradeResponse[] = [];
      if (type === 'all' || type === 'bot') {
        const botEvents = await prisma.botTradeEvent.findMany({
          where: botId ? { ...where, botId } : where,
          orderBy: { timestamp: 'desc' },
          skip,
          take: type === 'bot' ? limit : Math.floor(limit / 2),
        });

        for (const event of botEvents) {
          botTrades.push({
            id: event.id,
            type: 'bot',
            botId: event.botId,
            timestamp: event.timestamp.getTime(),
            asset: event.asset,
            side: event.side as 'long' | 'short',
            size: Number(event.size),
            price: Number(event.price),
            notional: Number(event.notional),
            pnl: null,
            simulated: false,
          });
        }
      }

      // Get our trades
      const myTrades: TradeResponse[] = [];
      if (type === 'all' || type === 'mine') {
        const myTradesData = await prisma.myTrade.findMany({
          where: type === 'mine' ? where : {},
          orderBy: { timestamp: 'desc' },
          skip: type === 'all' ? skip : 0,
          take: type === 'mine' ? limit : Math.floor(limit / 2),
        });

        for (const trade of myTradesData) {
          myTrades.push({
            id: trade.id,
            type: 'mine',
            botId: trade.botId,
            timestamp: trade.timestamp.getTime(),
            asset: trade.asset,
            side: trade.side as 'long' | 'short',
            size: Number(trade.size),
            price: Number(trade.price),
            notional: Number(trade.notional),
            pnl: trade.pnl ? Number(trade.pnl) : null, // SQLite stores as string, Number() handles it
            simulated: trade.simulated,
          });
        }
      }

      // Combine and sort
      const allTrades = [...botTrades, ...myTrades].sort((a, b) => b.timestamp - a.timestamp);

      // Get total count (simplified)
      const total = allTrades.length;

      res.json({
        trades: allTrades.slice(0, limit),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get trades' });
    }
  });

  return router;
}

