import { Router } from 'express';
import { PrismaClient } from '@fadearena/shared';
import type { ModelResponse } from '@fadearena/shared';

const router = Router();

export function createModelsRouter(prisma: PrismaClient) {
  router.get('/api/models', async (req, res) => {
    try {
      // Get settings with bot configs
      const settings = await prisma.settings.findUnique({
        where: { id: 'default' },
      });

      if (!settings) {
        return res.status(404).json({ error: 'Settings not found' });
      }

      // Parse JSON string for SQLite
      const botConfigs = typeof settings.botConfigs === 'string'
        ? JSON.parse(settings.botConfigs)
        : (settings.botConfigs as any[]) || [];

      // Get all mirror accounts
      const mirrorAccounts = await prisma.mirrorAccount.findMany();
      const mirrorAccountMap = new Map(mirrorAccounts.map(ma => [ma.id, ma]));

      // Get stats for each bot
      const bots = await Promise.all(
        botConfigs.map(async (config: any) => {
          // Get mirror account for this bot
          const mirrorAccount = mirrorAccountMap.get(config.id);

          // Get bot's recent positions from events
          const recentEvents = await prisma.botTradeEvent.findMany({
            where: { botId: config.id },
            orderBy: { timestamp: 'desc' },
            take: 100,
          });

          // Get our mirrored trades for this bot (filtered by mirror account if available)
          const myTrades = await prisma.myTrade.findMany({
            where: {
              botId: config.id,
              ...(mirrorAccount && { mirrorAccountId: mirrorAccount.id }),
            },
            orderBy: { timestamp: 'desc' },
          });

          // Calculate stats
          const totalTrades = myTrades.length;
          const winningTrades = myTrades.filter((t) => t.pnl && Number(t.pnl) > 0).length;
          const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;
          const totalPnL = myTrades.reduce((sum, t) => sum + (t.pnl ? Number(t.pnl) : 0), 0);

          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const dailyPnL = myTrades
            .filter((t) => t.timestamp >= today)
            .reduce((sum, t) => sum + (t.pnl ? Number(t.pnl) : 0), 0);

          // Build positions (simplified - would need to aggregate from events)
          const currentPositions: any[] = [];
          const myMirroredPositions: any[] = [];

          // Get open positions from our trades
          const openMyTrades = myTrades.filter((t) => !t.closedAt);
          for (const trade of openMyTrades) {
            myMirroredPositions.push({
              asset: trade.asset,
              side: trade.side,
              size: Number(trade.size),
              notional: Number(trade.notional),
              entryPrice: Number(trade.price),
              unrealizedPnl: trade.pnl ? Number(trade.pnl) : 0,
            });
          }

          return {
            id: config.id,
            name: config.name || config.id,
            walletAddress: config.walletAddress || mirrorAccount?.botWallet || '',
            enabled: config.enabled && (mirrorAccount?.enabled ?? true),
            leverageMultiplier: mirrorAccount?.leverageMultiplier 
              ? Number(mirrorAccount.leverageMultiplier) 
              : config.leverageMultiplier,
            // Mirror account information
            mirrorAccount: mirrorAccount ? {
              id: mirrorAccount.id,
              botWallet: mirrorAccount.botWallet,
              myWallet: mirrorAccount.myWallet,
              label: mirrorAccount.label,
              enabled: mirrorAccount.enabled,
              leverageMultiplier: mirrorAccount.leverageMultiplier 
                ? Number(mirrorAccount.leverageMultiplier) 
                : null,
              allocationUsd: mirrorAccount.allocationUsd 
                ? Number(mirrorAccount.allocationUsd) 
                : null,
            } : null,
            currentPositions,
            myMirroredPositions,
            stats: {
              totalTrades,
              winRate,
              totalPnL,
              dailyPnL,
            },
          };
        })
      );

      const response: ModelResponse = { bots };

      res.json(response);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get models' });
    }
  });

  // GET /api/mirror-accounts
  router.get('/api/mirror-accounts', async (req, res) => {
    try {
      const mirrorAccounts = await prisma.mirrorAccount.findMany({
        orderBy: { id: 'asc' },
      });

      const response = mirrorAccounts.map(ma => ({
        id: ma.id,
        botWallet: ma.botWallet,
        myWallet: ma.myWallet,
        label: ma.label,
        enabled: ma.enabled,
        leverageMultiplier: ma.leverageMultiplier ? Number(ma.leverageMultiplier) : null,
        allocationUsd: ma.allocationUsd ? Number(ma.allocationUsd) : null,
        createdAt: ma.createdAt.toISOString(),
        updatedAt: ma.updatedAt.toISOString(),
      }));

      res.json({ mirrorAccounts: response });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get mirror accounts' });
    }
  });

  return router;
}

