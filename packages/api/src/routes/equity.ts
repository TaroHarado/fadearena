import { Router } from 'express';
import { PrismaClient } from '@fadearena/shared';
import type { EquityResponse } from '@fadearena/shared';

const router = Router();

export function createEquityRouter(prisma: PrismaClient) {
  router.get('/api/equity', async (req, res) => {
    try {
      const startTime = req.query.startTime
        ? parseInt(req.query.startTime as string)
        : Date.now() - 24 * 60 * 60 * 1000; // Default: 24 hours ago
      const endTime = req.query.endTime ? parseInt(req.query.endTime as string) : Date.now();
      const interval = (req.query.interval as string) || '5m';
      const botId = req.query.botId as string | undefined;

      // Get equity snapshots
      const snapshots = await prisma.equitySnapshot.findMany({
        where: {
          timestamp: {
            gte: new Date(startTime),
            lte: new Date(endTime),
          },
        },
        orderBy: { timestamp: 'asc' },
      });

      // Convert to response format
      const series = snapshots.map((snapshot) => ({
        timestamp: snapshot.timestamp.getTime(),
        botsAggregate: Number(snapshot.botsAggregate),
        fadeArena: Number(snapshot.fadeArena),
        bots: snapshot.botEquities ? (snapshot.botEquities as any) : undefined,
      }));

      // If no snapshots, create from trades (simplified)
      if (series.length === 0) {
        // Would calculate from trades here
        series.push({
          timestamp: Date.now(),
          botsAggregate: 0,
          fadeArena: 0,
          bots: {},
        });
      }

      const response: EquityResponse = {
        series,
        interval,
        startTime,
        endTime,
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get equity' });
    }
  });

  return router;
}

